# VistaroAI

Professional client-side image slicing and storyboard video generation suite built with React, Vite, and Tailwind CSS. All image processing, slicing, upscaling, sharpening, video animation, and ZIP packaging occur 100% locally in the browser memory using high-performance HTML5 Canvas and WebCodecs APIs.

---

## Agent Access

VistaroAI includes an **Agent Access layer** (MCP-style / WebMCP) allowing AI agents (Claude, ChatGPT, browser automation agents) to operate the application through structured tools, while human users retain full manual control and non-destructive undo capability.

When supported by the browser environment, tools are registered directly via `navigator.modelContext.registerTool()`. A global JavaScript fallback is simultaneously exposed at `window.VistaroAI` (with `window.SplitPro` retained for backwards compatibility).

### Tool Table

| Tool Name | Arguments | Description |
|---|---|---|
| `load_image` | `{ source: "clipboard" \| "url" \| "file_picker", url?: string }` | Loads an image from clipboard, remote URL (CORS enabled), or opens device file picker. |
| `get_image_info` | `{}` | Returns dimensions (`width`, `height`), byte size, format, and aspect ratio of currently loaded image. |
| `suggest_layouts` | `{}` | Returns smart layout recommendations and creator presets matching the image geometry. |
| `set_split_mode` | `{ mode: "auto" \| "grid" \| "vertical" \| "horizontal" \| "custom" }` | Sets the panel slicing layout mode. |
| `set_grid` | `{ rows: number, columns: number }` | Configures grid rows and columns (e.g. 3×3 for Instagram mosaic, 2×2 quadrants). |
| `set_spacing` | `{ outerMargin?: number, horizontalGap?: number, verticalGap?: number, gapBehavior?: "zero-crop" \| "discard" }` | Sets margins and inter-panel gutters in pixels. |
| `set_sequence` | `{ order: "row-major" \| "col-major" \| "snake" }` | Configures panel indexing and numbering sequence. |
| `set_custom_lines`| `{ vertical: number[], horizontal: number[] }` | Sets arbitrary vertical/horizontal cut line pixel positions. |
| `set_output` | `{ resolution?: "8k" \| "4k" \| "2k" \| "native", format?: "png" \| "jpg" \| "webp", quality?: number, sharpness?: "off" \| "subtle" \| "crisp" \| "ultra" \| "studio8k", contrast?: number, filenamePrefix?: string, includeCoordinates?: boolean }` | Configures export resolution, format, sharpness, and filename patterns. |
| `set_naming_convention` | `{ pattern: string, prefix?: string }` | Configures dynamic slice naming pattern (e.g. `'{row}-{col}_{timestamp}'`). Supports `{row}`, `{col}`, `{index}`, `{pad_row}`, `{pad_col}`, `{pad_index}`, `{prefix}`, `{timestamp}`, `{width}`, `{height}`, `{ext}`. |
| `preview_slices` | `{}` | Returns calculated slice count, coordinates, and bounding dimensions. |
| `reorder_slices` | `{ order: number[] }` | Reorders sliced panel sequences. |
| `rename_slice` | `{ index: number, name: string }` | Renames an individual slice filename. |
| `export_zip` | `{}` | Requests ZIP download. Opens human-in-the-loop gesture confirmation dialog. |
| `set_video_settings` | `{ aspectRatio?: "9:16" \| "1:1" \| "16:9", resolution?: "720p" \| "1080p", fps?: 24 \| 30, durationPerSlide?: number, fitMode?: "cover" \| "contain", transition?: "none" \| "fade" \| "slide" \| "zoom" \| "wipe", transitionDuration?: number, easing?: "linear" \| "ease-in-out" }` | Configures storyboard video generation settings. |
| `apply_video_preset` | `{ preset: "Instagram Reel" \| "Story Slideshow" \| "YouTube Storyboard" \| "Square Post" }` | Applies 1-tap video format and motion preset. |
| `set_slide_motion` | `{ slideIndex?: number, motion: "none" \| "zoom_in" \| "zoom_out" \| "pan_left" \| "pan_right" \| "pan_up" \| "pan_down" \| "random", applyToAll?: boolean }` | Configures Ken Burns motion effects per slide or for all slides. |
| `set_slide_caption` | `{ slideIndex: number, text: string, position?: "top" \| "bottom", size?: "small" \| "medium" \| "large", color?: string }` | Burns text caption into designated storyboard slide. |
| `preview_video` | `{ action: "play" \| "pause" \| "seek", time?: number }` | Controls real-time canvas video scrubber and playback. |
| `render_video` | `{}` | Triggers MP4/WebM video export. Prompts human-in-the-loop gesture approval. |
| `cancel_render` | `{}` | Cancels running video render process. |
| `undo` | `{}` | Reverts the last settings change (pushes to undo stack). |
| `redo` | `{}` | Re-applies the previously undone settings change. |
| `reset` | `{}` | Restores all settings to default 8K Ultra-HD configuration. |

### Example Call

AI agents can inspect and invoke tools via `window.VistaroAI`:

```javascript
// 1. List available tools
const tools = window.VistaroAI.list();
console.log(tools);

// 2. Load an image from URL
await window.VistaroAI.call("load_image", {
  source: "url",
  url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1600&q=80"
});

// 3. Configure split grid and output
await window.VistaroAI.call("set_grid", { rows: 2, columns: 2 });
await window.VistaroAI.call("set_naming_convention", {
  pattern: "{row}-{col}_{timestamp}"
});

// 4. Configure Video Storyboard
await window.VistaroAI.call("apply_video_preset", { preset: "Instagram Reel" });
await window.VistaroAI.call("set_slide_caption", {
  slideIndex: 0,
  text: "Scene 1: Introduction",
  position: "bottom"
});
await window.VistaroAI.call("preview_video", { action: "play" });

// 5. Trigger Video Render (requests user gesture confirmation modal)
const renderResult = await window.VistaroAI.call("render_video");
console.log(renderResult.state.message);
```

### Safety and Privacy
- **Zero Remote Exfiltration:** All operations execute strictly in browser memory. No telemetry or image transfers.
- **In-Memory Logging:** Only sanitized tool names and parameters are logged. Logs are kept in volatile memory and can be cleared at any time.
- **Human Safeguards:** Critical device actions (local file access, final ZIP download, clearing history) require direct user gestures. A "Pause agent" switch blocks all tool invocations instantly.
