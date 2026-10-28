import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasEngine } from './canvas';
import { Stroke } from '../types';

describe('CanvasEngine', () => {
  let mainCanvas: HTMLCanvasElement;
  let fxCanvas: HTMLCanvasElement;
  let engine: CanvasEngine;

  const createMockContext = () => ({
    scale: () => {},
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    strokeRect: () => {},
    rect: () => {},
    roundRect: () => {},
    measureText: () => ({ width: 60 }),
    fillText: () => {},
    drawImage: () => {},
    clip: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} })
  });

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = () => createMockContext() as any;
    mainCanvas = document.createElement('canvas');
    fxCanvas = document.createElement('canvas');
    engine = new CanvasEngine(mainCanvas, fxCanvas);
  });

  it('initializes with transparent backdrop and preserves backdrop on resize', () => {
    expect(engine.getBackdrop()).toBe('transparent');

    engine.setBackdrop('whiteboard');
    expect(engine.getBackdrop()).toBe('whiteboard');

    // Trigger resize
    engine.handleResize();
    expect(engine.getBackdrop()).toBe('whiteboard');
  });

  it('erases stroke when eraser intersects segment between discrete points', () => {
    // Horizontal line stroke from (0, 50) to (100, 50) with only 2 endpoints
    const stroke: Stroke = {
      id: 'test-line',
      type: 'line',
      points: [{ x: 0, y: 50 }, { x: 100, y: 50 }],
      color: '#ef4444',
      width: 4
    };

    engine.addStroke(stroke);
    expect(engine.getStrokes().length).toBe(1);

    // Eraser hits at midpoint (50, 52), where no point exists in stroke.points except by segment interpolation
    const erased = engine.eraseAt({ x: 50, y: 52 }, 10);
    expect(erased).toBe(true);
    expect(engine.getStrokes().length).toBe(0);
  });

  it('erases rectangle when intersecting edges', () => {
    const stroke: Stroke = {
      id: 'test-rect',
      type: 'rect',
      points: [{ x: 20, y: 20 }, { x: 100, y: 100 }],
      color: '#ef4444',
      width: 4
    };

    engine.addStroke(stroke);
    expect(engine.getStrokes().length).toBe(1);

    // Hit top edge at (60, 20)
    const erased = engine.eraseAt({ x: 60, y: 20 }, 10);
    expect(erased).toBe(true);
    expect(engine.getStrokes().length).toBe(0);
  });

  it('preserves backdrop when erasing strokes', () => {
    engine.setBackdrop('blackboard');
    const stroke: Stroke = {
      id: 'test',
      type: 'pen',
      points: [{ x: 10, y: 10 }],
      color: '#ef4444',
      width: 4
    };
    engine.addStroke(stroke);

    engine.eraseAt({ x: 10, y: 10 }, 20);
    expect(engine.getBackdrop()).toBe('blackboard');
  });

  it('restores strokes and preserves active backdrop on setStrokes', () => {
    engine.setBackdrop('whiteboard');
    const stroke: Stroke = {
      id: 'test-undo',
      type: 'pen',
      points: [{ x: 50, y: 50 }],
      color: '#10b981',
      width: 4
    };
    engine.addStroke(stroke);
    const initialStrokes = [...engine.getStrokes()];

    engine.eraseAt({ x: 50, y: 50 }, 10);
    expect(engine.getStrokes().length).toBe(0);

    // Simulate undo: restore initial strokes
    engine.setStrokes(initialStrokes);
    expect(engine.getStrokes().length).toBe(1);
    expect(engine.getStrokes()[0].id).toBe('test-undo');
    expect(engine.getBackdrop()).toBe('whiteboard');
  });

  it('correctly adds and erases step badge stroke', () => {
    const stepStroke: Stroke = {
      id: 'step-1',
      type: 'step',
      points: [{ x: 100, y: 100 }],
      color: '#3b82f6',
      width: 6,
      stepNumber: 1
    };
    engine.addStroke(stepStroke);
    expect(engine.getStrokes().length).toBe(1);

    // Hit test step badge center
    const erased = engine.eraseAt({ x: 102, y: 102 }, 15);
    expect(erased).toBe(true);
    expect(engine.getStrokes().length).toBe(0);
  });

  it('renders text stroke gracefully with or without roundRect support', () => {
    let roundRectCalled = false;
    let rectCalled = false;

    const mockCtx = createMockContext();
    mockCtx.roundRect = () => { roundRectCalled = true; };
    mockCtx.rect = () => { rectCalled = true; };

    const textStroke: Stroke = {
      id: 'text-1',
      type: 'text',
      points: [{ x: 50, y: 50 }],
      color: '#ffffff',
      width: 6,
      text: 'Note 1'
    };

    engine.renderSingleStroke(mockCtx as any, textStroke);
    expect(roundRectCalled).toBe(true);
    expect(rectCalled).toBe(false);

    // Now test fallback when roundRect is undefined
    (mockCtx as any).roundRect = undefined;
    engine.renderSingleStroke(mockCtx as any, textStroke);
    expect(rectCalled).toBe(true);
  });

  it('manages multi-stroke iPhone laser pointer lifecycle independently', () => {
    // Start first stroke (e.g. writing "3")
    engine.startLaserStroke(10, 10, '#ef4444', 8);
    engine.addLaserPoint(15, 20);
    engine.addLaserPoint(20, 30);
    engine.endLaserStroke();

    // Start second independent stroke (e.g. writing ">")
    engine.startLaserStroke(40, 10, '#ef4444', 8);
    engine.addLaserPoint(50, 20);
    engine.addLaserPoint(40, 30);
    engine.endLaserStroke();

    // Verify snapshot captures both independent strokes without cross-contamination
    let strokeCount = 0;
    const mockCtx = createMockContext();
    mockCtx.stroke = () => { strokeCount++; };

    engine.renderLaserSnapshot(mockCtx as any);
    // Each stroke renders in 3 passes (bloom, halo, core)
    expect(strokeCount).toBeGreaterThanOrEqual(6);

    // Test clearLaserStrokes
    engine.clearLaserStrokes();
    strokeCount = 0;
    engine.renderLaserSnapshot(mockCtx as any);
    expect(strokeCount).toBe(0);
  });

  it('renders neon stroke with exact 3-layer iPhone glow (bloom, halo, core)', () => {
    let strokePasses = 0;
    const mockCtx = createMockContext();
    mockCtx.stroke = () => { strokePasses++; };

    const neonStroke: Stroke = {
      id: 'neon-test',
      type: 'pen',
      points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
      color: '#ef4444',
      width: 8,
      neonGlow: true
    };

    engine.renderSingleStroke(mockCtx as any, neonStroke);
    // 3 passes: Layer 1 (Bloom), Layer 2 (Halo), Layer 3 (White Core)
    expect(strokePasses).toBe(3);
  });

  it('renders blur stroke as clean redaction mask without text watermark', () => {
    let fillTextCalled = false;
    let fillRectCalled = false;
    let strokeRectCalled = false;

    const mockCtx = createMockContext();
    mockCtx.fillText = () => { fillTextCalled = true; };
    mockCtx.fillRect = () => { fillRectCalled = true; };
    mockCtx.strokeRect = () => { strokeRectCalled = true; };

    const blurStroke: Stroke = {
      id: 'blur-test',
      type: 'blur',
      points: [{ x: 10, y: 10 }, { x: 100, y: 100 }],
      color: '#000000',
      width: 4
    };

    engine.renderSingleStroke(mockCtx as any, blurStroke);
    expect(fillRectCalled).toBe(true);
    expect(strokeRectCalled).toBe(true);
    expect(fillTextCalled).toBe(false);
  });
});
