import { describe, it, expect, vi } from 'vitest';
import { HotkeyManager, eventToShortcutKey } from './hotkeys';
import { DEFAULT_SHORTCUTS } from '../types';

describe('eventToShortcutKey', () => {
  it('parses single character keys accurately', () => {
    const e = new KeyboardEvent('keydown', { key: 'p', code: 'KeyP' });
    expect(eventToShortcutKey(e)).toBe('p');
  });

  it('parses keys with modifier combos like ctrl+shift+z or ctrl+z', () => {
    const eCtrlZ = new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(eventToShortcutKey(eCtrlZ)).toBe('ctrl+z');

    const eShift = new KeyboardEvent('keydown', { key: 'p', code: 'KeyP', ctrlKey: true, shiftKey: true });
    expect(eventToShortcutKey(eShift)).toBe('ctrl+shift+p');
  });

  it('handles space and escape keys correctly', () => {
    const eSpace = new KeyboardEvent('keydown', { key: ' ', code: 'Space' });
    expect(eventToShortcutKey(eSpace)).toBe('space');

    const eEsc = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' });
    expect(eventToShortcutKey(eEsc)).toBe('escape');
  });

  it('returns empty string for bare modifier keys', () => {
    const eShift = new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft' });
    expect(eventToShortcutKey(eShift)).toBe('');

    const eCtrl = new KeyboardEvent('keydown', { key: 'Control', code: 'ControlLeft' });
    expect(eventToShortcutKey(eCtrl)).toBe('');
  });
});

describe('HotkeyManager dynamic shortcut customization', () => {
  it('triggers tool selection based on customized shortcuts', () => {
    const onToolSelect = vi.fn();
    const onAction = vi.fn();

    const customShortcuts = {
      ...DEFAULT_SHORTCUTS,
      pen: 'y', // custom key for pen instead of 'p'
      laser: 'w' // custom key for laser instead of 'l'
    };

    const manager = new HotkeyManager({
      shortcuts: customShortcuts,
      onToolSelect,
      onAction,
      onTemporaryGlass: vi.fn(),
      onRadialToggle: vi.fn(),
      onColorIndex: vi.fn(),
      onSizeDelta: vi.fn()
    });

    // Press custom key 'y'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', code: 'KeyY' }));
    expect(onToolSelect).toHaveBeenCalledWith('pen');

    // Press custom key 'w'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW' }));
    expect(onToolSelect).toHaveBeenCalledWith('laser');
    expect(manager.getShortcuts().pen).toBe('y');
  });

  it('dynamically updates keybindings via updateShortcuts', () => {
    const onToolSelect = vi.fn();
    const onAction = vi.fn();

    const manager = new HotkeyManager({
      shortcuts: { ...DEFAULT_SHORTCUTS },
      onToolSelect,
      onAction,
      onTemporaryGlass: vi.fn(),
      onRadialToggle: vi.fn(),
      onColorIndex: vi.fn(),
      onSizeDelta: vi.fn()
    });

    // Initially 'h' triggers highlighter
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH' }));
    expect(onToolSelect).toHaveBeenCalledWith('highlighter');
    onToolSelect.mockClear();

    // Rebind highlighter to 'j'
    manager.updateShortcuts({
      ...DEFAULT_SHORTCUTS,
      highlighter: 'j'
    });

    // Pressing 'j' now triggers highlighter
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', code: 'KeyJ' }));
    expect(onToolSelect).toHaveBeenCalledWith('highlighter');
    expect(manager.getShortcuts().highlighter).toBe('j');
  });

  it('triggers actions when user-configured action shortcut is pressed', () => {
    const onToolSelect = vi.fn();
    const onAction = vi.fn();

    const manager = new HotkeyManager({
      shortcuts: {
        ...DEFAULT_SHORTCUTS,
        clear: 'k' // custom key for clear
      },
      onToolSelect,
      onAction,
      onTemporaryGlass: vi.fn(),
      onRadialToggle: vi.fn(),
      onColorIndex: vi.fn(),
      onSizeDelta: vi.fn()
    });

    // Press 'k'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK' }));
    expect(onAction).toHaveBeenCalledWith('clear');
    expect(manager.getShortcuts().clear).toBe('k');
  });
});
