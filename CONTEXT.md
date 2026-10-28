# Inkova — Architecture, Learnings & Technical Context

> **Project Name:** Inkova  
> **Repository Path:** `d:\WorkSpace\inkova`  
> **Tech Stack:** Tauri v2 (Rust Backend) + TypeScript + HTML5 Canvas2D / WebGL  
> **Runtime / Dev Server:** `http://localhost:1420/`  

---

## 1. Executive Summary & Product Vision

Inkova was designed from first principles as an all-in-one, next-generation desktop screen annotation and presentation tool. It combines the speed and simplicity of **Epic Pen**, the live presentation focus of **Microsoft ZoomIt** and **Presentify**, the power-user shape tools of **ppInk**, and the precision documentation markup of **CleanShot X**, while systematically solving every major pain point reported by users across Reddit, GitHub, and ed-tech forums.

### Brand Name Rationale: "Inkova"
* **The "Glass" Metaphor:** Highlights the core technical differentiator—the invisible "Glass Layer" that toggles seamlessly between live screen drawing and click-through desktop interaction.
* **SEO & Keyword Ownership:** Zero software collisions; easily claims #1 ranking for `"Inkova screen annotation"` and `"Inkova app"`.
* **Virality:** Modern, punchy indie-software identity (fits alongside tools like *CleanShot*, *Raycast*, and *Screen Studio*).

---

## 2. Reverse-Engineering: How Screen Annotation Overlays Work

