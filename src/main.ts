import './styles.css';
import { AppState, Point, Stroke, DEFAULT_SHORTCUTS } from './types';
import { CanvasEngine } from './engine/canvas';
import { HistoryManager } from './engine/history';
import { recognizeShape } from './engine/recognizer';
import { Toolbar, ICONS } from './ui/toolbar';
import { RadialMenu } from './ui/radialMenu';
import { HotkeyManager, eventToShortcutKey } from './ui/hotkeys';
import { DiagnosticsManager } from './observability/telemetry';
import { LicenseManager } from './licensing/licenseManager';
import { INKOVA_LICENSING_CONFIG } from './licensing/config';

interface ShortcutItemDef {
  id: string;
  name: string;
  group: 'tools' | 'presentation' | 'actions';
  icon: string;
}

const SHORTCUT_DEFS: ShortcutItemDef[] = [
  // Core Drawing Tools
  { id: 'pen', name: 'Smooth Pen', group: 'tools', icon: ICONS.pen },
  { id: 'highlighter', name: 'Alpha Highlighter', group: 'tools', icon: ICONS.highlighter },
  { id: 'laser', name: 'Laser Pointer (iPhone Neon)', group: 'tools', icon: ICONS.laser },
  { id: 'arrow', name: 'Arrow Tool', group: 'tools', icon: ICONS.arrow },
  { id: 'line', name: 'Straight Line', group: 'tools', icon: ICONS.line },
  { id: 'rect', name: 'Rectangle Box', group: 'tools', icon: ICONS.rect },
  { id: 'circle', name: 'Circle / Ellipse', group: 'tools', icon: ICONS.circle },
  { id: 'step', name: 'Step Badge (① ② ③)', group: 'tools', icon: ICONS.step },
  { id: 'blur', name: 'Blur / Redact Box', group: 'tools', icon: ICONS.blur },
  { id: 'text', name: 'Text Note', group: 'tools', icon: ICONS.text },
  { id: 'eraser', name: 'Eraser', group: 'tools', icon: ICONS.eraser },
  // Presentation FX
  { id: 'spotlight', name: 'Spotlight Dimmer', group: 'presentation', icon: ICONS.spotlight },
  { id: 'zoom', name: 'Magnifier Loupe', group: 'presentation', icon: ICONS.zoom },
  { id: 'toggle-glass', name: 'Toggle Glass Mode (Pass-through)', group: 'presentation', icon: '💎' },
  // Actions & Utilities
  { id: 'clear', name: 'Clear Canvas', group: 'actions', icon: ICONS.clear },
  { id: 'undo', name: 'Undo Last Stroke', group: 'actions', icon: ICONS.undo },
  { id: 'redo', name: 'Redo Stroke', group: 'actions', icon: ICONS.redo },
  { id: 'snapshot', name: 'Save / Export Snapshot', group: 'actions', icon: ICONS.snapshot },
  { id: 'toggle-orientation', name: 'Flip Toolbar Orientation', group: 'actions', icon: ICONS.rotate },
  { id: 'toggle-tray', name: 'Hide / Show System Tray', group: 'actions', icon: ICONS.tray },
  { id: 'help', name: 'Shortcuts & Settings Guide', group: 'actions', icon: ICONS.help }
];

export class InkovaApp {
  private mainCanvas!: HTMLCanvasElement;
  private fxCanvas!: HTMLCanvasElement;
  private engine!: CanvasEngine;
  private history = new HistoryManager();
  private toolbar!: Toolbar;
  private radialMenu!: RadialMenu;
  private hotkeyManager!: HotkeyManager;
  private toastEl!: HTMLElement;
  private diagnostics = DiagnosticsManager.getInstance();
  private license = LicenseManager.getInstance();

  private activeModalTab: 'customize' | 'cheatsheet' | 'diagnostics' | 'license' = 'customize';
  private activeListeningAction: string | null = null;
  private captureKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private availableDisplays: Array<{ id: number; name: string; width: number; height: number; scale_factor: number; is_current: boolean }> = [];
  private updateCheckStatus: { checking: boolean; message: string; updateAvailable: boolean; updateObj?: any } = {
    checking: false,
    message: '',
    updateAvailable: false
  };

  private state: AppState = {
    currentTool: 'pen',
    activeColor: '#ef4444',
    activeWidth: 6,
    backdrop: 'transparent',
    isGlassMode: false,
    spotlightEnabled: false,
    zoomEnabled: false,
    stepCounter: 1,
    fadingTimerMs: 1500,
    snapEnabled: true,
    toolbarOrientation: 'vertical',
    toolbarPosition: { left: 16, top: 36 },
    shortcuts: { ...DEFAULT_SHORTCUTS }
  };

  private isDrawing = false;
  private activePoints: Point[] = [];
  private snapTimer: number | null = null;
  private lastPoint: Point | null = null;

  // Eraser gesture history batching
  private eraserStartStrokes: Stroke[] | null = null;
  private hasErasedInGesture = false;

  constructor() {
    this.loadSavedSettings();
    this.initDOM();
    this.initEngine();
    this.initUI();
    this.initEvents();
  }

  private initDOM() {
    const app = document.getElementById('app')!;
    app.innerHTML = `
      <canvas id="main-canvas"></canvas>
      <canvas id="fx-canvas"></canvas>
      <div id="radial-container"></div>
      <div id="toolbar-container"></div>
      <div id="toast" class="toast hidden"></div>
      <div id="help-modal" class="help-modal hidden">
        <div class="help-content" id="modal-container"></div>
      </div>
    `;

    this.mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.fxCanvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
    this.toastEl = document.getElementById('toast') as HTMLElement;
    this.diagnostics.init('0.1.9');
    this.diagnostics.attachCanvasListeners(this.mainCanvas);
    this.diagnostics.attachCanvasListeners(this.fxCanvas);
    this.renderModalContent();
  }

  private initEngine() {
    this.engine = new CanvasEngine(this.mainCanvas, this.fxCanvas);
    if (this.state.backdrop !== 'transparent') {
      this.engine.setBackdrop(this.state.backdrop);
    }
  }

