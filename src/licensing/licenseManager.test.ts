import { describe, it, expect, beforeEach } from 'vitest';
import { LicenseManager } from './licenseManager';

describe('LicenseManager (Lemon Squeezy Integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    const mgr = LicenseManager.getInstance();
    mgr.reset();
  });

  it('initializes with free plan by default', () => {
    const mgr = LicenseManager.getInstance();
    expect(mgr.isPro()).toBe(false);
    expect(mgr.getState().licenseKey).toBeNull();
  });

  it('correctly identifies locked Pro tools on free plan', () => {
    const mgr = LicenseManager.getInstance();
    expect(mgr.isToolLocked('pen')).toBe(false);
    expect(mgr.isToolLocked('rect')).toBe(false);
    expect(mgr.isToolLocked('laser')).toBe(true);
    expect(mgr.isToolLocked('spotlight')).toBe(true);
    expect(mgr.isToolLocked('zoom')).toBe(true);
    expect(mgr.isToolLocked('blur')).toBe(true);
    expect(mgr.isToolLocked('step')).toBe(true);
  });

  it('activates Pro via demo key and unlocks all tools', async () => {
    const mgr = LicenseManager.getInstance();
    const result = await mgr.activate('INKOVA-PRO-DEMO');
    expect(result.success).toBe(true);
    expect(mgr.isPro()).toBe(true);
    expect(mgr.getState().licenseKey).toBe('INKOVA-PRO-DEMO');

    // All tools should now be unlocked
    expect(mgr.isToolLocked('laser')).toBe(false);
    expect(mgr.isToolLocked('spotlight')).toBe(false);
    expect(mgr.isToolLocked('zoom')).toBe(false);
    expect(mgr.isToolLocked('blur')).toBe(false);
    expect(mgr.isToolLocked('step')).toBe(false);
  });

  it('rejects empty license key', async () => {
    const mgr = LicenseManager.getInstance();
    const result = await mgr.activate('   ');
    expect(result.success).toBe(false);
    expect(mgr.isPro()).toBe(false);
  });

  it('deactivates license and re-locks Pro tools', async () => {
    const mgr = LicenseManager.getInstance();
    await mgr.activate('INKOVA-PRO-DEMO');
    expect(mgr.isPro()).toBe(true);

    const deact = await mgr.deactivate();
    expect(deact.success).toBe(true);
    expect(mgr.isPro()).toBe(false);
    expect(mgr.isToolLocked('spotlight')).toBe(true);
  });

  it('generates and persists device instance name', () => {
    const mgr = LicenseManager.getInstance();
    const name1 = mgr.getDeviceInstanceName();
    const name2 = mgr.getDeviceInstanceName();
    expect(name1).toBe(name2);
    expect(name1.startsWith('Inkova-PC-')).toBe(true);
  });
});
