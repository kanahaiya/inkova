import { describe, it, expect, beforeEach } from 'vitest';
import { DiagnosticsManager } from './telemetry';

describe('DiagnosticsManager (Observability)', () => {
  beforeEach(() => {
    localStorage.clear();
    const mgr = DiagnosticsManager.getInstance();
    mgr.clearLogs();
  });

  it('maintains a singleton instance and initializes properly', () => {
    const instance1 = DiagnosticsManager.getInstance();
    const instance2 = DiagnosticsManager.getInstance();
    expect(instance1).toBe(instance2);

    instance1.init('0.1.6');
    const logs = instance1.getLogs();
    expect(logs.some(l => l.message.includes('Inkova v0.1.6 initialized'))).toBe(true);
  });

  it('records logs with level, category, timestamp, and details', () => {
    const mgr = DiagnosticsManager.getInstance();
    mgr.log('warn', 'ui', 'Toolbar dragged off-screen bounds', { x: -10, y: 50 });

    const logs = mgr.getLogs();
    const last = logs[logs.length - 1];
    expect(last.level).toBe('warn');
    expect(last.category).toBe('ui');
    expect(last.message).toBe('Toolbar dragged off-screen bounds');
    expect(last.details?.x).toBe(-10);
    expect(last.timestamp).toBeDefined();
  });

  it('enforces circular buffer limit of MAX_LOG_ENTRIES', () => {
    const mgr = DiagnosticsManager.getInstance();
    for (let i = 0; i < 75; i++) {
      mgr.log('info', 'perf', `Frame drop ${i}`);
    }

    const logs = mgr.getLogs();
    expect(logs.length).toBeLessThanOrEqual(60);
    expect(logs[logs.length - 1].message).toBe('Frame drop 74');
  });

  it('captures errors properly via trackError', () => {
    const mgr = DiagnosticsManager.getInstance();
    const testErr = new Error('Simulated renderer failure');
    mgr.trackError('canvas', testErr, { strokeCount: 15 });

    const logs = mgr.getLogs();
    const errLog = logs.find(l => l.level === 'error' && l.message.includes('Simulated renderer failure'));
    expect(errLog).toBeDefined();
    expect(errLog?.details?.strokeCount).toBe(15);
    expect(errLog?.details?.stack).toBeDefined();
  });

  it('supports telemetry opt-in toggle and persists in localStorage', () => {
    const mgr = DiagnosticsManager.getInstance();
    expect(mgr.isTelemetryOptedIn()).toBe(true);

    mgr.setTelemetryOptIn(false);
    expect(mgr.isTelemetryOptedIn()).toBe(false);
    expect(localStorage.getItem('inkova_telemetry_optin')).toBe('false');

    // With telemetry disabled, trackEvent should not append logs
    const countBefore = mgr.getLogs().length;
    mgr.trackEvent('test_event_suppressed', { value: 123 });
    const countAfter = mgr.getLogs().length;
    expect(countAfter).toBe(countBefore);

    // Re-enable
    mgr.setTelemetryOptIn(true);
    expect(mgr.isTelemetryOptedIn()).toBe(true);
    mgr.trackEvent('test_event_recorded', { value: 456 });
    const countFinal = mgr.getLogs().length;
    expect(countFinal).toBeGreaterThan(countAfter);
  });

  it('exports structured diagnostics JSON containing system info and logs', () => {
    const mgr = DiagnosticsManager.getInstance();
    mgr.log('info', 'system', 'Test log for export');
    const dump = mgr.exportDiagnostics();

    expect(typeof dump).toBe('string');
    const parsed = JSON.parse(dump);
    expect(parsed.system).toBeDefined();
    expect(parsed.system.appVersion).toBeDefined();
    expect(Array.isArray(parsed.recentLogs)).toBe(true);
    expect(parsed.recentLogs.some((l: any) => l.message === 'Test log for export')).toBe(true);
  });

  it('clears logs and removes them from localStorage', () => {
    const mgr = DiagnosticsManager.getInstance();
    mgr.log('info', 'perf', 'Log to be cleared');
    expect(mgr.getLogs().length).toBeGreaterThan(0);

    mgr.clearLogs();
    // After clear, only the "Diagnostics logs cleared by user" info log should remain
    const logs = mgr.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].message).toContain('cleared by user');
  });

  it('handles canvas contextlost and contextrestored events', () => {
    const mgr = DiagnosticsManager.getInstance();
    const canvas = document.createElement('canvas');
    mgr.attachCanvasListeners(canvas);

    // Dispatch synthetic contextlost
    const lostEvent = new Event('contextlost', { cancelable: true });
    canvas.dispatchEvent(lostEvent);

    let logs = mgr.getLogs();
    expect(logs.some(l => l.category === 'canvas' && l.message.includes('context was lost'))).toBe(true);

    // Dispatch synthetic contextrestored
    const restoredEvent = new Event('contextrestored');
    canvas.dispatchEvent(restoredEvent);

    logs = mgr.getLogs();
    expect(logs.some(l => l.category === 'canvas' && l.message.includes('restored successfully'))).toBe(true);
  });
});