  private initUI() {
    const toolbarContainer = document.getElementById('toolbar-container')!;
    this.toolbar = new Toolbar(
      toolbarContainer,
      this.state,
      (newState) => {
        this.state = newState;
        this.engine.activeSpotlight = this.state.spotlightEnabled;
        this.engine.activeZoom = this.state.zoomEnabled;
        this.engine.setBackdrop(this.state.backdrop);
        this.updateGlassBanner();
        this.updateCursorStyle();
        this.saveSettings();
        this.diagnostics.trackEvent('state_updated', {
          tool: this.state.currentTool,
          color: this.state.activeColor,
          width: this.state.activeWidth,
          glass: this.state.isGlassMode
        });
      },
      (action) => {
        if (action === 'undo') this.handleUndo();
        if (action === 'redo') this.handleRedo();
        if (action === 'clear') this.handleClear();
        if (action === 'toggle-glass') this.toggleGlassMode();
        if (action === 'snapshot') this.handleSnapshot();
        if (action === 'help') this.toggleHelpModal();
        if (action === 'hide-tray') this.handleHideToTray();
        if (action === 'quit') this.handleQuit();
        if (action === 'toggle-orientation') this.toolbar.toggleOrientation();
        if (action === 'open-pro') this.openProModal();
      },
      () => {
        this.syncToolbarBounds();
      }
    );

    // Initial synchronization of toolbar bounds to native backend
    this.syncToolbarBounds();

    // Ensure toolbar is always interactive even in Glass Mode (frontend fallback)
    toolbarContainer.addEventListener('mouseenter', () => {
      this.setTauriClickThrough(false);
    });
    toolbarContainer.addEventListener('mouseleave', () => {
      if (this.state.isGlassMode) {
        this.setTauriClickThrough(true);
      }
    });

    const radialContainer = document.getElementById('radial-container')!;
    this.radialMenu = new RadialMenu(radialContainer, (tool) => {
      if (this.license.isToolLocked(tool)) {
        this.openProModal(tool);
        return;
      }
      this.state.currentTool = tool;
      this.toolbar.updateState({ currentTool: tool });
      this.updateCursorStyle();
      this.saveSettings();
      this.diagnostics.trackEvent('radial_tool_selected', { tool });
    });

    this.hotkeyManager = new HotkeyManager({
      shortcuts: this.state.shortcuts,
      onToolSelect: (tool) => {
        if (this.license.isToolLocked(tool)) {
          this.openProModal(tool);
          return;
        }
        this.state.currentTool = tool;
        this.toolbar.updateState({ currentTool: tool });
        this.updateCursorStyle();
        this.saveSettings();
        this.diagnostics.trackEvent('hotkey_tool_selected', { tool });
      },
      onAction: (act) => {
        if (act === 'spotlight' && this.license.isToolLocked('spotlight')) {
          this.openProModal('spotlight');
          return;
        }
        if (act === 'zoom' && this.license.isToolLocked('zoom')) {
          this.openProModal('zoom');
          return;
        }
        if (act === 'undo') this.handleUndo();
        if (act === 'redo') this.handleRedo();
        if (act === 'clear') this.handleClear();
        if (act === 'toggle-glass') this.toggleGlassMode();
        if (act === 'snapshot') this.handleSnapshot();
        if (act === 'help') this.toggleHelpModal();
        if (act === 'hide-tray') this.handleHideToTray();
        if (act === 'toggle-tray') this.handleToggleTray();
        if (act === 'toggle-orientation') this.toolbar.toggleOrientation();
        if (act === 'quit') this.handleQuit();
        if (act === 'escape') {
          this.closeHelpModal();
          this.radialMenu.cancel();
          if (this.state.isGlassMode) {
            this.setGlassState(false);
          }
          if (this.state.spotlightEnabled) {
            this.state.spotlightEnabled = false;
            this.engine.activeSpotlight = false;
            this.toolbar.updateState({ spotlightEnabled: false });
          }
          if (this.state.zoomEnabled) {
            this.state.zoomEnabled = false;
            this.engine.activeZoom = false;
            this.toolbar.updateState({ zoomEnabled: false });
          }
          this.state.currentTool = 'pen';
          this.toolbar.updateState({ currentTool: 'pen' });
          this.saveSettings();
        }
        if (act === 'spotlight') {
          this.state.spotlightEnabled = !this.state.spotlightEnabled;
          this.engine.activeSpotlight = this.state.spotlightEnabled;
          this.toolbar.updateState({ spotlightEnabled: this.state.spotlightEnabled });
        }
        if (act === 'zoom') {
          this.state.zoomEnabled = !this.state.zoomEnabled;
          this.engine.activeZoom = this.state.zoomEnabled;
          this.toolbar.updateState({ zoomEnabled: this.state.zoomEnabled });
        }
      },
      onTemporaryGlass: (active, shouldFocus = true) => {
        this.setGlassState(active, shouldFocus);
      },
      onRadialToggle: (active) => {
        if (active) {
          const x = this.lastPoint ? this.lastPoint.x : window.innerWidth / 2;
          const y = this.lastPoint ? this.lastPoint.y : window.innerHeight / 2;
          this.radialMenu.open(x, y);
        } else {
          this.radialMenu.close();
        }
      },
      onColorIndex: (idx) => {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#ffffff', '#09090b'];
        if (colors[idx]) {
          this.state.activeColor = colors[idx];
          this.toolbar.updateState({ activeColor: colors[idx] });
          this.saveSettings();
        }
      },
      onSizeDelta: (delta) => {
        this.state.activeWidth = Math.max(2, Math.min(48, this.state.activeWidth + delta));
        this.toolbar.updateState({ activeWidth: this.state.activeWidth });
        this.saveSettings();
      }
    });
  }

