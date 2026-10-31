import { ToolType, AppState, BackdropType } from '../types';
import { LicenseManager } from '../licensing/licenseManager';

export const ICONS = {
  pen: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
  highlighter: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h3l6-6"/><path d="m22 7-4.5-4.5a2.12 2.12 0 0 0-3 0l-3.5 3.5 7.5 7.5 3.5-3.5a2.12 2.12 0 0 0 0-3Z"/></svg>`,
  laser: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  line: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><circle cx="5" cy="19" r="1.5" fill="currentColor"/><circle cx="19" cy="5" r="1.5" fill="currentColor"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/></svg>`,
  rect: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="14" x="3" y="5" rx="2"/></svg>`,
  circle: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>`,
  step: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8"/><path d="M10 10l2-2"/></svg>`,
  blur: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><line x1="3" y1="3" x2="21" y2="21"/></svg>`,
  text: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
  eraser: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,
  spotlight: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m8 4 12 12"/><circle cx="18" cy="6" r="3"/></svg>`,
  zoom: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  snapshot: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,
  redo: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>`,
  clear: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  help: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  tray: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  collapse: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  quit: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  backdrop: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  rotate: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`,
  display: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  expand: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`
};

interface ToolDef {
  tool: ToolType;
  keycap: string;
  name: string;
  shortcut: string;
}

const TOOLS: ToolDef[] = [
  { tool: 'pen', keycap: 'P', name: 'Pen', shortcut: 'P' },
  { tool: 'highlighter', keycap: 'H', name: 'Highlighter', shortcut: 'H' },
  { tool: 'laser', keycap: 'L', name: 'Laser Pointer', shortcut: 'L' },
  { tool: 'arrow', keycap: 'A', name: 'Arrow', shortcut: 'A' },
  { tool: 'line', keycap: 'I', name: 'Line', shortcut: 'I' },
  { tool: 'rect', keycap: 'R', name: 'Rectangle', shortcut: 'R' },
  { tool: 'circle', keycap: 'O', name: 'Circle', shortcut: 'O' },
  { tool: 'step', keycap: 'B', name: 'Step Badge', shortcut: 'B' },
  { tool: 'blur', keycap: 'X', name: 'Blur / Redact', shortcut: 'X' },
  { tool: 'text', keycap: 'T', name: 'Text Note', shortcut: 'T' },
  { tool: 'eraser', keycap: 'E', name: 'Eraser', shortcut: 'E' },
];

export type ToolbarAction = 'undo' | 'redo' | 'clear' | 'toggle-glass' | 'snapshot' | 'help' | 'quit' | 'hide-tray' | 'toggle-orientation' | 'open-pro' | 'switch-display';

export class Toolbar {
  private container: HTMLElement;
  private state: AppState;
  private onStateChange: (state: AppState) => void;
  private onAction: (action: ToolbarAction) => void;
  private isCollapsed = false;
  private activePopover: 'style' | 'backdrop' | null = null;
  private orientation: 'horizontal' | 'vertical' = 'horizontal';

  private colors = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Green', hex: '#10b981' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Purple', hex: '#8b5cf6' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Black', hex: '#09090b' }
  ];

  private onBoundsChange?: () => void;

  constructor(
    container: HTMLElement,
    initialState: AppState,
    onStateChange: (state: AppState) => void,
    onAction: (action: ToolbarAction) => void,
    onBoundsChange?: () => void
  ) {
    this.container = container;
    this.state = initialState;
    this.orientation = initialState.toolbarOrientation || 'vertical';
    this.onStateChange = onStateChange;
    this.onAction = onAction;
    this.onBoundsChange = onBoundsChange;

    this.applyPosition();
    this.render();
    this.initDrag();
    this.initGlobalClick();
  }

  private applyPosition() {
    if (this.state.toolbarPosition) {
      this.container.style.left = `${this.state.toolbarPosition.left}px`;
      this.container.style.top = `${this.state.toolbarPosition.top}px`;
      this.container.style.transform = 'none';
    } else {
      if (this.orientation === 'vertical') {
        this.container.style.left = '16px';
        this.container.style.top = '36px';
        this.container.style.transform = 'none';
      } else {
        this.container.style.left = '50%';
        this.container.style.top = '16px';
        this.container.style.transform = 'translateX(-50%)';
      }
    }
  }

  public getBounds() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: rect.left * dpr,
      y: rect.top * dpr,
      width: rect.width * dpr,
      height: rect.height * dpr,
    };
  }

  public notifyBounds() {
    if (this.onBoundsChange) {
      this.onBoundsChange();
    }
  }

  updateState(newState: Partial<AppState>) {
    this.state = { ...this.state, ...newState };
    if (newState.toolbarOrientation) {
      this.orientation = newState.toolbarOrientation;
    }
    this.render();
  }

  public collapse() {
    this.isCollapsed = true;
    this.activePopover = null;
    this.render();
  }

  public expand() {
    this.isCollapsed = false;
    this.render();
  }

  public toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.activePopover = null;
    this.render();
  }

  public toggleOrientation() {
    const isNowVertical = this.orientation !== 'vertical';
    this.orientation = isNowVertical ? 'vertical' : 'horizontal';
    this.state.toolbarOrientation = this.orientation;
    this.onStateChange(this.state);
    this.activePopover = null;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const rect = this.container.getBoundingClientRect();

    if (isNowVertical) {
      const targetLeft = rect.left > screenW / 2 ? screenW - 56 : 16;
      const targetTop = Math.max(16, Math.min(screenH - 580, rect.top));
      this.container.style.transition = 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1), top 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      this.container.style.left = `${targetLeft}px`;
      this.container.style.top = `${targetTop}px`;
      this.container.style.transform = 'none';
      this.state.toolbarPosition = { left: targetLeft, top: targetTop };
      this.onStateChange(this.state);
    } else {
      const targetTop = rect.top > screenH / 2 ? screenH - 58 : 16;
      this.container.style.transition = 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1), top 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      this.container.style.left = '50%';
      this.container.style.top = `${targetTop}px`;
      this.container.style.transform = 'translateX(-50%)';
      this.state.toolbarPosition = undefined;
      this.onStateChange(this.state);
    }

    this.render();

    setTimeout(() => {
      this.container.style.transition = '';
    }, 260);
  }

  private initGlobalClick() {
    window.addEventListener('mousedown', (e) => {
      if (!this.activePopover) return;
      const target = e.target as HTMLElement;
      if (!target.closest('#toolbar-container')) {
        this.activePopover = null;
        this.render();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activePopover) {
        this.activePopover = null;
        this.render();
      }
    });
  }

  public getToolIcon(tool: ToolType): string {
    return ICONS[tool] || ICONS.pen;
  }

  private getShortcutDisplay(action: string, fallback: string): string {
    const sc = this.state.shortcuts?.[action] || fallback;
    return sc.toUpperCase();
  }

  render() {
    const screenW = window.innerWidth;
    const rect = this.container.getBoundingClientRect();
    const isDockedRight = this.orientation === 'vertical' && rect.left > screenW / 2;

    this.container.className = `inkova-toolbar ${this.isCollapsed ? 'collapsed' : ''} ${this.orientation === 'vertical' ? 'orientation-vertical' : 'orientation-horizontal'} ${isDockedRight ? 'docked-right' : ''}`;

    if (this.isCollapsed) {
      this.container.innerHTML = `
        <div class="toolbar-collapsed-pill ${this.orientation === 'vertical' ? 'vertical' : ''}" id="collapsed-pill-body" title="Inkova (Click anywhere to Expand • Drag to Move)">
          <span class="pill-logo" title="Inkova">💎</span>
          <div class="capsule-divider"></div>
          <button class="expand-btn" id="btn-expand" title="Expand Toolbar [Click]">${ICONS.expand}</button>
          <button class="expand-btn tray-mini-btn" id="btn-tray-mini" title="Hide to System Tray [Ctrl+Shift+H]">${ICONS.tray}</button>
        </div>
      `;
      this.container.querySelector('#collapsed-pill-body')?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('#btn-tray-mini')) {
          this.isCollapsed = false;
          this.render();
        }
      });
      this.container.querySelector('#btn-tray-mini')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onAction('hide-tray');
      });
      return;
    }

    const backdropLabelMap: Record<BackdropType, string> = {
      transparent: 'Glass',
      whiteboard: 'White',
      blackboard: 'Black',
      grid: 'Grid'
    };

    this.container.innerHTML = `
      <!-- Capsule Shell -->
      <div class="capsule-bar">
        <!-- Section 1: Logo & Drag Handle -->
        <div class="capsule-group drag-handle" title="Drag to reposition (Snaps to edges / Auto-rotates)">
          <span class="app-logo">💎</span>
          <span class="grip-dots">⋮⋮</span>
        </div>

        <!-- Glass Mode Quick Toggle Pill -->
        <button class="glass-pill-btn ${this.state.isGlassMode ? 'active' : ''}" id="btn-glass" title="Toggle Glass Mode (Pass clicks to desktop) [${this.getShortcutDisplay('toggle-glass', 'G')}]">
          <span class="glass-status-dot"></span>
          <span class="glass-text">${this.state.isGlassMode ? 'Glass' : 'Draw'}</span>
        </button>

        <div class="capsule-divider"></div>

        <!-- Section 2: Core Drawing Tools -->
        <div class="capsule-group tools-group">
          ${TOOLS.map(t => {
            const sc = this.getShortcutDisplay(t.tool, t.shortcut);
            const keycap = sc.length <= 2 ? sc : sc.slice(0, 2);
            const isLocked = LicenseManager.getInstance().isToolLocked(t.tool);
            const proBadge = isLocked ? ' ★ PRO' : '';
            return `
            <button class="tool-capsule-btn ${this.state.currentTool === t.tool ? 'active' : ''} ${isLocked ? 'pro-tool' : ''}" 
              data-tool="${t.tool}" 
              title="${t.name}${proBadge} [${sc}]">
              <span class="tool-icon">${ICONS[t.tool]}</span>
              <span class="tool-keycap">${keycap}</span>
            </button>
          `;
          }).join('')}
        </div>

        <div class="capsule-divider"></div>

        <!-- Section 3: Presentation FX -->
        <div class="capsule-group fx-group">
          <button class="tool-capsule-btn ${this.state.spotlightEnabled ? 'active' : ''} ${LicenseManager.getInstance().isToolLocked('spotlight') ? 'pro-tool' : ''}" id="btn-spotlight" title="Spotlight Dimmer${LicenseManager.getInstance().isToolLocked('spotlight') ? ' ★ PRO' : ''} [${this.getShortcutDisplay('spotlight', 'F')}]">
            <span class="tool-icon">${ICONS.spotlight}</span>
            <span class="tool-keycap">${this.getShortcutDisplay('spotlight', 'F')}</span>
          </button>
          <button class="tool-capsule-btn ${this.state.zoomEnabled ? 'active' : ''} ${LicenseManager.getInstance().isToolLocked('zoom') ? 'pro-tool' : ''}" id="btn-zoom" title="Magnifier Loupe${LicenseManager.getInstance().isToolLocked('zoom') ? ' ★ PRO' : ''} [${this.getShortcutDisplay('zoom', 'Z')}]">
            <span class="tool-icon">${ICONS.zoom}</span>
            <span class="tool-keycap">${this.getShortcutDisplay('zoom', 'Z')}</span>
          </button>
        </div>

        <div class="capsule-divider"></div>

        <!-- Section 4: Style Trigger Pill (Color & Width Popover) -->
        <div class="popover-wrapper">
          <button class="style-trigger-btn ${this.activePopover === 'style' ? 'popover-open' : ''}" id="btn-style-popover" title="Color & Stroke Settings">
            <span class="color-dot-indicator" style="background-color: ${this.state.activeColor};"></span>
            <span class="stroke-num">${this.state.activeWidth}px</span>
            <span class="chevron-arrow">${ICONS.chevron}</span>
          </button>

          <!-- Style Popover Floating Menu -->
          <div class="glass-popover style-popover ${this.activePopover === 'style' ? 'open' : ''}" id="style-popover">
            <div class="popover-title">Stroke Color & Width</div>
            <div class="color-palette-compact">
              ${this.colors.map(c => `
                <button class="color-swatch-compact ${this.state.activeColor.toLowerCase() === c.hex.toLowerCase() ? 'active' : ''}" 
                  data-color="${c.hex}" 
                  style="background-color: ${c.hex};" 
                  title="${c.name}"></button>
              `).join('')}
              <label class="custom-color-btn-compact" title="Custom Color Picker">
                <input type="color" id="custom-color-input" value="${this.state.activeColor}" />
                <span class="color-wheel-compact">🎨</span>
              </label>
            </div>
            <div class="stroke-slider-row">
              <span class="stroke-preview-circle" style="width: ${Math.max(6, Math.min(24, this.state.activeWidth))}px; height: ${Math.max(6, Math.min(24, this.state.activeWidth))}px; background: ${this.state.activeColor};"></span>
              <input type="range" id="size-slider" min="2" max="36" value="${this.state.activeWidth}" />
              <span class="stroke-label">${this.state.activeWidth}px</span>
            </div>
          </div>
        </div>

        <!-- Section 5: Canvas Backdrop Switcher Popover -->
        <div class="popover-wrapper">
          <button class="backdrop-trigger-btn ${this.activePopover === 'backdrop' ? 'popover-open' : ''}" id="btn-backdrop-popover" title="Canvas Backdrop [Transparent / Whiteboard / Blackboard / Grid]">
            <span class="backdrop-icon">${ICONS.backdrop}</span>
            <span class="backdrop-name">${backdropLabelMap[this.state.backdrop]}</span>
            <span class="chevron-arrow">${ICONS.chevron}</span>
          </button>

          <!-- Backdrop Popover Floating Menu -->
          <div class="glass-popover backdrop-popover ${this.activePopover === 'backdrop' ? 'open' : ''}" id="backdrop-popover">
            <div class="popover-title">Canvas Backdrop</div>
            <div class="backdrop-options">
              <button class="backdrop-option-btn ${this.state.backdrop === 'transparent' ? 'active' : ''}" data-backdrop="transparent">
                <span class="opt-dot glass-dot"></span> Glass
              </button>
              <button class="backdrop-option-btn ${this.state.backdrop === 'whiteboard' ? 'active' : ''}" data-backdrop="whiteboard">
                <span class="opt-dot white-dot"></span> White
              </button>
              <button class="backdrop-option-btn ${this.state.backdrop === 'blackboard' ? 'active' : ''}" data-backdrop="blackboard">
                <span class="opt-dot black-dot"></span> Black
              </button>
              <button class="backdrop-option-btn ${this.state.backdrop === 'grid' ? 'active' : ''}" data-backdrop="grid">
                <span class="opt-dot grid-dot"></span> Grid
              </button>
            </div>
          </div>
        </div>

        <div class="capsule-divider"></div>

        <!-- Section 6: Action & Utility Controls -->
        <div class="capsule-group actions-group">
          <button class="action-capsule-btn" id="btn-switch-display" title="Switch Display Screen [${this.getShortcutDisplay('switch-display', 'Ctrl+Shift+D')}]">${ICONS.display}</button>
          <button class="action-capsule-btn orientation-btn" id="btn-orientation" title="Flip Orientation [${this.getShortcutDisplay('toggle-orientation', 'Alt+O')}]">${ICONS.rotate}</button>
          <button class="action-capsule-btn" id="btn-snapshot" title="Save / Export Snapshot [${this.getShortcutDisplay('snapshot', 'Ctrl+S')}]">${ICONS.snapshot}</button>
          <button class="action-capsule-btn" id="btn-undo" title="Undo [${this.getShortcutDisplay('undo', 'Ctrl+Z')}]">${ICONS.undo}</button>
          <button class="action-capsule-btn" id="btn-redo" title="Redo [${this.getShortcutDisplay('redo', 'Ctrl+Y')}]">${ICONS.redo}</button>
          <button class="action-capsule-btn danger" id="btn-clear" title="Clear Canvas [${this.getShortcutDisplay('clear', 'C')}]">${ICONS.clear}</button>
          <div class="capsule-subdivider"></div>
          <button class="action-capsule-btn" id="btn-help" title="Shortcuts & Settings [${this.getShortcutDisplay('help', '?')}]">${ICONS.help}</button>
          <button class="action-capsule-btn" id="btn-tray" title="Hide to System Tray [${this.getShortcutDisplay('toggle-tray', 'Ctrl+Shift+H')}]">${ICONS.tray}</button>
          <button class="action-capsule-btn" id="btn-collapse" title="Collapse to Mini-Pill">${ICONS.collapse}</button>
          <button class="action-capsule-btn quit-btn" id="btn-quit" title="Quit Inkova [Alt+F4]">${ICONS.quit}</button>
        </div>
      </div>
    `;

    this.attachEvents();
    this.notifyBounds();
  }

  private attachEvents() {
    // Switch Display
    this.container.querySelector('#btn-switch-display')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAction('switch-display');
    });

    // Orientation Flip
    this.container.querySelector('#btn-orientation')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleOrientation();
    });

    // Glass Mode toggle
    this.container.querySelector('#btn-glass')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAction('toggle-glass');
    });

    // Tool selection clicks
    this.container.querySelectorAll('.tool-capsule-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = (e.currentTarget as HTMLElement).dataset.tool as ToolType;
        if (LicenseManager.getInstance().isToolLocked(tool)) {
          this.onAction('open-pro');
          return;
        }
        this.state.currentTool = tool;
        this.onStateChange(this.state);
        this.activePopover = null;
        this.render();
      });
    });

    // Spotlight & Zoom
    this.container.querySelector('#btn-spotlight')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (LicenseManager.getInstance().isToolLocked('spotlight')) {
        this.onAction('open-pro');
        return;
      }
      this.state.spotlightEnabled = !this.state.spotlightEnabled;
      this.onStateChange(this.state);
      this.render();
    });

    this.container.querySelector('#btn-zoom')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (LicenseManager.getInstance().isToolLocked('zoom')) {
        this.onAction('open-pro');
        return;
      }
      this.state.zoomEnabled = !this.state.zoomEnabled;
      this.onStateChange(this.state);
      this.render();
    });

    // Popover Toggles
    this.container.querySelector('#btn-style-popover')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.activePopover = this.activePopover === 'style' ? null : 'style';
      this.render();
    });

    this.container.querySelector('#btn-backdrop-popover')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.activePopover = this.activePopover === 'backdrop' ? null : 'backdrop';
      this.render();
    });

    // Style Popover events
    this.container.querySelectorAll('.color-swatch-compact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const color = (e.currentTarget as HTMLElement).dataset.color!;
        this.state.activeColor = color;
        this.onStateChange(this.state);
        this.render();
      });
    });

    const customColor = this.container.querySelector('#custom-color-input') as HTMLInputElement;
    customColor?.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = (e.target as HTMLInputElement).value;
      this.state.activeColor = val;
      this.onStateChange(this.state);
      const preview = this.container.querySelector('.stroke-preview-circle') as HTMLElement;
      if (preview) preview.style.background = val;
      const indicator = this.container.querySelector('.color-dot-indicator') as HTMLElement;
      if (indicator) indicator.style.backgroundColor = val;
    });

    customColor?.addEventListener('change', () => {
      this.render();
    });

    // Stroke slider inside popover
    const slider = this.container.querySelector('#size-slider') as HTMLInputElement;
    slider?.addEventListener('input', (e) => {
      e.stopPropagation();
      this.state.activeWidth = parseInt((e.target as HTMLInputElement).value, 10);
      this.onStateChange(this.state);
      const preview = this.container.querySelector('.stroke-preview-circle') as HTMLElement;
      if (preview) {
        const s = Math.max(6, Math.min(24, this.state.activeWidth));
        preview.style.width = `${s}px`;
        preview.style.height = `${s}px`;
      }
      const label = this.container.querySelector('.stroke-label') as HTMLElement;
      if (label) label.textContent = `${this.state.activeWidth}px`;
      const numIndicator = this.container.querySelector('.stroke-num') as HTMLElement;
      if (numIndicator) numIndicator.textContent = `${this.state.activeWidth}px`;
    });

    // Backdrop options inside popover
    this.container.querySelectorAll('.backdrop-option-btn[data-backdrop]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const backdrop = (e.currentTarget as HTMLElement).dataset.backdrop as BackdropType;
        this.state.backdrop = backdrop;
        this.onStateChange(this.state);
        this.activePopover = null;
        this.render();
      });
    });

    // Actions
    this.container.querySelector('#btn-snapshot')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.activePopover = null;
      this.onAction('snapshot');
    });

    this.container.querySelector('#btn-undo')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAction('undo');
    });

    this.container.querySelector('#btn-redo')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAction('redo');
    });

    this.container.querySelector('#btn-clear')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAction('clear');
    });

    this.container.querySelector('#btn-help')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAction('help');
    });

    this.container.querySelector('#btn-tray')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAction('hide-tray');
    });

    this.container.querySelector('#btn-collapse')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.collapse();
    });

    this.container.querySelector('#btn-quit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onAction('quit');
    });
  }

  private initDrag() {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    const onMouseDown = (e: MouseEvent) => {
      const handle = (e.target as HTMLElement).closest('.drag-handle, .toolbar-collapsed-pill');
      if (!handle) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.container.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      this.container.style.transition = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    };

    let hasTriggeredOffscreenSwitch = false;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Allow dragging off the screen edges slightly to trigger multi-monitor jump
      const rawLeft = initialLeft + dx;
      const rawTop = initialTop + dy;

      // If user drags aggressively off the left or right screen edge, trigger display switch
      if (!hasTriggeredOffscreenSwitch) {
        if (e.clientX <= 0 || e.clientX >= window.innerWidth - 1) {
          hasTriggeredOffscreenSwitch = true;
          this.onAction('switch-display');
          // Terminate drag cleanly as window moves to another monitor
          onMouseUp();
          return;
        }
      }

      const newLeft = Math.max(8, Math.min(window.innerWidth - this.container.offsetWidth - 8, rawLeft));
      const newTop = Math.max(8, Math.min(window.innerHeight - this.container.offsetHeight - 8, rawTop));

      this.container.style.left = `${newLeft}px`;
      this.container.style.top = `${newTop}px`;
      this.container.style.transform = 'none';
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      hasTriggeredOffscreenSwitch = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      // Smart Edge Snapping & Auto-Orientation
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const rect = this.container.getBoundingClientRect();
      let targetLeft = rect.left;
      let targetTop = rect.top;

      // 1. Drop near Left Bezel (< 85px) -> Snap to Vertical Dock on Left
      if (rect.left < 85) {
        if (this.orientation !== 'vertical') {
          this.orientation = 'vertical';
          this.state.toolbarOrientation = 'vertical';
          this.onStateChange(this.state);
          this.render();
        }
        targetLeft = 14;
        targetTop = Math.max(16, Math.min(screenH - this.container.offsetHeight - 16, targetTop));
      }
      // 2. Drop near Right Bezel (< 85px from right) -> Snap to Vertical Dock on Right
      else if (rect.right > screenW - 85) {
        if (this.orientation !== 'vertical') {
          this.orientation = 'vertical';
          this.state.toolbarOrientation = 'vertical';
          this.onStateChange(this.state);
          this.render();
        }
        targetLeft = screenW - this.container.offsetWidth - 14;
        targetTop = Math.max(16, Math.min(screenH - this.container.offsetHeight - 16, targetTop));
      }
      // 3. Drop near Top Bezel (< 85px from top) -> Snap to Horizontal Bar on Top
      else if (rect.top < 85) {
        if (this.orientation !== 'horizontal') {
          this.orientation = 'horizontal';
          this.state.toolbarOrientation = 'horizontal';
          this.onStateChange(this.state);
          this.render();
        }
        targetTop = 16;
        const centerX = targetLeft + this.container.offsetWidth / 2;
        if (Math.abs(centerX - screenW / 2) < 120) {
          targetLeft = Math.round((screenW - this.container.offsetWidth) / 2);
        } else {
          targetLeft = Math.max(12, Math.min(screenW - this.container.offsetWidth - 12, targetLeft));
        }
      }
      // 4. Drop near Bottom Bezel (< 85px from bottom) -> Snap to Horizontal Bar on Bottom
      else if (rect.bottom > screenH - 85) {
        if (this.orientation !== 'horizontal') {
          this.orientation = 'horizontal';
          this.state.toolbarOrientation = 'horizontal';
          this.onStateChange(this.state);
          this.render();
        }
        targetTop = screenH - this.container.offsetHeight - 16;
        const centerX = targetLeft + this.container.offsetWidth / 2;
        if (Math.abs(centerX - screenW / 2) < 120) {
          targetLeft = Math.round((screenW - this.container.offsetWidth) / 2);
        } else {
          targetLeft = Math.max(12, Math.min(screenW - this.container.offsetWidth - 12, targetLeft));
        }
      } else {
        targetLeft = Math.max(12, Math.min(screenW - this.container.offsetWidth - 12, targetLeft));
        targetTop = Math.max(12, Math.min(screenH - this.container.offsetHeight - 12, targetTop));
      }

      this.container.style.transition = 'left 0.22s cubic-bezier(0.16, 1, 0.3, 1), top 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
      this.container.style.left = `${targetLeft}px`;
      this.container.style.top = `${targetTop}px`;
      this.container.style.transform = 'none';

      this.state.toolbarPosition = { left: targetLeft, top: targetTop };
      this.onStateChange(this.state);

      setTimeout(() => {
        this.container.style.transition = '';
        this.notifyBounds();
      }, 240);
    };

    this.container.addEventListener('mousedown', onMouseDown);
  }
}
