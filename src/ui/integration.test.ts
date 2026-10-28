import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Toolbar } from './toolbar';
import { HotkeyManager } from './hotkeys';
import { DEFAULT_SHORTCUTS, AppState } from '../types';

describe('End-to-End Shortcuts and Toolbar Integration', () => {
  let container: HTMLElement;
  let state: AppState;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);

    state = {
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
      shortcuts: { ...DEFAULT_SHORTCUTS }
    };
  });

  it('renders toolbar with initial default shortcut keycaps', () => {
    const toolbar = new Toolbar(
      container,
      state,
      (s) => { state = s; },
      vi.fn()
    );
    expect(toolbar).toBeDefined();

    const penBtn = container.querySelector('[data-tool="pen"]') as HTMLElement;
    expect(penBtn).not.toBeNull();
    expect(penBtn.title).toContain('[P]');
    expect(penBtn.querySelector('.tool-keycap')?.textContent).toBe('P');

    const laserBtn = container.querySelector('[data-tool="laser"]') as HTMLElement;
    expect(laserBtn.title).toContain('[L]');
    expect(laserBtn.querySelector('.tool-keycap')?.textContent).toBe('L');
  });

  it('dynamically updates toolbar tooltips and keycaps when shortcuts change', () => {
    const toolbar = new Toolbar(
      container,
      state,
      (s) => { state = s; },
      vi.fn()
    );

    // Update state with customized shortcuts: pen -> 'Y', laser -> 'W'
    toolbar.updateState({
      shortcuts: {
        ...state.shortcuts,
        pen: 'y',
        laser: 'w'
      }
    });

    const penBtn = container.querySelector('[data-tool="pen"]') as HTMLElement;
    expect(penBtn.title).toContain('[Y]');
    expect(penBtn.querySelector('.tool-keycap')?.textContent).toBe('Y');

    const laserBtn = container.querySelector('[data-tool="laser"]') as HTMLElement;
    expect(laserBtn.title).toContain('[W]');
    expect(laserBtn.querySelector('.tool-keycap')?.textContent).toBe('W');
  });

  it('coordinates HotkeyManager and Toolbar to trigger custom shortcuts', () => {
    const onToolSelect = vi.fn((tool) => {
      state.currentTool = tool;
      toolbar.updateState({ currentTool: tool });
    });

    const toolbar = new Toolbar(
      container,
      state,
      (s) => { state = s; },
      vi.fn()
    );

    const hotkeyManager = new HotkeyManager({
      shortcuts: state.shortcuts,
      onToolSelect,
      onAction: vi.fn(),
      onTemporaryGlass: vi.fn(),
      onRadialToggle: vi.fn(),
      onColorIndex: vi.fn(),
      onSizeDelta: vi.fn()
    });

    // Rebind highlighter to 'j'
    const updatedShortcuts = {
      ...state.shortcuts,
      highlighter: 'j'
    };
    hotkeyManager.updateShortcuts(updatedShortcuts);
    toolbar.updateState({ shortcuts: updatedShortcuts });

    // Press 'j'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', code: 'KeyJ' }));
    expect(onToolSelect).toHaveBeenCalledWith('highlighter');

    // Check toolbar has updated keycap
    const hlBtn = container.querySelector('[data-tool="highlighter"]') as HTMLElement;
    expect(hlBtn.title).toContain('[J]');
    expect(hlBtn.querySelector('.tool-keycap')?.textContent).toBe('J');
  });

  it('defaults toolbar to left vertical dock avoiding the middle of the screen', () => {
    const toolbar = new Toolbar(
      container,
      state,
      (s) => { state = s; },
      vi.fn()
    );
    expect(toolbar).toBeDefined();

    expect(container.className).toContain('orientation-vertical');
    expect(container.style.left).toBe('16px');
    expect(container.style.top).toBe('36px');
    expect(container.style.transform).toBe('none');
  });

  it('restores user preferred toolbarPosition and orientation when provided', () => {
    state.toolbarOrientation = 'vertical';
    state.toolbarPosition = { left: 24, top: 80 };

    const toolbar = new Toolbar(
      container,
      state,
      (s) => { state = s; },
      vi.fn()
    );
    expect(toolbar).toBeDefined();

    expect(container.className).toContain('orientation-vertical');
    expect(container.style.left).toBe('24px');
    expect(container.style.top).toBe('80px');
  });
});
