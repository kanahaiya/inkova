import { ToolType, DEFAULT_SHORTCUTS } from '../types';

export function eventToShortcutKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey && (e.ctrlKey || e.altKey || e.metaKey)) parts.push('shift');

  const key = e.key.toLowerCase();
  if (['control', 'alt', 'shift', 'meta'].includes(key)) {
    return '';
  }

  if (e.code === 'Space') {
    parts.push('space');
  } else if (e.code === 'Escape') {
    parts.push('escape');
  } else {
    parts.push(key);
  }

  return parts.join('+');
}

export type ActionType = 'undo' | 'redo' | 'clear' | 'toggle-glass' | 'spotlight' | 'zoom' | 'snapshot' | 'escape' | 'help' | 'toggle-tray' | 'hide-tray' | 'toggle-orientation' | 'switch-display' | 'quit';

export class HotkeyManager {
  private onToolSelect: (tool: ToolType) => void;
  private onAction: (action: ActionType) => void;
  private onTemporaryGlass: (active: boolean, shouldFocus?: boolean) => void;
  private onRadialToggle: (active: boolean) => void;
  private onColorIndex: (index: number) => void;
  private onSizeDelta: (delta: number) => void;

  private shortcuts: Record<string, string> = { ...DEFAULT_SHORTCUTS };
  private shortcutLookup = new Map<string, string>();

  private isSpaceHeld = false;
  private isTabHeld = false;

  constructor(options: {
    onToolSelect: (tool: ToolType) => void;
    onAction: (action: ActionType) => void;
    onTemporaryGlass: (active: boolean, shouldFocus?: boolean) => void;
    onRadialToggle: (active: boolean) => void;
    onColorIndex: (index: number) => void;
    onSizeDelta: (delta: number) => void;
    shortcuts?: Record<string, string>;
  }) {
    this.onToolSelect = options.onToolSelect;
    this.onAction = options.onAction;
    this.onTemporaryGlass = options.onTemporaryGlass;
    this.onRadialToggle = options.onRadialToggle;
    this.onColorIndex = options.onColorIndex;
    this.onSizeDelta = options.onSizeDelta;

    this.updateShortcuts(options.shortcuts || DEFAULT_SHORTCUTS);
    this.attach();
    this.registerGlobalShortcuts();
  }

  public updateShortcuts(shortcuts: Record<string, string>) {
    this.shortcuts = { ...DEFAULT_SHORTCUTS, ...shortcuts };
    this.shortcutLookup.clear();
    for (const [action, key] of Object.entries(this.shortcuts)) {
      if (key) {
        this.shortcutLookup.set(key.toLowerCase().trim(), action);
      }
    }
  }

  public getShortcuts(): Record<string, string> {
    return { ...this.shortcuts };
  }

  private async registerGlobalShortcuts() {
    try {
      if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
        const { register, unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');

        // Unregister existing shortcuts first to avoid collision errors across reloads
        try {
          await unregisterAll();
        } catch {}

        // Global shortcut to toggle Glass pass-through mode
        await register('CommandOrControl+Shift+G', (event) => {
          if (event.state === 'Pressed') {
            this.onAction('toggle-glass');
          }
        });

        // Global shortcut to toggle Show / Hide to System Tray
        await register('CommandOrControl+Shift+H', (event) => {
          if (event.state === 'Pressed') {
            this.onAction('toggle-tray');
          }
        });

        // Global shortcut to clear canvas
        await register('CommandOrControl+Shift+C', (event) => {
          if (event.state === 'Pressed') {
            this.onAction('clear');
          }
        });

        // Global shortcut to escape/reset and focus drawing
        await register('CommandOrControl+Shift+A', (event) => {
          if (event.state === 'Pressed') {
            this.onAction('escape');
          }
        });

        // Global shortcut to switch to next display screen
        await register('CommandOrControl+Shift+D', (event) => {
          if (event.state === 'Pressed') {
            this.onAction('switch-display');
          }
        });

        // Global emergency shortcut to quit Inkova from anywhere
        await register('CommandOrControl+Shift+Q', (event) => {
          if (event.state === 'Pressed') {
            this.onAction('quit');
          }
        });
      }
    } catch (err) {
      console.warn('Global shortcuts registration skipped or unavailable:', err);
    }
  }

  private attach() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger hotkeys if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Hold Space for Temporary Glass (Click-Through)
      if (e.code === 'Space' && !e.repeat && !this.isSpaceHeld) {
        this.isSpaceHeld = true;
        this.onTemporaryGlass(true);
        e.preventDefault();
        return;
      }

      // Hold Tab for Radial Menu
      if (e.code === 'Tab' && !e.repeat && !this.isTabHeld) {
        this.isTabHeld = true;
        this.onRadialToggle(true);
        e.preventDefault();
        return;
      }

      // Match dynamic user-defined shortcuts
      const pressedShortcut = eventToShortcutKey(e);
      if (pressedShortcut && this.shortcutLookup.has(pressedShortcut)) {
        const target = this.shortcutLookup.get(pressedShortcut)!;
        const tools: ToolType[] = ['pen', 'highlighter', 'laser', 'arrow', 'line', 'rect', 'circle', 'step', 'blur', 'text', 'eraser'];
        if (tools.includes(target as ToolType)) {
          this.onToolSelect(target as ToolType);
          e.preventDefault();
          return;
        }

        const actions = ['undo', 'redo', 'clear', 'toggle-glass', 'spotlight', 'zoom', 'snapshot', 'escape', 'help', 'toggle-tray', 'hide-tray', 'toggle-orientation', 'quit'];
        if (actions.includes(target)) {
          this.onAction(target as any);
          e.preventDefault();
          return;
        }
      }

      // System Emergency Fallbacks
      // Exit / Quit Hotkey (Alt+F4 or Ctrl+Q)
      if ((e.altKey && e.key === 'F4') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q')) {
        this.onAction('quit');
        e.preventDefault();
        return;
      }

      // Escape reset
      if (e.key === 'Escape') {
        this.onAction('escape');
        e.preventDefault();
        return;
      }

      // Quick Color Digits (1..8)
      if (e.key >= '1' && e.key <= '8' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        this.onColorIndex(parseInt(e.key, 10) - 1);
        return;
      }

      // Quick Stroke Width Adjustments ([ / ])
      if (e.key === '[') {
        this.onSizeDelta(-2);
        return;
      }
      if (e.key === ']') {
        this.onSizeDelta(2);
        return;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && this.isSpaceHeld) {
        this.isSpaceHeld = false;
        this.onTemporaryGlass(false);
        e.preventDefault();
      }

      if (e.code === 'Tab' && this.isTabHeld) {
        this.isTabHeld = false;
        this.onRadialToggle(false);
        e.preventDefault();
      }
    });

    window.addEventListener('blur', () => {
      if (this.isSpaceHeld) {
        this.isSpaceHeld = false;
        this.onTemporaryGlass(false, false);
      }
      if (this.isTabHeld) {
        this.isTabHeld = false;
        this.onRadialToggle(false);
      }
    });
  }
}
