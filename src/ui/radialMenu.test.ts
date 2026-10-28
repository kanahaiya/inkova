import { describe, it, expect, beforeEach } from 'vitest';
import { RadialMenu } from './radialMenu';
import { ToolType } from '../types';

describe('RadialMenu', () => {
  let container: HTMLDivElement;
  let selectedTool: ToolType | null = null;
  let menu: RadialMenu;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    // Mock getBoundingClientRect so width and height are 220px, positioned at (200, 200)
    container.getBoundingClientRect = () => ({
      x: 90,
      y: 90,
      width: 220,
      height: 220,
      top: 90,
      right: 310,
      bottom: 310,
      left: 90,
      toJSON: () => {}
    });

    selectedTool = null;
    menu = new RadialMenu(container, (t) => {
      selectedTool = t;
    });
  });

  it('renders closed initially and opens at specified coordinates', () => {
    expect(menu.isMenuOpen()).toBe(false);
    menu.open(200, 200);
    expect(menu.isMenuOpen()).toBe(true);
    expect(container.classList.contains('hidden')).toBe(false);
  });

  it('ignores cursor movement inside the dead zone (< 24px from center)', () => {
    menu.open(200, 200);
    // Center is (90 + 110, 90 + 110) = (200, 200)
    menu.updateCursor(205, 205); // distance sqrt(25+25) ~ 7px < 24px
    const closedTool = menu.close();
    expect(closedTool).toBeNull();
    expect(selectedTool).toBeNull();
  });

  it('selects option when moving cursor outside dead zone', () => {
    menu.open(200, 200);
    // Move up from center (200, 120), dy = -80, angle = 0 -> Pen
    menu.updateCursor(200, 120);
    const closedTool = menu.close();
    expect(closedTool).toBe('pen');
    expect(selectedTool).toBe('pen');
  });

  it('cancels without selecting any tool even if cursor moved outside dead zone', () => {
    menu.open(200, 200);
    menu.updateCursor(200, 120);
    menu.cancel();
    expect(menu.isMenuOpen()).toBe(false);
    expect(selectedTool).toBeNull();
    expect(container.classList.contains('hidden')).toBe(true);
  });
});
