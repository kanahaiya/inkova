# Contributing to Inkova 💎🖊️

First off, thank you for considering contributing to Inkova! It is community contributors like you that make open-source software delightful for everyone.

---

## 🛠️ Development Setup

### 1. Prerequisites
- **Node.js**: `v18.0.0` or later (`node -v`)
- **npm**: `v9.0.0` or later
- **Rust**: `1.80+` with the `stable-msvc` toolchain (`rustc --version`)
- *(Windows)*: **Visual Studio 2022 C++ Build Tools** with the "Desktop development with C++" workload.

### 2. Clone and Install
```bash
git clone https://github.com/kanahaiya/inkova.git
cd inkova
npm install
```

### 3. Running in Development Mode
- **Web Canvas Preview (Fast UI Iteration)**:
  ```bash
  npm run dev
  ```
  Opens at `http://localhost:1420`.

- **Native Tauri Desktop Overlay**:
  ```bash
  npm run tauri dev
  ```

---

## 🧪 Testing Guidelines

Inkova enforces high code quality with automated unit and end-to-end integration test suites:

```bash
# Run all 57 tests across 9 test suites
npm test

# Run tests in watch mode
npm run test:watch

# Validate TypeScript typing and bundling
npm run build
```

**PR Requirement:** All pull requests must pass `npm test` and `npm run build` with 0 errors before they can be merged.

---

## 📐 Project Structure

- `src/engine/`: Canvas math, Bézier smoothing, quadratic interpolation, vector shape recognizer, history stack.
- `src/ui/`: Draggable glassmorphic toolbar, radial pie menu, keyboard shortcut managers, modals.
- `src/licensing/`: Lemon Squeezy integration, local caching, and feature gating.
- `src/observability/`: System diagnostics, crash handling, and telemetry ring-buffer.
- `src-tauri/`: Rust backend, native click-through events, system tray, display enumeration, and auto-updater.

---

## 🐛 Submitting Issues & Bug Reports

1. Check existing [GitHub Issues](https://github.com/kanahaiya/inkova/issues) to avoid duplicates.
2. Provide your exact environment details:
   - Inkova version (e.g. `v0.1.9`)
   - Windows build version (e.g. `Windows 11 23H2`)
   - Display setup (number of monitors, DPI scaling percentages like 100%, 125%, 150%)
3. You can click **Shortcuts & Settings ( ? ) ➔ System & Diagnostics ➔ 📋 Copy System Report** in the app to grab an anonymized diagnostic report to paste into your issue.

---

## 📜 Pull Request Guidelines

1. Create a feature branch: `git checkout -b feat/my-awesome-improvement`.
2. Follow our commit conventions:
   - `feat(...)`: New capability or tool
   - `fix(...)`: Bug fix
   - `perf(...)`: Performance optimization
   - `docs(...)`: Documentation or guides
   - `test(...)`: Test additions or fixes
3. Ensure no unnecessary console logs or temporary files are added.
4. Push and open your PR on GitHub!

---

## ⚖️ License
By contributing to Inkova, you agree that your contributions will be licensed under its **MIT License**.
