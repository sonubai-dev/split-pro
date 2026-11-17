export function getOpenApiSpec(serverUrl = 'http://localhost:3002') {
  return {
    openapi: '3.1.0',
    info: {
      title: 'VistaroAI Studio Automation API',
      description:
        'OpenAI Custom GPT Action Schema & REST bridge to operate VistaroAI high-resolution image slicer and motion video studio directly from ChatGPT.',
      version: '1.0.0',
    },
    servers: [
      {
        url: serverUrl,
        description: 'VistaroAI MCP Remote Bridge Server',
      },
    ],
    paths: {
      '/api/v1/workspace/state': {
        get: {
          operationId: 'getWorkspaceState',
          summary: 'Get VistaroAI Canvas Workspace State',
          description:
            'Retrieves current image resolution, slice count, grid layout (rows/columns), and active panels.',
          responses: {
            '200': {
              description: 'Workspace state retrieved successfully.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: 'getWorkspaceStatePost',
          summary: 'Get VistaroAI Canvas Workspace State (POST)',
          description:
            'Retrieves current image resolution, slice count, grid layout, and active panels.',
          responses: {
            '200': {
              description: 'Workspace state retrieved successfully.',
            },
          },
        },
      },
      '/api/v1/workspace/grid': {
        post: {
          operationId: 'setGrid',
          summary: 'Configure Slicing Grid',
          description: 'Set number of horizontal slice rows and vertical slice columns.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['rows', 'columns'],
                  properties: {
                    rows: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 50,
                      description: 'Number of rows to slice',
                    },
                    columns: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 50,
                      description: 'Number of columns to slice',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Grid updated successfully.' },
          },
        },
      },
      '/api/v1/workspace/spacing': {
        post: {
          operationId: 'setSpacing',
          summary: 'Set Panel Spacing / Gap',
          description: 'Adjust border gap between sliced panels in pixels.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['spacing'],
                  properties: {
                    spacing: {
                      type: 'number',
                      minimum: 0,
                      maximum: 100,
                      description: 'Gap spacing in pixels',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Spacing updated.' },
          },
        },
      },
      '/api/v1/workspace/output': {
        post: {
          operationId: 'setOutputSettings',
          summary: 'Set Output Quality and Format',
          description: 'Configure target resolution, encoding format, and unsharp masking level.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    resolution: {
                      type: 'string',
                      enum: ['original', '2k', '4k', '8k', 'custom'],
                      description: 'Target export resolution',
                    },
                    format: {
                      type: 'string',
                      enum: ['png', 'jpeg', 'webp'],
                      description: 'Target image format',
                    },
                    sharpness: {
                      type: 'string',
                      enum: ['off', 'subtle', 'crisp', 'ultra', 'studio8k'],
                      description: 'Unsharp masking filter strength',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Output settings saved.' },
          },
        },
      },
      '/api/v1/workspace/layouts': {
        post: {
          operationId: 'suggestLayouts',
          summary: 'Apply Preset Layout',
          description:
            'Apply a preset layout (e.g. 3x1 Instagram carousel, 3x3 mosaic, 2x2 grid, webtoon vertical).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    intent: {
                      type: 'string',
                      enum: [
                        'carousel_instagram',
                        'grid_3x3',
                        'grid_2x2',
                        'storyboard_horizontal',
                        'storyboard_vertical',
                        'custom',
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Layout preset applied.' },
          },
        },
      },
      '/api/v1/workspace/reorder': {
        post: {
          operationId: 'reorderPanels',
          summary: 'Reorder Panels',
          description: 'Reorder slices/panels with an array of 0-based index numbers.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['newOrder'],
                  properties: {
                    newOrder: {
                      type: 'array',
                      items: { type: 'integer' },
                      description: 'Ordered list of panel indices',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Panels reordered.' },
          },
        },
      },
      '/api/v1/workspace/rename': {
        post: {
          operationId: 'renamePanel',
          summary: 'Rename Specific Panel',
          description: 'Set a custom label or filename for an exported panel.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['index', 'newName'],
                  properties: {
                    index: { type: 'integer', minimum: 0 },
                    newName: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Panel renamed.' },
          },
        },
      },
      '/api/v1/workspace/export': {
        post: {
          operationId: 'exportBatchZip',
          summary: 'Export Batch ZIP Archive',
          description: 'Trigger full-resolution slice generation and ZIP download in browser.',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    filename: { type: 'string', description: 'Prefix for zip archive file' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'ZIP export initiated.' },
          },
        },
      },
      '/api/v1/workspace/video': {
        post: {
          operationId: 'setVideoMotionStudio',
          summary: 'Configure Motion Video Studio',
          description: 'Configure MP4 video rendering, FPS, and Ken Burns camera presets.',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    fps: { type: 'integer', minimum: 12, maximum: 60 },
                    durationPerSlide: { type: 'number', minimum: 0.5, maximum: 10 },
                    motionPreset: {
                      type: 'string',
                      enum: ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'none'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Video settings configured.' },
          },
        },
      },
      '/api/v1/workspace/undo': {
        post: {
          operationId: 'undoAction',
          summary: 'Undo Last Action',
          description: 'Revert the last adjustment in VistaroAI.',
          responses: {
            '200': { description: 'Undo successful.' },
          },
        },
      },
      '/api/v1/workspace/redo': {
        post: {
          operationId: 'redoAction',
          summary: 'Redo Action',
          description: 'Reapply the previously undone action.',
          responses: {
            '200': { description: 'Redo successful.' },
          },
        },
      },
      '/api/v1/workspace/reset': {
        post: {
          operationId: 'resetWorkspace',
          summary: 'Reset Workspace',
          description: 'Reset canvas and all settings to clean defaults.',
          responses: {
            '200': { description: 'Workspace reset to defaults.' },
          },
        },
      },
      '/api/v1/workspace/preview': {
        post: {
          operationId: 'previewSlices',
          summary: 'Preview Slice Panels',
          description: 'Inspect sub-pixel coordinates and dimensions of current panels.',
          responses: {
            '200': { description: 'Slice details returned.' },
          },
        },
      },
      '/api/v1/workspace/sample': {
        post: {
          operationId: 'loadSample',
          summary: 'Load Vector Anime Sample Artwork',
          description: 'Load high-resolution sample artwork into canvas.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['sampleType'],
                  properties: {
                    sampleType: {
                      type: 'string',
                      enum: ['cyberpunk', 'panorama'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Sample loaded into canvas.' },
          },
        },
      },
      '/api/v1/workspace/detect-borders': {
        post: {
          operationId: 'detectBorders',
          summary: 'Detect Borders with Web Worker',
          description: 'Run automated border detection algorithm on the active canvas.',
          responses: {
            '200': { description: 'Borders detected and applied.' },
          },
        },
      },
      '/api/v1/workspace/preview-image': {
        get: {
          operationId: 'captureCanvasPreviewGet',
          summary: 'Capture Canvas Visual Preview',
          description:
            'Captures a visual snapshot/screenshot of the active canvas with slice grid guidelines overlaid as a JPEG data URL for multimodal visual inspection.',
          responses: {
            '200': { description: 'Visual canvas preview snapshot returned.' },
          },
        },
        post: {
          operationId: 'captureCanvasPreview',
          summary: 'Capture Canvas Visual Preview (POST)',
          description:
            'Captures a visual snapshot/screenshot of the active canvas with slice grid guidelines overlaid as a JPEG data URL for multimodal visual inspection.',
          responses: {
            '200': { description: 'Visual canvas preview snapshot returned.' },
          },
        },
      },
      '/api/v1/workspace/platform-preset': {
        post: {
          operationId: 'setSmartPlatformPreset',
          summary: 'Apply Social Platform Preset',
          description:
            'Auto-configure grid, aspect ratio, and resolution for Instagram Carousel, 3x3 Mosaic, TikTok Reel, Discord Quad, or Webtoon Strip.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['platform'],
                  properties: {
                    platform: {
                      type: 'string',
                      enum: [
                        'instagram_carousel',
                        'instagram_mosaic_9',
                        'tiktok_reel',
                        'discord_quad',
                        'webtoon_strip',
                      ],
                      description: 'Target platform layout preset',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Platform preset applied.' },
          },
        },
      },
      '/api/v1/workspace/batch-pipeline': {
        post: {
          operationId: 'executeBatchPipeline',
          summary: 'Execute Compound Batch Pipeline',
          description:
            'Execute a sequential list of canvas adjustments in a single compound atomic transaction.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['steps'],
                  properties: {
                    steps: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['tool'],
                        properties: {
                          tool: { type: 'string' },
                          args: { type: 'object' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Pipeline execution report returned.' },
          },
        },
      },
      '/api/v1/execute': {
        post: {
          operationId: 'executeGenericTool',
          summary: 'Execute Any Vistaro Tool',
          description: 'Direct fallback tool invocation endpoint.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tool'],
                  properties: {
                    tool: { type: 'string', description: 'Name of the tool to execute' },
                    args: { type: 'object', description: 'Arguments object for tool' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Tool executed.' },
          },
        },
      },
    },
  };
}
