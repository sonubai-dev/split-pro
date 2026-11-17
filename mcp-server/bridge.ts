import { WebSocketServer, WebSocket } from 'ws';

export const WS_PORT = parseInt(process.env.VISTARO_WS_PORT || '3001', 10);

export interface PendingRequest {
  resolve: (val: any) => void;
  reject: (err: any) => void;
  timer: NodeJS.Timeout;
}

class VistaroBridge {
  private static instance: VistaroBridge | null = null;
  public wss: WebSocketServer | null = null;
  public activeClients = new Set<WebSocket>();
  public pendingRequests = new Map<string, PendingRequest>();
  public isInitialized = false;

  public static getInstance(): VistaroBridge {
    if (!VistaroBridge.instance) {
      VistaroBridge.instance = new VistaroBridge();
    }
    return VistaroBridge.instance;
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      this.wss = new WebSocketServer({ port: WS_PORT });

      this.wss.on('connection', (ws) => {
        this.activeClients.add(ws);
        ws.send(JSON.stringify({ type: 'VISTARO_MCP_CONNECTED', timestamp: Date.now() }));

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'VISTARO_MCP_RESULT' && msg.requestId) {
              const pending = this.pendingRequests.get(msg.requestId);
              if (pending) {
                clearTimeout(pending.timer);
                this.pendingRequests.delete(msg.requestId);
                if (msg.error) {
                  pending.reject(new Error(msg.error));
                } else {
                  pending.resolve(msg.result);
                }
              }
            }
          } catch {
            // Silently ignore malformed frames
          }
        });

        ws.on('close', () => {
          this.activeClients.delete(ws);
        });

        ws.on('error', () => {
          this.activeClients.delete(ws);
        });
      });

      this.wss.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[Vistaro Bridge] WebSocket port ${WS_PORT} in use; connecting to existing instance.`);
        } else {
          console.error('[Vistaro Bridge] WebSocket server error:', err);
        }
      });
    } catch (err) {
      console.error('[Vistaro Bridge] Failed to initialize WebSocket server:', err);
    }
  }

  /**
   * Dispatch tool execution to connected Vistaro web client
   */
  public async dispatchToBrowser(tool: string, args: Record<string, any> = {}): Promise<any> {
    this.init();

    if (this.activeClients.size === 0) {
      return {
        success: false,
        status: 'no_client_connected',
        message:
          'VistaroAI browser client is not connected. Please open http://localhost:3000 or https://www.vistaroai.online in your browser to execute live canvas operations.',
        tool,
        args,
      };
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve({
          success: false,
          status: 'timeout',
          message: `Operation '${tool}' timed out waiting for response from VistaroAI browser window.`,
        });
      }, 15000);

      this.pendingRequests.set(requestId, { resolve, reject, timer });

      const payload = JSON.stringify({
        type: 'VISTARO_MCP_CALL',
        requestId,
        tool,
        args,
      });

      for (const client of this.activeClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    });
  }

  public getStatus() {
    return {
      wsPort: WS_PORT,
      connectedClients: this.activeClients.size,
      pendingRequests: this.pendingRequests.size,
      initialized: this.isInitialized,
    };
  }
}

export const bridge = VistaroBridge.getInstance();
export const dispatchToBrowser = (tool: string, args: Record<string, any> = {}) =>
  bridge.dispatchToBrowser(tool, args);
