import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiagnosticsManager } from './observability/telemetry';
import { LicenseManager } from './licensing/licenseManager';
import { InkovaApp } from './main';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === 'get_current_display_scale') return Promise.resolve(1.0);
    if (cmd === 'get_available_displays') return Promise.resolve([
      { id: 0, name: 'Primary Display', width: 1920, height: 1080, scale_factor: 1.0, is_current: true }
    ]);
    if (cmd === 'update_toolbar_bounds') return Promise.resolve();
    if (cmd === 'set_click_through') return Promise.resolve();
    return Promise.resolve();
  })
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {})
}));

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn().mockResolvedValue(null)
}));

describe('Inkova End-to-End Application Workflow Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';

    // Mock HTMLCanvasElement 2D context methods
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
      setTransform: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
      putImageData: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      setLineDash: vi.fn(),
      getLineDash: vi.fn().mockReturnValue([]),
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 2,
      strokeStyle: '#000000',
      fillStyle: '#000000',
      globalAlpha: 1.0,
      globalCompositeOperation: 'source-over'
    }) as any;

    // Reset license to clean free tier
    LicenseManager.getInstance().reset();

    // Instantiate fresh InkovaApp
    new InkovaApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('initializes Inkova with all canvases, toolbar, and diagnostic tracking', () => {
    const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    const fxCanvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
    const toolbar = document.getElementById('toolbar-container');
    const modal = document.getElementById('help-modal');

    expect(mainCanvas).not.toBeNull();
    expect(fxCanvas).not.toBeNull();
    expect(toolbar).not.toBeNull();
    expect(modal).not.toBeNull();
    expect(modal?.classList.contains('hidden')).toBe(true);

    const diagnostics = DiagnosticsManager.getInstance();
    expect(diagnostics.getSystemInfo().appVersion).toBe('0.1.9');
    expect(diagnostics.getLogs().length).toBeGreaterThan(0);
  });

  it('allows selecting tools, changing colors and drawing on the canvas', () => {
    const penBtn = document.querySelector('[data-tool="pen"]') as HTMLElement;
    expect(penBtn).not.toBeNull();
    penBtn.click();

    // Verify Pen tool is active
    expect(penBtn.classList.contains('active')).toBe(true);

    // Open style popover and select a color swatch
    const styleBtn = document.querySelector('#btn-style-popover') as HTMLElement;
    expect(styleBtn).not.toBeNull();
    styleBtn.click();

    const swatches = document.querySelectorAll('.color-swatch-compact') as NodeListOf<HTMLElement>;
    expect(swatches.length).toBeGreaterThan(1);
    swatches[1].click();

    // Simulate mouse drawing stroke on main canvas
    const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    mainCanvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0 }));
    mainCanvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 120, button: 0 }));
    mainCanvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150, button: 0 }));
    mainCanvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 200, clientY: 150, button: 0 }));

    // Test Undo action
    const undoBtn = document.querySelector('#btn-undo') as HTMLElement;
    expect(undoBtn).not.toBeNull();
    undoBtn.click();

    // Test Redo action
    const redoBtn = document.querySelector('#btn-redo') as HTMLElement;
    expect(redoBtn).not.toBeNull();
    redoBtn.click();

    // Test Clear action
    const clearBtn = document.querySelector('#btn-clear') as HTMLElement;
    expect(clearBtn).not.toBeNull();
    clearBtn.click();
  });

  it('gates Pro tools when on free tier and opens Pro modal with license info', () => {
    const license = LicenseManager.getInstance();
    expect(license.isPro()).toBe(false);

    // Clicking Laser (Pro tool) should trigger Pro Modal
    const laserBtn = document.querySelector('[data-tool="laser"]') as HTMLElement;
    expect(laserBtn).not.toBeNull();
    expect(laserBtn.classList.contains('pro-tool')).toBe(true);
    laserBtn.click();

    // Check modal is now visible and active tab is 'license'
    const modal = document.getElementById('help-modal');
    expect(modal?.classList.contains('hidden')).toBe(false);

    const licenseTab = modal?.querySelector('#tab-license');
    expect(licenseTab?.classList.contains('active')).toBe(true);

    const heroCard = modal?.querySelector('.license-hero-card');
    expect(heroCard).not.toBeNull();
    expect(heroCard?.textContent).toContain('Inkova Pro');
    expect(heroCard?.textContent).toContain('$29');
  });

  it('switches between all 4 settings modal tabs cleanly', () => {
    // Open modal via help button
    const helpBtn = document.querySelector('#btn-help') as HTMLElement;
    expect(helpBtn).not.toBeNull();
    helpBtn.click();

    const modal = document.getElementById('help-modal')!;
    expect(modal.classList.contains('hidden')).toBe(false);

    // Tab 1: Customize
    const customizeTab = modal.querySelector('#tab-customize') as HTMLElement;
    customizeTab.click();
    expect(modal.querySelector('#tab-customize')?.classList.contains('active')).toBe(true);
    expect(modal.textContent).toContain('Drawing & Annotating Tools');

    // Tab 2: Cheatsheet
    const cheatsheetTab = modal.querySelector('#tab-cheatsheet') as HTMLElement;
    cheatsheetTab.click();
    expect(modal.querySelector('#tab-cheatsheet')?.classList.contains('active')).toBe(true);
    expect(modal.textContent).toContain('Drawing Tools');

    // Tab 3: Diagnostics
    const diagTab = modal.querySelector('#tab-diagnostics') as HTMLElement;
    diagTab.click();
    expect(modal.querySelector('#tab-diagnostics')?.classList.contains('active')).toBe(true);
    expect(modal.textContent).toContain('Activity & Crash Log Buffer');
    expect(modal.textContent).toContain('Copy System Report');

    // Tab 4: License & Pro
    const licenseTab = modal.querySelector('#tab-license') as HTMLElement;
    licenseTab.click();
    expect(modal.querySelector('#tab-license')?.classList.contains('active')).toBe(true);
    expect(modal.textContent).toContain('Inkova Pro Edition');
  });

  it('successfully activates Pro license and unlocks all Pro tools', async () => {
    // Open Pro modal by clicking laser
    const laserBtnInitial = document.querySelector('[data-tool="laser"]') as HTMLElement;
    laserBtnInitial.click();

    const modal = document.getElementById('help-modal')!;
    const licenseInput = modal.querySelector('#input-license-key') as HTMLInputElement;
    const activateBtn = modal.querySelector('#btn-activate-license') as HTMLButtonElement;

    expect(licenseInput).not.toBeNull();
    expect(activateBtn).not.toBeNull();

    // Enter test demo bypass key
    licenseInput.value = 'INKOVA-PRO-DEMO';
    activateBtn.click();

    // Wait for async activation and the 1200ms re-render timeout
    await new Promise((r) => setTimeout(r, 1300));

    const license = LicenseManager.getInstance();
    expect(license.isPro()).toBe(true);
    expect(license.getState().licenseKey).toBe('INKOVA-PRO-DEMO');

    // Close modal via close button
    const closeBtn = modal.querySelector('#btn-close-help') as HTMLElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(modal.classList.contains('hidden')).toBe(true);

    // Query fresh laser button from re-rendered toolbar
    const laserBtnUnlocked = document.querySelector('[data-tool="laser"]') as HTMLElement;
    expect(laserBtnUnlocked).not.toBeNull();
    expect(laserBtnUnlocked.classList.contains('pro-tool')).toBe(false);

    // Now clicking Laser activates it without triggering modal
    laserBtnUnlocked.click();
    expect(modal.classList.contains('hidden')).toBe(true);

    // After toolbar renders upon selection, the active class is on the active button
    const activeLaserBtn = document.querySelector('[data-tool="laser"]') as HTMLElement;
    expect(activeLaserBtn.classList.contains('active')).toBe(true);
  });
});
