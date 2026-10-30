# 📋 Comprehensive Product & Architecture Brief: Next-Gen Desktop Screen Annotation SaaS

> **Document Purpose:** Complete, self-contained project dossier detailing the software architecture, technical mechanics, competitive landscape, monetization model, and brand naming considerations. Feed this file directly into an AI naming or branding agent to generate and evaluate optimal product names.

---

## 1. Executive Summary & Product Vision

This project is a **high-performance, low-latency desktop screen annotation and live presentation overlay for Windows (and macOS/Linux planned)**. Built using **Tauri v2 (Rust)** and a **custom hardware-accelerated TypeScript/Canvas rendering pipeline**, it allows presenters, software engineers, educators, streamers, and sales executives to draw, spotlight, magnify, blur, and explain anything on their screens in real time.

### The Core Problem It Solves
Existing desktop screen annotation software (e.g., Epic Pen, Microsoft ZoomIt, gInk, ppInk) suffers from major drawbacks:
1. **Clunky, Dated UIs:** Look like Windows XP-era utilities with intrusive floating bars that block slide decks and webcam feeds.
2. **Laggy Inking:** Stutter when drawing quickly or when more than 30–50 strokes are on screen.
3. **The "Click-Through" Trap:** Presenters forget they are in drawing mode, try to click a button or link on their slide or browser, and accidentally draw an ugly scribble instead of interacting with their app.
4. **Permanent Erasure Disasters:** Hitting "Clear Screen" accidentally wipes out 20 minutes of lecture or presentation notes with zero recovery.
5. **Wobbly Hand-Drawn Shapes:** Drawing rectangles, arrows, or circles with a mouse looks amateurish and jagged.
6. **Feature Fragmentation:** Users must juggle multiple separate apps for screen drawing (Epic Pen), screen dimming/spotlight (Presentify), zooming (ZoomIt), and screenshot redaction (CleanShot X).

### The Solution
A unified, ultra-modern, aesthetic overlay that feels like an **Apple/VisionOS-inspired native utility**:
- **Zero-lag 144Hz Bézier smoothing** with stylus pressure sensitivity.
- **Seamless Click-Through ("Glass / Pass-Through Mode")**: Presenters can hold `Space` to temporarily click through to underlying apps, or press `G` to toggle pass-through completely.
- **Fading Laser Trail**: Glowing neon laser pointer that evaporates naturally behind the cursor (inspired by Apple Keynote / iOS laser pointers).
- **Presentation Power FX**: Built-in Spotlight dimmer, floating 2x magnifier loupe, frosted live blur redaction boxes, and sequential step counter badges (①, ②, ③).
- **Hold-to-Snap Vectors**: Holding a stroke for 280ms automatically snaps freehand scribbles into crisp, geometric vector arrows, lines, boxes, and circles (inspired by Procreate QuickShape).
- **Undo-Clear Safety Net**: Clearing the screen provides an immediate 6-second recovery toast and persistent undo stack.
- **Zero-Footprint Radial Menu**: Tapping `Tab` spawns an 8-slice pie menu directly under the cursor so the presenter never has to move their mouse to a toolbar.

---

## 2. Technical Architecture & How It Works