Epic Pen and similar tools rely on low-level OS windowing and graphics APIs:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Floating Toolbar Window (Interactive Window)                          │
│  - Never ignores clicks; always responsive to tool/color selections.   │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │ State & Event Bus
┌──────────────────────────────────────▼─────────────────────────────────┐
│  Transparent Canvas Overlay Window                                     │
│  - Covers the entire virtual desktop across all connected monitors.    │
│  - WS_EX_LAYERED, WS_EX_TOPMOST                                        │
│  - Draw Mode: Captures mouse/stylus inputs (PointerEvents).            │
│  - Glass / Mouse Mode: Sets WS_EX_TRANSPARENT (clicks pass through     │
│    directly to underlying apps, web browsers, or presentation decks).  │
└────────────────────────────────────────────────────────────────────────┘
```

### Key OS Mechanics:
1. **The Click-Through Switch:**
   * **Windows:** `SetWindowLongPtr` with `WS_EX_TRANSPARENT | WS_EX_LAYERED`, or returning `HTTRANSPARENT` in `WM_NCHITTEST`. In Tauri v2, this is wrapped natively via `window.set_ignore_cursor_events(bool)`.
   * **macOS:** `[window setIgnoresMouseEvents:YES]`, `NSWindowLevel = NSPopUpMenuWindowLevel`.
2. **Two-Window Architecture Requirement:**
   * If a single window is used, setting `ignore_cursor_events(true)` makes the toolbar unclickable. A dedicated toolbar window ensures controls remain interactive while the canvas becomes transparent to clicks.
3. **Ink Rendering & Smoothing:**
   * Raw mouse events produce jagged polylines. Smooth curves require quadratic Bézier interpolation through midpoints:
     $$\text{mid}_x = \frac{x_i + x_{i+1}}{2}, \quad \text{mid}_y = \frac{y_i + y_{i+1}}{2}$$
   * Stylus tablet pressure (`PointerEvent.pressure`) dynamically scales the stroke radius.

---

## 3. Competitive Breakdown & Market Gaps

| Feature | Epic Pen (Pro) | ZoomIt | ppInk | Presentify | CleanShot X | **Inkova** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Smooth Pen & Highlighter** | ✅ Yes | ✅ Basic | ✅ Advanced | ✅ Yes | ✅ Capture-only | **✅ 144Hz Bézier** |
| **Fading Laser / Disappearing Ink** | ✅ 3s timer | ❌ No | ✅ Yes | ✅ Auto-erase | ❌ No | **✅ Fading Neon Trail** |
| **Hold-to-Snap Vectors** | ❌ No | ❌ No | ❌ (Magnetic) | ❌ No | ❌ No | **✅ Procreate Gesture** |
| **Step Badges (① ② ③)** | ❌ No | ❌ No | ✅ Tags | ❌ No | ✅ Yes | **✅ Built-in (+right-click dec)** |
| **Live Blur / Redact Box** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Yes | **✅ Live Frosted Glass** |
| **Spotlight Screen Dimmer** | ❌ Halo only | ❌ No | ✅ Rect/Circ | ✅ Spotlight | ✅ Image only | **✅ 76% Dimmer Beam** |
| **Live Zoom Loupe** | ❌ No | ✅ Fullscreen | ❌ No | ✅ Yes | ✅ Loupe | **✅ Floating 2x Loupe** |
| **Zero-Footprint Radial Menu** | ❌ Intrusive bar| ❌ No | ❌ No | ❌ No | ❌ No | **✅ Tab / Cursor Pie Menu** |
| **Hold-to-Interact Key** | ❌ Must toggle | ❌ No | ❌ No | ✅ Fn key | ❌ No | **✅ Spacebar Hold** |
| **Undo Clear Safety Net** | ❌ Permanent | ❌ No | ❌ No | ❌ No | ❌ No | **✅ Toast Recovery Stack** |

---

## 4. Community Pain Points & How Inkova Solves Them

1. **Intrusive Floating Toolbar:**
   * *Problem:* Epic Pen's toolbar blocks slides and video feeds; minimizing leaves an ugly bar.
   * *Solution:* Auto-collapsing slim pill + a **Zero-Footprint Radial Menu (`Tab`)** that spawns under the cursor and closes instantly.
2. **Accidental Scribbles (The Click-Through Trap):**
   * *Problem:* Presenters forget they are in Draw Mode and draw ugly lines when trying to click web links or advance slides.
   * *Solution:* **Hold-to-Interact (`Space`):** Holding `Space` temporarily enters glass mode; releasing instantly resumes drawing.
3. **Lag with Heavy Inking:**
   * *Problem:* Open-source tools (gInk/ppInk) and Epic Pen stutter after 50+ strokes due to unoptimized redraws.
   * *Solution:* Hardware-accelerated dual-canvas architecture with separate background and transient effect buffers.
4. **Accidental Screen Erase:**
   * *Problem:* Hitting "Clear Screen" wipes out 15 minutes of notes with zero recovery.
   * *Solution:* An immutable `HistoryManager` with a floating **"Undo Clear (Ctrl+Z)"** toast button that stays for 6 seconds.
5. **Ugly Freehand Shapes:**
   * *Problem:* Mice produce wobbly circles and crooked arrows.
   * *Solution:* **Hold-to-Snap (`recognizer.ts`):** Pausing for 280ms at the end of a stroke auto-recognizes lines, arrows, rectangles, and ellipses and snaps them into perfect vector geometry.

---

## 5. Codebase Architecture

```
d:\WorkSpace\inkova\
├── src\
│   ├── engine\
│   │   ├── canvas.ts       # Dual-canvas rendering engine, Bézier smoothing, laser decay, loupe & spotlight
│   │   ├── history.ts      # Immutable vector undo/redo stack & clear-recovery mechanism
│   │   └── recognizer.ts   # Geometric stroke pattern recognizer (lines, rectangles, circles/ellipses)
│   ├── ui\
│   │   ├── toolbar.ts      # Draggable, dockable glassmorphism toolbar with tool/color/size selectors
│   │   ├── radialMenu.ts   # Cursor-centered 8-slice pie menu for instant tool switching
│   │   └── hotkeys.ts      # Global keyboard shortcuts (P, H, L, A, R, O, B, X, T, E, F, Z, G, Space)
│   ├── types.ts            # Core TypeScript interfaces (Stroke, Point, ToolType, AppState)
│   ├── styles.css          # Dark glassmorphism design system (Inter font, blur-filters, neon glows)
│   └── main.ts             # Application orchestrator, event bus, and pointer pipeline
├── src-tauri\
│   ├── src\
│   │   ├── lib.rs          # Tauri v2 entry point with global-shortcut and opener plugins
│   │   └── main.rs         # Native executable launcher
│   ├── Cargo.toml          # Rust dependencies (tauri v2, tauri-plugin-global-shortcut)
│   └── tauri.conf.json     # Multi-window configuration (overlay + toolbar)
├── index.html              # HTML5 root container
└── vite.config.ts          # Vite build & local dev server configuration
```

---

## 6. Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| **`P`** | Smooth Pen |
| **`H`** | Alpha Highlighter |
| **`L`** | Fading Laser Pointer |
| **`A`** | Arrow Tool |
| **`R`** | Rectangle Tool |
| **`O`** | Circle Tool |
| **`B`** | Step Badge Stamp (①, ②, ③...) |
| **`X`** | Blur / Redaction Box |
| **`T`** | In-Place Text Note |
| **`E`** | Eraser |
| **`F`** | Spotlight Focus Dimmer |
| **`Z`** | Live Magnifier Loupe (2x zoom) |
| **`G`** | Toggle Glass Mode (Click-Through) |
| **`Space` (Hold)** | Temporary Glass Mode (interact with desktop apps; release to resume drawing) |
| **`Tab` (Hold)** | Open Radial / Pie Menu at cursor |
| **`Ctrl + Z` / `Ctrl + Y`** | Undo / Redo |
| **`C`** | Clear Screen (with Undo-Clear safety net) |
| **`1` – `8`** | Quick switch colors |
| **`[` / `]`** | Decrease / Increase stroke width |
| **Right-Click** | Decrement / Reset Step Badge number |

---

## 7. Developer Notes & Next Steps

1. **Browser Development (Active):**
   * Run: `npm run dev` in `d:\WorkSpace\inkova`
   * Open: `http://localhost:1420/`
2. **Native Desktop Executable (.exe):**
   * Requires Microsoft Visual Studio C++ Build Tools (`link.exe`).
   * Command to install build tools on Windows:  
     `winget install --id Microsoft.VisualStudio.2022.BuildTools --silent --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"`
   * Once installed, run: `npm run tauri dev` or `npm run tauri build`.