  private initEvents() {
    window.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    window.addEventListener('resize', () => this.syncToolbarBounds());

    // Right-click: if step badge, decrement; else cancel radial or erase
    window.addEventListener('contextmenu', (e) => {
      if (this.state.currentTool === 'step') {
        e.preventDefault();
        this.state.stepCounter = Math.max(1, this.state.stepCounter - 1);
      } else if (this.radialMenu.isMenuOpen()) {
        e.preventDefault();
        this.radialMenu.cancel();
      }
    });

    // Listen for tray show/focus event and display change events
    if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
      import('@tauri-apps/api/webviewWindow').then(({ getCurrentWebviewWindow }) => {
        const win = getCurrentWebviewWindow();
        win.listen('glass-mode-disable', () => {
          this.setGlassState(false);
        });
        win.listen('display-changed', () => {
          this.engine.handleResize();
          this.syncToolbarBounds();
          this.loadDisplays();
        });
        win.listen('check-update-requested', () => {
          const modal = document.getElementById('help-modal');
          if (modal?.classList.contains('hidden')) {
            this.toggleHelpModal();
          }
          this.checkForAppUpdates(true);
        });
      }).catch(() => {});
    }
    this.loadDisplays();
    setTimeout(() => this.checkForAppUpdates(false), 4000);
  }

  private onPointerDown(e: PointerEvent) {
    // Ignore clicks inside toolbar, radial menu, toast, or text input
    if ((e.target as HTMLElement).closest('#toolbar-container, #radial-container, .toast, .canvas-text-input')) {
      return;
    }

    if (this.state.isGlassMode) return;

    this.isDrawing = true;
    const pt: Point = { x: e.clientX, y: e.clientY, pressure: e.pressure };
    this.activePoints = [pt];
    this.lastPoint = pt;

    if (this.state.currentTool === 'eraser') {
      this.eraserStartStrokes = [...this.engine.getStrokes()];
      this.hasErasedInGesture = false;
      if (this.engine.eraseAt(pt)) {
        this.hasErasedInGesture = true;
        this.syncStepCounter();
      }
      return;
    }

    if (this.state.currentTool === 'step') {
      const stepStroke: Stroke = {
        id: crypto.randomUUID(),
        type: 'step',
        points: [pt],
        color: this.state.activeColor,
        width: this.state.activeWidth,
        stepNumber: this.state.stepCounter++
      };
      this.history.push(this.engine.getStrokes());
      this.engine.addStroke(stepStroke);
      this.isDrawing = false;
      return;
    }

    if (this.state.currentTool === 'text') {
      this.promptTextInput(pt);
      this.isDrawing = false;
      return;
    }

    if (this.state.currentTool === 'laser') {
      this.engine.startLaserStroke(pt.x, pt.y, this.state.activeColor, this.state.activeWidth);
      return;
    }

    // Start preview stroke
    this.engine.activePreviewStroke = {
      id: 'preview',
      type: this.state.currentTool,
      points: this.activePoints,
      color: this.state.activeColor,
      width: this.state.activeWidth,
      alpha: this.state.currentTool === 'highlighter' ? 0.38 : 1
    };

    this.startSnapHoldTimer();
  }

  private onPointerMove(e: PointerEvent) {
    const pt: Point = { x: e.clientX, y: e.clientY, pressure: e.pressure };
    this.lastPoint = pt;
    this.engine.updateCursor(pt.x, pt.y);

    if (this.radialMenu.isMenuOpen()) {
      this.radialMenu.updateCursor(pt.x, pt.y);
      return;
    }

    if (!this.isDrawing || this.state.isGlassMode) return;

    if (this.state.currentTool === 'eraser') {
      if (this.engine.eraseAt(pt)) {
        this.hasErasedInGesture = true;
        this.syncStepCounter();
      }
      return;
    }

    if (this.state.currentTool === 'laser') {
      this.engine.addLaserPoint(pt.x, pt.y, this.state.activeColor, this.state.activeWidth);
      return;
    }

    // Accumulate points
    const last = this.activePoints[this.activePoints.length - 1];
    if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) > 2) {
      if (this.engine.activePreviewStroke?.snapped) {
        // If stroke was already snapped, check if user deliberately breaks out (> 16px movement)
        if (Math.hypot(pt.x - last.x, pt.y - last.y) > 16) {
          this.engine.activePreviewStroke.snapped = false;
          this.engine.activePreviewStroke.type = this.state.currentTool;
          this.activePoints.push(pt);
          this.engine.activePreviewStroke.points = this.activePoints;
          this.startSnapHoldTimer();
        }
        // Otherwise, ignore micro-jitter to protect snapped geometry
        return;
      }

      this.activePoints.push(pt);
      if (this.engine.activePreviewStroke) {
        this.engine.activePreviewStroke.points = this.activePoints;
      }
      this.startSnapHoldTimer();
    }
  }

  private onPointerUp(_e: PointerEvent) {
    if (this.state.currentTool === 'laser') {
      this.engine.endLaserStroke();
    }
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.clearSnapHoldTimer();

    // Commit single unified undo entry for the entire eraser stroke gesture
    if (this.hasErasedInGesture && this.eraserStartStrokes) {
      this.history.push(this.eraserStartStrokes);
      this.eraserStartStrokes = null;
      this.hasErasedInGesture = false;
      this.syncStepCounter();
    }

    if (this.engine.activePreviewStroke && this.activePoints.length > 0) {
      const finalStroke: Stroke = {
        id: crypto.randomUUID(),
        type: this.engine.activePreviewStroke.type,
        points: [...this.engine.activePreviewStroke.points],
        color: this.state.activeColor,
        width: this.state.activeWidth,
        alpha: this.engine.activePreviewStroke.alpha,
        snapped: this.engine.activePreviewStroke.snapped
      };

      this.history.push(this.engine.getStrokes());
      this.engine.addStroke(finalStroke);
      this.engine.activePreviewStroke = null;
    }

    this.activePoints = [];
  }

  // Hold-to-Snap Feature (Apple Notes / Procreate style)
  private startSnapHoldTimer() {
    this.clearSnapHoldTimer();
    if (!this.state.snapEnabled || (this.state.currentTool !== 'pen' && this.state.currentTool !== 'arrow')) {
      return;
    }

    this.snapTimer = window.setTimeout(() => {
      if (this.isDrawing && this.activePoints.length >= 8) {
        // Verify cursor stillness: ensure user is actively holding still at stroke end
        const recentPts = this.activePoints.slice(-4);
        let maxMovement = 0;
        const lastPt = recentPts[recentPts.length - 1];
        for (const p of recentPts) {
          const d = Math.hypot(p.x - lastPt.x, p.y - lastPt.y);
          if (d > maxMovement) maxMovement = d;
        }

        if (maxMovement <= 8) {
          const recognized = recognizeShape(this.activePoints);
          if (recognized && this.engine.activePreviewStroke) {
            const finalType = (this.state.currentTool === 'arrow' && recognized.type === 'line')
              ? 'arrow'
              : recognized.type;
            this.engine.activePreviewStroke.type = finalType;
            this.engine.activePreviewStroke.points = recognized.points;
            this.engine.activePreviewStroke.snapped = true;
          }
        }
      }
    }, 550);
  }

  private clearSnapHoldTimer() {
    if (this.snapTimer) {
      clearTimeout(this.snapTimer);
      this.snapTimer = null;
    }
  }

  private promptTextInput(pt: Point) {
    // Dismiss any existing open text input
    const existing = document.querySelector('.canvas-text-input') as HTMLInputElement;
    if (existing) {
      existing.blur();
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'canvas-text-input';
    input.placeholder = 'Type note... (Enter to commit, Esc to cancel)';
    input.autocomplete = 'off';
    input.spellcheck = false;

    // Boundary clamp to keep input inside viewport
    const clampedX = Math.min(Math.max(16, pt.x), window.innerWidth - 300);
    const clampedY = Math.min(Math.max(16, pt.y), window.innerHeight - 60);

    input.style.left = `${clampedX}px`;
    input.style.top = `${clampedY}px`;
    input.style.color = this.state.activeColor;
    input.style.borderColor = this.state.activeColor;
    input.style.caretColor = this.state.activeColor;
    input.style.fontSize = `${Math.max(16, this.state.activeWidth * 2)}px`;

    const app = document.getElementById('app') || document.body;
    app.appendChild(input);

    requestAnimationFrame(() => {
      input.focus();
    });

    let isCommitted = false;
    const commit = () => {
      if (isCommitted) return;
      isCommitted = true;
      input.removeEventListener('blur', commit);
      const text = input.value.trim();
      if (text) {
        const textStroke: Stroke = {
          id: crypto.randomUUID(),
          type: 'text',
          points: [{ x: clampedX, y: clampedY }],
          color: this.state.activeColor,
          width: this.state.activeWidth,
          text
        };
        this.history.push(this.engine.getStrokes());
        this.engine.addStroke(textStroke);
      }
      input.remove();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      }
      if (e.key === 'Escape') {
        isCommitted = true;
        input.removeEventListener('blur', commit);
        input.remove();
      }
    });

    input.addEventListener('blur', commit);
  }

  private updateCursorStyle() {
    this.engine.isLaserToolActive = (this.state.currentTool === 'laser' && !this.state.isGlassMode);
    this.engine.setLaserStyle(this.state.activeColor, this.state.activeWidth, this.state.fadingTimerMs);

    if (this.state.isGlassMode) {
      document.body.style.cursor = 'default';
      document.body.classList.remove('laser-active');
    } else if (this.state.currentTool === 'text') {
      document.body.style.cursor = 'text';
      document.body.classList.remove('laser-active');
    } else if (this.state.currentTool === 'eraser') {
      document.body.style.cursor = 'cell';
      document.body.classList.remove('laser-active');
    } else if (this.state.currentTool === 'laser') {
      document.body.style.cursor = 'none';
      document.body.classList.add('laser-active');
    } else {
      document.body.style.cursor = 'crosshair';
      document.body.classList.remove('laser-active');
    }
  }

  private syncStepCounter() {
    const stepStrokes = this.engine.getStrokes().filter(s => s.type === 'step' && typeof s.stepNumber === 'number');
    if (stepStrokes.length === 0) {
      this.state.stepCounter = 1;
    } else {
      const maxStep = Math.max(...stepStrokes.map(s => s.stepNumber || 0));
      this.state.stepCounter = maxStep + 1;
    }
  }

  private handleUndo() {
    const prev = this.history.undo(this.engine.getStrokes());
    if (prev !== null) {
      this.engine.setStrokes(prev);
      this.syncStepCounter();
      this.diagnostics.trackEvent('history_undo');
    }
  }

  private handleRedo() {
    const next = this.history.redo(this.engine.getStrokes());
    if (next !== null) {
      this.engine.setStrokes(next);
      this.syncStepCounter();
      this.diagnostics.trackEvent('history_redo');
    }
  }

  private handleClear() {
    const current = this.engine.getStrokes();
    if (current.length === 0) return;

    this.history.recordClear(current);
    this.engine.setStrokes([]);
    this.syncStepCounter();
    this.diagnostics.trackEvent('canvas_cleared');
  }

  private toggleGlassMode() {
    this.setGlassState(!this.state.isGlassMode);
  }

  private async setGlassState(active: boolean, shouldFocus = true) {
    this.state.isGlassMode = active;
    this.toolbar.updateState({ isGlassMode: active });
    this.updateGlassBanner();
    this.diagnostics.trackEvent('glass_mode_toggled', { active });
    await this.setTauriClickThrough(active);
    if (!active && shouldFocus) {
      try {
        if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
          const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
          await getCurrentWebviewWindow().setFocus();
        }
      } catch {}
    }
  }

  private async setTauriClickThrough(ignore: boolean) {
    try {
      if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_glass_mode', { active: ignore });
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        await getCurrentWebviewWindow().setIgnoreCursorEvents(ignore);
      }
    } catch {
      // In browser preview mode
    }
  }

  private async syncToolbarBounds() {
    try {
      if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined' && this.toolbar) {
        const { invoke } = await import('@tauri-apps/api/core');
        const bounds = this.toolbar.getBounds();
        await invoke('update_toolbar_bounds', { bounds });
      }
    } catch {
      // In browser preview mode
    }
  }

  private handleSnapshot() {
    try {
      const mergedCanvas = document.createElement('canvas');
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      mergedCanvas.width = w * dpr;
      mergedCanvas.height = h * dpr;
      const mCtx = mergedCanvas.getContext('2d')!;
      mCtx.scale(dpr, dpr);

      // Draw backdrop if active
      if (this.state.backdrop !== 'transparent') {
        this.engine.drawBackdrop(mCtx, this.state.backdrop, w, h);
      }

      // Draw all committed strokes
      for (const stroke of this.engine.getStrokes()) {
        this.engine.renderSingleStroke(mCtx, stroke);
      }

      // Draw any active laser annotations
      this.engine.renderLaserSnapshot(mCtx);

      const dataUrl = mergedCanvas.toDataURL('image/png');

      mergedCanvas.toBlob(async (blob) => {
        if (!blob) return;

        let savedNative = false;
        try {
          if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
            const { save } = await import('@tauri-apps/plugin-dialog');
            const { writeImage } = await import('@tauri-apps/plugin-clipboard-manager');
            const { invoke } = await import('@tauri-apps/api/core');

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const defaultPath = `inkova-snapshot-${timestamp}.png`;

            try {
              const arrayBuffer = await blob.arrayBuffer();
              await writeImage(new Uint8Array(arrayBuffer));
            } catch (clipErr) {
              console.warn('Native clipboard write skipped:', clipErr);
            }

            const filePath = await save({
              defaultPath,
              filters: [{ name: 'PNG Image', extensions: ['png'] }]
            });

            if (filePath) {
              const arrayBuffer = await blob.arrayBuffer();
              await invoke('save_snapshot_native', {
                path: filePath,
                data: Array.from(new Uint8Array(arrayBuffer))
              });
              this.showToast('📸 Snapshot saved successfully!');
            } else {
              this.showToast('Snapshot save cancelled');
            }
            savedNative = true;
          }
        } catch (tauriErr) {
          console.warn('Native snapshot handler failed, falling back to browser download:', tauriErr);
        }

        if (!savedNative) {
          // Browser fallback: simulated <a> download and clipboard API
          const a = document.createElement('a');
          a.href = dataUrl;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          a.download = `inkova-snapshot-${timestamp}.png`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => a.remove(), 200);

          if (navigator.clipboard && 'ClipboardItem' in window) {
            try {
              window.focus();
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            } catch {}
          }
          this.showToast('📸 Snapshot exported as PNG!');
        }
        this.diagnostics.trackEvent('snapshot_exported');
      }, 'image/png');
    } catch (err) {
      console.error('Snapshot failed:', err);
      this.diagnostics.trackError('ui', err as Error);
      this.showToast('Failed to save snapshot');
    }
  }

  private async toggleHelpModal() {
    const modal = document.getElementById('help-modal');
    if (!modal) return;
    const isHidden = modal.classList.toggle('hidden');
    if (!isHidden) {
      await this.loadDisplays();
      this.renderModalContent();
    } else {
      this.cancelShortcutListening();
    }
  }

  private async loadDisplays() {
    try {
      if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
        const { invoke } = await import('@tauri-apps/api/core');
        this.availableDisplays = await invoke('get_available_displays');
      }
    } catch {
      this.availableDisplays = [];
    }
  }

  private openProModal(toolName?: string) {
    this.activeModalTab = 'license';
    const modal = document.getElementById('help-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.renderModalContent();
      if (toolName) {
        this.showToast(`💎 ${toolName.toUpperCase()} is a Inkova Pro feature`);
      }
    }
  }

  private closeHelpModal() {
    const modal = document.getElementById('help-modal');
    modal?.classList.add('hidden');
    this.cancelShortcutListening();
  }

  private renderModalContent() {
    const container = document.getElementById('modal-container');
    if (!container) return;

    const isCustomize = this.activeModalTab === 'customize';
    const isCheatsheet = this.activeModalTab === 'cheatsheet';
    const isDiagnostics = this.activeModalTab === 'diagnostics';
    const isLicense = this.activeModalTab === 'license';

    container.innerHTML = `
      <div class="help-header">
        <div class="help-header-title">
          <span class="help-logo">💎</span>
          <h2 class="help-title">Inkova Controls & Settings</h2>
          ${this.license.isPro()
            ? `<span class="pro-header-badge">💎 PRO</span>`
            : `<button class="btn-upgrade-header" id="btn-upgrade-header">💎 Upgrade Pro ($29)</button>`
          }
        </div>
        <div class="modal-updater-bar">
          <span class="updater-status-text">${this.updateCheckStatus.message || 'v0.1.9'}</span>
          ${this.updateCheckStatus.updateAvailable
            ? `<button class="btn-install-update" id="btn-install-update">🚀 Install & Restart</button>`
            : `<button class="btn-check-update" id="btn-check-update" ${this.updateCheckStatus.checking ? 'disabled' : ''}>
                ${this.updateCheckStatus.checking ? 'Checking...' : '🔄 Check for Updates'}
               </button>`
          }
        </div>
        <button class="help-close-btn" id="btn-close-help" title="Close (Esc)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="modal-tabs">
        <button class="modal-tab-btn ${isCustomize ? 'active' : ''}" id="tab-customize">
          ⚙️ Customize Shortcuts
        </button>
        <button class="modal-tab-btn ${isCheatsheet ? 'active' : ''}" id="tab-cheatsheet">
          ⌨️ Quick Cheatsheet
        </button>
        <button class="modal-tab-btn ${isDiagnostics ? 'active' : ''}" id="tab-diagnostics">
          🛠️ System & Diagnostics
        </button>
        <button class="modal-tab-btn ${isLicense ? 'active' : ''}" id="tab-license">
          💎 License & Pro
        </button>
      </div>

      <div class="modal-tab-content">
        ${this.renderDisplaySwitcher()}
        ${isCustomize ? this.renderCustomizeTab() : (isCheatsheet ? this.renderCheatsheetTab() : (isDiagnostics ? this.renderDiagnosticsTab() : this.renderLicenseTab()))}
      </div>
    `;

    // Bind Close Button
    container.querySelector('#btn-close-help')?.addEventListener('click', () => {
      this.closeHelpModal();
    });

    // Bind Tab buttons
    container.querySelector('#tab-customize')?.addEventListener('click', () => {
      this.cancelShortcutListening();
      this.activeModalTab = 'customize';
      this.renderModalContent();
    });

    container.querySelector('#tab-cheatsheet')?.addEventListener('click', () => {
      this.cancelShortcutListening();
      this.activeModalTab = 'cheatsheet';
      this.renderModalContent();
    });

    container.querySelector('#tab-diagnostics')?.addEventListener('click', () => {
      this.cancelShortcutListening();
      this.activeModalTab = 'diagnostics';
      this.renderModalContent();
    });

    container.querySelector('#tab-license')?.addEventListener('click', () => {
      this.cancelShortcutListening();
      this.activeModalTab = 'license';
      this.renderModalContent();
    });

    container.querySelector('#btn-upgrade-header')?.addEventListener('click', () => {
      this.cancelShortcutListening();
      this.activeModalTab = 'license';
      this.renderModalContent();
    });

    if (isLicense) {
      container.querySelector('#btn-buy-license')?.addEventListener('click', async () => {
        try {
          if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
            const { openUrl } = await import('@tauri-apps/plugin-opener');
            await openUrl(INKOVA_LICENSING_CONFIG.checkoutUrl);
          } else {
            window.open(INKOVA_LICENSING_CONFIG.checkoutUrl, '_blank');
          }
        } catch {
          window.open(INKOVA_LICENSING_CONFIG.checkoutUrl, '_blank');
        }
      });

      container.querySelector('#btn-activate-license')?.addEventListener('click', async () => {
        const input = container.querySelector('#input-license-key') as HTMLInputElement;
        const feedback = container.querySelector('#license-feedback') as HTMLElement;
        const btn = container.querySelector('#btn-activate-license') as HTMLButtonElement;
        if (!input || !feedback) return;

        const key = input.value.trim();
        if (!key) {
          feedback.className = 'license-feedback error';
          feedback.textContent = 'Please enter a valid license key.';
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Activating...';
        const res = await this.license.activate(key);
        btn.disabled = false;
        btn.textContent = 'Activate Pro';

        if (res.success) {
          feedback.className = 'license-feedback success';
          feedback.textContent = res.message;
          setTimeout(() => {
            this.toolbar?.render();
            this.renderModalContent();
          }, 1200);
        } else {
          feedback.className = 'license-feedback error';
          feedback.textContent = res.message;
        }
      });

      container.querySelector('#btn-deactivate-license')?.addEventListener('click', async () => {
        await this.license.deactivate();
        this.toolbar?.render();
        this.renderModalContent();
      });
    }

    if (isDiagnostics) {
      container.querySelector('#chk-telemetry-optin')?.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        this.diagnostics.setTelemetryOptIn(checked);
        this.renderModalContent();
      });

      container.querySelector('#btn-copy-diagnostics')?.addEventListener('click', async () => {
        const ok = await this.diagnostics.copyDiagnosticsToClipboard();
        if (ok) {
          const btn = container.querySelector('#btn-copy-diagnostics') as HTMLButtonElement;
          if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✓ Report Copied!';
            setTimeout(() => {
              if (btn) btn.innerHTML = originalText;
            }, 2000);
          }
        }
      });

      container.querySelector('#btn-clear-diagnostics')?.addEventListener('click', () => {
        this.diagnostics.clearLogs();
        this.renderModalContent();
      });
    }

    if (isCustomize) {
      container.querySelector('#btn-reset-shortcuts')?.addEventListener('click', () => {
        this.resetShortcuts();
      });

      container.querySelectorAll<HTMLButtonElement>('.keybind-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const actionId = btn.dataset.action;
          const actionName = btn.dataset.name || actionId || '';
          if (actionId) {
            if (this.activeListeningAction === actionId) {
              this.cancelShortcutListening();
              this.renderModalContent();
            } else {
              this.startListeningForShortcut(actionId, actionName);
            }
          }
        });
      });
    }

    container.querySelectorAll<HTMLButtonElement>('.display-pill').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.displayId || '0', 10);
        try {
          if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('switch_display', { displayId: id });
            this.diagnostics.trackEvent('display_switched', { displayId: id });
            await this.loadDisplays();
            this.renderModalContent();
          }
        } catch (e) {
          console.warn('Failed to switch display:', e);
        }
      });
    });

    // Bind In-App Updater buttons
    container.querySelector('#btn-check-update')?.addEventListener('click', () => {
      this.checkForAppUpdates(true);
    });

    container.querySelector('#btn-install-update')?.addEventListener('click', () => {
      this.installAppUpdate();
    });
  }

  private async checkForAppUpdates(manual = false) {
    if (typeof (window as any).__TAURI_INTERNALS__ === 'undefined') {
      if (manual) {
        this.updateCheckStatus = { checking: false, message: 'Running in browser preview', updateAvailable: false };
        this.renderModalContent();
      }
      return;
    }

    try {
      this.updateCheckStatus = { checking: true, message: 'Checking for updates...', updateAvailable: false };
      this.renderModalContent();

      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update) {
        this.updateCheckStatus = {
          checking: false,
          message: `Update v${update.version} is available!`,
          updateAvailable: true,
          updateObj: update
        };
      } else {
        this.updateCheckStatus = {
          checking: false,
          message: "✓ Inkova is up to date",
          updateAvailable: false
        };
      }
    } catch (err: any) {
      console.warn('Update check failed:', err);
      this.updateCheckStatus = {
        checking: false,
        message: manual ? 'Up to date or offline' : '',
        updateAvailable: false
      };
    }
    this.renderModalContent();
  }

  private async installAppUpdate() {
    if (!this.updateCheckStatus.updateObj) return;
    try {
      this.updateCheckStatus = { ...this.updateCheckStatus, checking: true, message: 'Downloading & installing...' };
      this.renderModalContent();

      await this.updateCheckStatus.updateObj.downloadAndInstall();
      this.updateCheckStatus = { ...this.updateCheckStatus, checking: false, message: 'Update installed! Restarting...' };
      this.renderModalContent();

      setTimeout(async () => {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('restart_app');
        } catch {
          this.handleQuit();
        }
      }, 1000);
    } catch (err: any) {
      console.error('Update install failed:', err);
      this.updateCheckStatus = {
        checking: false,
        message: `Install failed: ${err.message || 'Error'}`,
        updateAvailable: false
      };
      this.renderModalContent();
    }
  }

  private renderDisplaySwitcher(): string {
    if (this.availableDisplays.length <= 1) return '';
    return `
      <div class="display-bar">
        <span class="display-bar-title">🖥️ Active Display Screen:</span>
        <div class="display-pills">
          ${this.availableDisplays.map((d) => `
            <button class="display-pill ${d.is_current ? 'active' : ''}" data-display-id="${d.id}" title="${d.width}×${d.height} @ ${d.scale_factor}x">
              ${d.name} (${d.width}×${d.height})
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderCustomizeTab(): string {
    const groups: { title: string; groupKey: 'tools' | 'presentation' | 'actions' }[] = [
      { title: '🎨 Drawing & Annotating Tools', groupKey: 'tools' },
      { title: '🔦 Presentation & Visual FX', groupKey: 'presentation' },
      { title: '⚡ Canvas Actions & Utilities', groupKey: 'actions' }
    ];

    let html = `
      <div class="shortcut-customize-panel">
        <div class="shortcut-banner">
          <div class="shortcut-banner-text">
            <span class="shortcut-tip-icon">💡</span>
            <span>Click any key badge below to rebind. Press your desired single key or combo (e.g. <kbd>Shift+P</kbd>, <kbd>Ctrl+Z</kbd>, or letters). Press <kbd>Esc</kbd> to cancel.</span>
          </div>
          <button class="btn-reset-shortcuts" id="btn-reset-shortcuts" title="Reset all keybindings to defaults">
            ↺ Reset Defaults
          </button>
        </div>
    `;

    for (const grp of groups) {
      const items = SHORTCUT_DEFS.filter((d) => d.group === grp.groupKey);
      html += `
        <div class="shortcut-group">
          <div class="shortcut-group-title">${grp.title}</div>
          <div class="shortcut-grid">
      `;

      for (const item of items) {
        const isListening = this.activeListeningAction === item.id;
        const currentKey = this.state.shortcuts[item.id] || DEFAULT_SHORTCUTS[item.id] || '-';
        const displayKey = isListening ? 'Press key...' : currentKey.toUpperCase();

        html += `
          <div class="shortcut-row">
            <div class="shortcut-info">
              <span class="shortcut-icon">${item.icon}</span>
              <span class="shortcut-name">${item.name}</span>
            </div>
            <button 
              class="keybind-btn ${isListening ? 'listening' : ''}" 
              data-action="${item.id}"
              data-name="${item.name}"
              title="Click to rebind shortcut for ${item.name}"
            >
              ${displayKey}
            </button>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `
        <div class="shortcut-group">
          <div class="shortcut-group-title">🔒 Reserved Hold Gestures</div>
          <div class="shortcut-grid">
            <div class="shortcut-row">
              <div class="shortcut-info">
                <span class="shortcut-icon">🖱️</span>
                <span class="shortcut-name">Hold Space (Click-through to Desktop)</span>
              </div>
              <span class="keybind-reserved">HOLD SPACE</span>
            </div>
            <div class="shortcut-row">
              <div class="shortcut-info">
                <span class="shortcut-icon">🎯</span>
                <span class="shortcut-name">Hold Tab (Radial Quick Wheel)</span>
              </div>
              <span class="keybind-reserved">HOLD TAB</span>
            </div>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  private renderCheatsheetTab(): string {
    const getBadge = (id: string) => {
      const k = this.state.shortcuts[id] || DEFAULT_SHORTCUTS[id] || '-';
      return `<kbd>${k.toUpperCase()}</kbd>`;
    };

    return `
      <div class="help-grid">
        <div class="help-card">
          <div class="help-card-header">
            <span class="help-card-icon">🎨</span>
            <span class="help-card-title">Drawing Tools</span>
          </div>
          <div class="cheatsheet-list">
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Pen (Smooth freehand)</span>
              <span class="cheatsheet-key">${getBadge('pen')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Highlighter (Translucent)</span>
              <span class="cheatsheet-key">${getBadge('highlighter')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Laser Pointer (Neon glow)</span>
              <span class="cheatsheet-key">${getBadge('laser')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Arrow Vector</span>
              <span class="cheatsheet-key">${getBadge('arrow')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Line (Straight)</span>
              <span class="cheatsheet-key">${getBadge('line')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Rectangle Outline</span>
              <span class="cheatsheet-key">${getBadge('rect')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Circle / Ellipse</span>
              <span class="cheatsheet-key">${getBadge('circle')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Text Note (Click canvas)</span>
              <span class="cheatsheet-key">${getBadge('text')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Step Badge (① ② ③)</span>
              <span class="cheatsheet-key">${getBadge('step')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Blur / Redact Box</span>
              <span class="cheatsheet-key">${getBadge('blur')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Gesture Eraser</span>
              <span class="cheatsheet-key">${getBadge('eraser')}</span>
            </div>
          </div>
        </div>

        <div class="help-card">
          <div class="help-card-header">
            <span class="help-card-icon">🔦</span>
            <span class="help-card-title">Presentation FX</span>
          </div>
          <div class="cheatsheet-list">
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Spotlight Dimmer</span>
              <span class="cheatsheet-key">${getBadge('spotlight')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Magnifier Loupe (2x)</span>
              <span class="cheatsheet-key">${getBadge('zoom')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Glass Mode (Pass clicks)</span>
              <span class="cheatsheet-key">${getBadge('toggle-glass')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Desktop Pass-through</span>
              <span class="cheatsheet-key"><kbd>Hold Space</kbd></span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Radial Quick Menu</span>
              <span class="cheatsheet-key"><kbd>Hold Tab</kbd></span>
            </div>
          </div>
        </div>

        <div class="help-card">
          <div class="help-card-header">
            <span class="help-card-icon">⚡</span>
            <span class="help-card-title">Canvas & Actions</span>
          </div>
          <div class="cheatsheet-list">
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Undo Last Stroke</span>
              <span class="cheatsheet-key">${getBadge('undo')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Redo Stroke</span>
              <span class="cheatsheet-key">${getBadge('redo')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Clear All Strokes</span>
              <span class="cheatsheet-key">${getBadge('clear')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Save / Export Snapshot</span>
              <span class="cheatsheet-key">${getBadge('snapshot')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Flip Toolbar Orientation</span>
              <span class="cheatsheet-key">${getBadge('toggle-orientation')}</span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Quick Color Palettes</span>
              <span class="cheatsheet-key"><kbd>1</kbd> - <kbd>6</kbd></span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Stroke Width (±2px)</span>
              <span class="cheatsheet-key"><kbd>[</kbd> / <kbd>]</kbd></span>
            </div>
            <div class="cheatsheet-row">
              <span class="cheatsheet-label">Reset to Pen / Close Modal</span>
              <span class="cheatsheet-key"><kbd>Esc</kbd></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderDiagnosticsTab(): string {
    const sys = this.diagnostics.getSystemInfo();
    const isOptedIn = this.diagnostics.isTelemetryOptedIn();
    const logs = this.diagnostics.getLogs();

    const dprPct = Math.round(sys.devicePixelRatio * 100);
    const gpuStatus = sys.hardwareAcceleration
      ? `<span class="status-good">✓ WebGL / Direct2D Active</span>`
      : `<span class="status-warn">⚠ Fallback (Software)</span>`;
    const netStatus = sys.online
      ? `<span class="status-good">● Online</span>`
      : `<span class="status-warn">○ Offline</span>`;

    const logsHtml = logs.length === 0
      ? `<div class="diag-empty-logs">No activity or error logs recorded yet.</div>`
      : logs.slice().reverse().map((entry) => {
          const date = new Date(entry.timestamp);
          const timeStr = isNaN(date.getTime())
            ? entry.timestamp
            : date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const badgeClass = entry.level === 'error' ? 'error' : (entry.level === 'warn' ? 'warn' : 'info');
          const detailsStr = entry.details ? ` <span style="color:#64748b">${JSON.stringify(entry.details)}</span>` : '';
          return `
            <div class="diag-log-row">
              <span class="diag-badge ${badgeClass}">${entry.level}</span>
              <span class="diag-time">${timeStr}</span>
              <span class="diag-category">[${entry.category}]</span>
              <span class="diag-msg">${entry.message}${detailsStr}</span>
            </div>
          `;
        }).join('');

    return `
      <div class="diagnostics-panel">
        <div class="diagnostics-cards-grid">
          <div class="diag-card">
            <span class="diag-card-title">🖥️ Display & Window</span>
            <span class="diag-metric">${sys.screenResolution}</span>
            <span style="font-size:11px;color:#94a3b8">Viewport: ${sys.windowSize}</span>
          </div>

          <div class="diag-card">
            <span class="diag-card-title">🔍 DPI Scaling Factor</span>
            <span class="diag-metric">${sys.devicePixelRatio}x (${dprPct}%)</span>
            <span style="font-size:11px;color:#94a3b8">Sub-pixel coordinate scale</span>
          </div>

          <div class="diag-card">
            <span class="diag-card-title">⚡ Graphics Pipeline</span>
            <span class="diag-metric">${gpuStatus}</span>
            <span style="font-size:11px;color:#94a3b8">Canvas 2D context recovery</span>
          </div>

          <div class="diag-card">
            <span class="diag-card-title">📦 Client Environment</span>
            <span class="diag-metric">Inkova v${sys.appVersion}</span>
            <span style="font-size:11px;color:#94a3b8">${sys.platform} · ${netStatus}</span>
          </div>
        </div>

        <div class="diag-telemetry-toggle">
          <label class="diag-checkbox-label">
            <input type="checkbox" id="chk-telemetry-optin" ${isOptedIn ? 'checked' : ''} />
            <span>
              <strong>Anonymous Telemetry & Error Reporting</strong> — Help improve Inkova reliability.
              <span style="display:block;font-size:11px;color:#94a3b8;margin-top:2px;">
                Privacy Guarantee: Drawings, canvas coordinates, strokes, and screen contents are NEVER tracked or transmitted.
              </span>
            </span>
          </label>
        </div>

        <div class="diag-logs-section">
          <div class="diag-logs-header">
            <span class="diag-logs-title">📋 Activity & Crash Log Buffer (${logs.length} entries)</span>
            <div class="diag-logs-actions">
              <button class="btn-diag-action accent" id="btn-copy-diagnostics" title="Copy full system specs & crash log report to clipboard">
                📋 Copy System Report
              </button>
              <button class="btn-diag-action" id="btn-clear-diagnostics" title="Clear current session log buffer">
                🗑️ Clear Logs
              </button>
            </div>
          </div>
          <div class="diag-logs-container">
            ${logsHtml}
          </div>
        </div>
      </div>
    `;
  }

  private renderLicenseTab(): string {
    const isPro = this.license.isPro();
    const data = this.license.getState();

    if (isPro) {
      const maskedKey = data.licenseKey
        ? (data.licenseKey.length > 8 ? `${data.licenseKey.slice(0, 6)}••••••••${data.licenseKey.slice(-4)}` : data.licenseKey)
        : 'ACTIVE-PRO';
      const actDate = data.activatedAt ? new Date(data.activatedAt).toLocaleDateString() : 'Active';
      const instanceName = this.license.getDeviceInstanceName();

      return `
        <div class="license-panel">
          <div class="license-active-card">
            <div class="license-active-header">
              <span class="license-active-badge">✓ Inkova Pro Lifetime Activated</span>
              <span class="license-price-tag">Lifetime License</span>
            </div>
            <p style="font-size:12px;color:#94a3b8;line-height:1.4">
              Thank you for supporting Inkova! All professional presentation features, spotlights, loupes, laser tools, and multi-monitor capabilities are unlocked on this device.
            </p>
            <div style="margin-top:6px">
              <div class="license-info-row">
                <span class="license-info-label">License Key</span>
                <span class="license-info-val">${maskedKey}</span>
              </div>
              <div class="license-info-row">
                <span class="license-info-label">Registered Machine</span>
                <span class="license-info-val">${instanceName}</span>
              </div>
              <div class="license-info-row">
                <span class="license-info-label">Activation Date</span>
                <span class="license-info-val">${actDate}</span>
              </div>
              <div class="license-info-row">
                <span class="license-info-label">Commercial Presenter Rights</span>
                <span class="license-info-val" style="color:#4ade80">✓ Granted</span>
              </div>
            </div>
            <button class="btn-deactivate" id="btn-deactivate-license" title="Deactivate on this machine to transfer your seat to another computer">
              ⇄ Deactivate on this Device
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="license-panel">
        <div class="license-hero-card">
          <div class="license-hero-header">
            <span class="license-hero-title">💎 Inkova Pro Edition</span>
            <span class="license-price-tag">${INKOVA_LICENSING_CONFIG.priceDisplay}</span>
          </div>
          <p class="license-hero-desc">
            Take your webinars, demos, and classroom presentations to the next level. A single license unlocks all presentational superpowers forever on up to <strong>3 personal devices</strong>.
          </p>
          <div class="license-features-grid">
            <div class="license-feat-item"><span class="license-feat-icon">🔦</span> Spotlight stage dimmer</div>
            <div class="license-feat-item"><span class="license-feat-icon">🔍</span> 2x Magnifier zoom loupe</div>
            <div class="license-feat-item"><span class="license-feat-icon">⚡</span> iPhone neon glow laser pointer</div>
            <div class="license-feat-item"><span class="license-feat-icon">🔒</span> Privacy blur & redact tool</div>
            <div class="license-feat-item"><span class="license-feat-icon">①</span> Step workflow sequence badges</div>
            <div class="license-feat-item"><span class="license-feat-icon">🖥️</span> Seamless multi-monitor switching</div>
            <div class="license-feat-item"><span class="license-feat-icon">📸</span> Unwatermarked 4K snapshot export</div>
            <div class="license-feat-item"><span class="license-feat-icon">💼</span> Full commercial usage license</div>
          </div>
          <div class="license-actions-row">
            <button class="btn-buy-lemon" id="btn-buy-license">
              🚀 Get Lifetime License ($29)
            </button>
            <span class="license-guarantee">✓ Instant key delivery • 14-day refund guarantee</span>
          </div>
        </div>

        <div class="license-activate-section">
          <div class="license-activate-title">Already purchased? Activate your key</div>
          <div class="license-input-group">
            <input 
              type="text" 
              class="license-input" 
              id="input-license-key" 
              placeholder="Paste Lemon Squeezy license key (e.g. 8F4B-XXXX-...)" 
              spellcheck="false" 
            />
            <button class="btn-activate-key" id="btn-activate-license">Activate Pro</button>
          </div>
          <div class="license-feedback" id="license-feedback"></div>
          <div class="license-demo-tip">
            Demo testing? Enter <code>INKOVA-PRO-DEMO</code> to test Pro mode locally.
          </div>
        </div>
      </div>
    `;
  }

  private startListeningForShortcut(actionId: string, _actionName: string) {
    this.cancelShortcutListening();
    this.activeListeningAction = actionId;
    this.renderModalContent();

    this.captureKeyHandler = (e: KeyboardEvent) => {
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        this.cancelShortcutListening();
        this.renderModalContent();
        this.showToast('Rebind cancelled');
        return;
      }

      const shortcut = eventToShortcutKey(e);
      if (!shortcut) return;

      this.cancelShortcutListening();
      this.updateShortcut(actionId, shortcut);
    };

    window.addEventListener('keydown', this.captureKeyHandler, { capture: true });
  }

  private cancelShortcutListening() {
    if (this.captureKeyHandler) {
      window.removeEventListener('keydown', this.captureKeyHandler, { capture: true });
      this.captureKeyHandler = null;
    }
    this.activeListeningAction = null;
  }

  private updateShortcut(actionId: string, newKey: string) {
    const conflictingAction = Object.keys(this.state.shortcuts).find(
      (k) => k !== actionId && this.state.shortcuts[k].toLowerCase() === newKey.toLowerCase()
    );

    if (conflictingAction) {
      const oldKey = this.state.shortcuts[actionId] || '';
      this.state.shortcuts[conflictingAction] = oldKey;
      this.showToast(`Swapped: [${newKey.toUpperCase()}] assigned to ${actionId}`);
    } else {
      this.showToast(`Bound [${newKey.toUpperCase()}] to ${actionId}`);
    }

    this.state.shortcuts[actionId] = newKey;
    this.hotkeyManager?.updateShortcuts(this.state.shortcuts);
    this.toolbar?.updateState({ shortcuts: this.state.shortcuts });
    this.saveSettings();
    this.diagnostics.trackEvent('shortcut_rebound', { action: actionId, key: newKey });
    this.renderModalContent();
  }

  private resetShortcuts() {
    this.cancelShortcutListening();
    this.state.shortcuts = { ...DEFAULT_SHORTCUTS };
    this.hotkeyManager?.updateShortcuts(this.state.shortcuts);
    this.toolbar?.updateState({ shortcuts: this.state.shortcuts });
    this.saveSettings();
    this.diagnostics.trackEvent('shortcuts_reset_to_default');
    this.renderModalContent();
    this.showToast('↺ Restored default shortcuts');
  }

  private updateGlassBanner() {
    if (this.state.isGlassMode) {
      document.body.classList.add('glass-mode');
    } else {
      document.body.classList.remove('glass-mode');
    }
  }

  private showToast(msg: string) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 1800);
  }

  private loadSavedSettings() {
    try {
      const saved = localStorage.getItem('inkova_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeColor) this.state.activeColor = parsed.activeColor;
        if (parsed.activeWidth) this.state.activeWidth = parsed.activeWidth;
        if (parsed.currentTool) this.state.currentTool = parsed.currentTool;
        if (parsed.backdrop) this.state.backdrop = parsed.backdrop;
        if (typeof parsed.snapEnabled === 'boolean') this.state.snapEnabled = parsed.snapEnabled;
        if (parsed.toolbarOrientation) this.state.toolbarOrientation = parsed.toolbarOrientation;
        if (parsed.toolbarPosition) this.state.toolbarPosition = parsed.toolbarPosition;
        if (parsed.shortcuts) this.state.shortcuts = { ...DEFAULT_SHORTCUTS, ...parsed.shortcuts };
      }

      const savedShortcuts = localStorage.getItem('inkova_shortcuts');
      if (savedShortcuts) {
        this.state.shortcuts = { ...DEFAULT_SHORTCUTS, ...JSON.parse(savedShortcuts) };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
  }

  private saveSettings() {
    try {
      const toSave = {
        activeColor: this.state.activeColor,
        activeWidth: this.state.activeWidth,
        currentTool: this.state.currentTool,
        backdrop: this.state.backdrop,
        snapEnabled: this.state.snapEnabled,
        toolbarOrientation: this.state.toolbarOrientation || 'vertical',
        toolbarPosition: this.state.toolbarPosition,
        shortcuts: this.state.shortcuts
      };
      localStorage.setItem('inkova_settings', JSON.stringify(toSave));
      localStorage.setItem('inkova_shortcuts', JSON.stringify(this.state.shortcuts));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }

  private async handleHideToTray() {
    try {
      if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        await getCurrentWebviewWindow().hide();
        return;
      }
    } catch (e) {
      console.warn('Failed to hide window to tray:', e);
    }
    // Browser fallback
    this.toolbar.collapse();
  }

  private async handleToggleTray() {
    try {
      if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const win = getCurrentWebviewWindow();
        const visible = await win.isVisible();
        if (visible) {
          await win.hide();
        } else {
          await win.show();
          await win.setIgnoreCursorEvents(false);
          await win.setFocus();
          this.setGlassState(false);
        }
        return;
      }
    } catch (e) {
      console.warn('Failed to toggle tray visibility:', e);
    }
    // Browser fallback
    this.toolbar.toggleCollapse();
  }

  private async handleQuit() {
    try {
      if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('exit_app');
        return;
      }
    } catch {}
    try {
      if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        await getCurrentWebviewWindow().close();
        return;
      }
    } catch {}
    window.close();
  }
}

// Start application
if (typeof window !== 'undefined' && !(window as any).__INKOVA_INITIALIZED__) {
  const start = () => {
    if (document.getElementById('app') && !(window as any).__INKOVA_INITIALIZED__) {
      (window as any).__INKOVA_INITIALIZED__ = true;
      new InkovaApp();
    }
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}