The application uses a **decoupled hybrid architecture** consisting of a lightweight native Rust host and a webview presentation canvas:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Tauri v2 Native Host (Rust)                     │
│  - Window: Fullscreen, transparent, frameless, always-on-top           │
│  - OS Input Passthrough: Win32 WS_EX_TRANSPARENT / ignore_cursor_events│
│  - Global Hotkeys: OS-level shortcuts (register / unregister)          │
│  - Native I/O: Sanitized file snapshot export & multi-display handling │
│  - System Tray: Native menu, show/hide, background cursor tracker      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC Event Bus
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Frontend Engine (TypeScript + Canvas)               │
│  ┌───────────────────────┐             ┌─────────────────────────────┐ │
│  │     Static Canvas     │             │        FX Canvas            │ │
│  │  - Persistent strokes │             │  - Fading laser neon trails │ │
│  │  - Vector shapes      │             │  - Spotlight dark overlay   │ │
│  │  - Redaction boxes    │             │  - Floating magnifier loupe │ │
│  └───────────────────────┘             └─────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  UI Layer: Glassmorphism Dockable Capsule Toolbar + Radial Menu   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Innovations
1. **OS Click-Through Pass-Through:**
   - In **Draw Mode**, the fullscreen transparent window captures all mouse/stylus pointer events.
   - In **Pass-Through Mode**, the window passes all clicks through to underlying applications (PowerPoint, Chrome, VS Code) using Windows API `SetWindowLongPtr` with `WS_EX_TRANSPARENT | WS_EX_LAYERED` (via Tauri's `window.set_ignore_cursor_events(true)`).
   - **Intelligent Toolbar Hover:** A background thread tracks high-precision physical cursor coordinates across multi-DPI screens. Even when the canvas is click-through, hovering over the floating toolbar capsule restores pointer events instantly, making the toolbar always interactive.

2. **Dual-Canvas Rendering Engine:**
   - **Main Canvas:** Renders persistent vector strokes using quadratic Bézier midpoint interpolation ($\text{mid}_x = \frac{x_i + x_{i+1}}{2}$), eliminating mouse jitter and stair-stepping.
   - **FX Canvas:** Runs on an independent `requestAnimationFrame` loop. Handles decaying neon laser particles (decay rate: 2.2% opacity per frame), dynamic spotlight beams, and the live magnifier loupe without invalidating the static stroke buffer.

3. **Stroke Shape Recognizer (`recognizer.ts`):**
   - Implements closed-loop ratio analysis, corner detection, and aspect-ratio bounding box tests.
   - Automatically detects lines, arrows, rectangles, and circles if the user pauses briefly at the end of the gesture.

4. **Safety & Privacy Architecture:**
   - **100% Local-First:** All drawing coordinates and screen pixels are processed in local memory. Zero cloud transmission of canvas data.
   - **Security Hardened:** Path traversal (`..`) forbidden on exports; locked Content Security Policy (`CSP`).

---

## 3. Product Features Breakdown

### Free Tier Features
* **Smooth Pen:** High-frequency Bézier interpolated brush.
* **Alpha Highlighter:** Semi-transparent marker with blend-mode composition that highlights text without obscuring it.
* **Arrow & Line Tool:** Clean directional markers with automatic arrowhead geometry.
* **Rectangle & Circle Tools:** Crisp geometric bounding boxes and outlines.
* **Text Tool:** Instant on-screen annotations with inline editing.
* **Eraser:** Object-level and stroke-level erasing.
* **Backdrop Modes:** Transparent (desktop overlay), Digital Whiteboard, Blackboard, and Math/Engineering Grid.
* **Snapshot Export:** One-key PNG snapshot saving to disk or clipboard.
* **Radial Pie Menu:** Instant 8-slice pie selector summoned via `Tab`.
* **Dockable Capsule Toolbar:** Horizontal or vertical orientation with magnetic screen-edge docking and mini-pill collapse.

### Pro Tier ($29 Lifetime License)
* **iPhone-Style Neon Laser Pointer:** Vanishing high-luminance laser trail for presentations.
* **Spotlight Dimmer:** Focus beam that dims the rest of the screen to 76% dark opacity, directing audience attention to a specific code snippet or diagram.
* **Magnifier Loupe:** Floating circular 2x optical zoom lens following the cursor.
* **Live Blur / Redaction Box:** Frosted glass blur filter to hide sensitive API keys, passwords, client emails, or PII during live streams and recordings.
* **Sequential Numbered Step Badges (① ② ③):** Automatically increments with each click to explain workflows, architecture steps, or UI tutorials. Right-click decrements.
* **Multi-Display Switching:** Seamlessly jumps between multiple monitors in dual/triple screen setups.

---

## 4. Target Audience & Personas

1. **Tech Presenters & Keynote Speakers:**
   - Need to highlight architecture diagrams, point out lines of code, and dim surrounding distractions during Zoom/Teams/Google Meet calls.
2. **Software Developers & Engineering Managers:**
   - Conduct design reviews, code walkthroughs, PR reviews, and sprint demos.
3. **Educators, Tutors & Course Creators:**
   - Teach math, computer science, and design online using digital whiteboards and step badges.
4. **SaaS Sales Engineers & Solutions Architects:**
   - Demo complex enterprise software to prospects and emphasize high-converting UI elements.
5. **Tech Streamers & YouTube Creators:**
   - Record software tutorials, live coding streams, and video essays (need clean aesthetics without ugly UI toolbars cluttering the video).

---

## 5. Business & Monetization Model

* **Distribution Model:** Desktop freemium app (Windows installer + zero-install standalone portable `.exe`).
* **Price Point:** **$29.00 USD (One-Time Lifetime License)** with 3 device activations per license key.
* **Merchant of Record:** Lemon Squeezy (handles global taxes, EU VAT, currency conversion).
* **Licensing Enforcement:** Offline-tolerant machine fingerprinting; local caching with optional periodic background ping.
* **Viral Engine:** Free users get clean core tools; Pro tools (laser, spotlight, loupe, blur, steps) showcase visual badges that spark curiosity. Videos recorded with the tool act as an organic marketing vehicle.

---

## 6. Competitive Landscape

| Competitor | Strengths | Critical Weaknesses |
| :--- | :--- | :--- |
| **Epic Pen** (Industry Standard) | Established brand, simple interface | Outdated Windows 7 aesthetic, intrusive bar, no hold-to-snap, expensive subscription model ($25/yr). |
| **Microsoft ZoomIt** (Sysinternals) | Free, lightweight, rock-solid stability | Ugly 1990s UI, rigid hotkey system, lacks modern shapes, step badges, or smooth pens. |
| **CleanShot X** (Mac only) | Best-in-class screenshot and annotation | **macOS exclusive**; not available for the 75%+ Windows desktop market; primarily a screen capture tool, not a live drawing overlay. |
| **Presentify** (Mac only) | Good live drawing and presentation focus | Mac only; lacks step badges, blur redaction, and radial fast-switching. |
| **ppInk / gInk** (Open Source) | Free, lots of tools | Cluttered, confusing UI; stutters under heavy drawing; high learning curve. |

---

## 7. Branding & Naming History (What Worked, What Didn't)

### The First Iteration: `GhostInk` 👻
* **The Idea:** "Draw in the air, click right through it, and watch it vanish like a ghost."
* **Why it was compelling:**
  - Extremely viral, high-energy hook for TikTok, YouTube Shorts, and X/Twitter videos.
  - Fun mascot potential (friendly ghost badge, cute stickers).
  - Clear sensory metaphor for the fading laser ink and the pass-through desktop state.
* **Why it stalled:**
  - Felt too "playful" or "indie" for conservative corporate/enterprise sales engineers.
  - Potential naming collision with other creative writing tools or existing ghost-related tech (e.g., Ghost CMS).

### The Second Iteration: `Inkova` 💎
* **The Idea:** A sleek, premium, modern European-sounding software name combining "Ink" + "Nova" (new star / explosion of creativity).
* **Why it was compelling:**
  - Modern, elegant, clean aesthetic that sits comfortably alongside *Raycast*, *Linear*, *Vercel*, or *Figma*.
  - Neutral and credible for enterprise procurement and corporate expense accounts.
* **The Problem Identified:**
  - **Social Media & Domain Conflicts:** Exact handle `@inkova` is heavily claimed across platforms (it is a common Slavic surname, an active branding agency `@inkova.co`, and an existing AI writing repository on GitHub).
  - Harder to immediately understand what the product does without a tagline.

---

## 8. What We Need From the AI Naming Agent

We are seeking a **definitive, high-converting product name** that satisfies the following criteria:

### Evaluation Rubric:
1. **Sensory / Functional Resonance:** Does the name convey *clarity, screen presence, smooth drawing, focus, or presentation mastery*?
2. **Memorability & Pronounceability:** Is it 1–2 syllables (or a crisp, punchy coined word under 8 letters)? Is it effortless to spell and say out loud in a video?
3. **Audience Balance:** Does it straddle the sweet spot between **creator virality** (appealing to streamers, YouTubers, founders) and **professional credibility** (comfortable on an enterprise software expense receipt)?
4. **Handle & Namespace Viability:** Can clean social handles and web domains be secured (e.g., exact `.com`, `.app`, or standard modifiers like `get[name].com`, `[name]app.com`, `@get[name]`)?
5. **Distinctiveness:** Avoids generic tropes (no boring "ScreenDraw360" or "DesktopAnnotatorPro").

### Promising Archetypes to Explore:
- **Action/Tool Metaphors:** Words related to light, focus, ink, precision, glass, layers, clarity (e.g., *Beam*, *Trace*, *Loom*, *Glow*, *Prism*, *Focal*, *Slate*).
- **Compound Punchy Names:** Pairs that tell a story (e.g., *ScreenDrop*, *GhostInk*, *InkLayer*, *ClearMark*, *KeyInk*, *OverGlass*).
- **Modern Coined Names:** Abstract but sharp tech monikers (e.g., *Inkova*, *Vellum*, *Spectra*, *Marka*, *Notiq*).

---

## 9. Quick Copy-Paste Prompt for Your AI Agent

```markdown
You are a world-class startup naming consultant and brand strategist who has named top developer tools and productivity utilities (like Raycast, CleanShot, Linear, Loom, and Figma).

Please read the attached comprehensive product brief for our next-generation desktop screen annotation and live presentation overlay for Windows.

Our goal: We need the optimal product name for this SaaS ($29 lifetime freemium desktop utility).

Please provide:
1. 5 Distinct Naming Angles (e.g., The Minimalist Tool, The Presentation Powerhouse, The Light/Focus Metaphor, The Modern Coined Brand, The Playful/Viral Disruptor).
2. 3 to 4 High-Quality Name Candidates per angle (with rationale, domain strategy, and social handle strategy).
3. A Head-to-Head Comparison between our previous names ("GhostInk" vs "Inkova") and the top 3 new contenders.
4. Your Single #1 Final Recommendation with justification for why it will maximize impulse buys and viral growth.
```
