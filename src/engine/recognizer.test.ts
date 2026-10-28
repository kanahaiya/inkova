import { describe, it, expect } from 'vitest';
import { recognizeShape } from './recognizer';
import { Point } from '../types';

describe('recognizeShape', () => {
  it('returns null for strokes with fewer than 8 points', () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 }
    ];
    expect(recognizeShape(pts)).toBeNull();
  });

  it('recognizes a straight horizontal line', () => {
    const pts: Point[] = [];
    for (let i = 0; i < 20; i++) {
      pts.push({ x: i * 10, y: 50 + (Math.sin(i) * 0.5) });
    }
    const result = recognizeShape(pts);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('line');
  });

  it('does NOT recognize short curved strokes as straight lines', () => {
    const pts: Point[] = [];
    // Arc of 40px chord with 14px curvature deviation
    for (let i = 0; i <= 10; i++) {
      const x = 50 + i * 4;
      const y = 50 + Math.sin((i / 10) * Math.PI) * 14;
      pts.push({ x, y });
    }
    const result = recognizeShape(pts);
    // Should NOT falsely snap to a straight line
    if (result) {
      expect(result.type).not.toBe('line');
    }
  });

  it('recognizes a drawn circle', () => {
    const pts: Point[] = [];
    const cx = 100, cy = 100, r = 50;
    const total = 24;
    for (let i = 0; i <= total; i++) {
      const angle = (i / total) * Math.PI * 2;
      pts.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r
      });
    }
    const result = recognizeShape(pts);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('circle');
  });

  it('recognizes a drawn rectangle', () => {
    const pts: Point[] = [];
    // Top side: (50, 50) to (150, 50)
    for (let x = 50; x <= 150; x += 10) pts.push({ x, y: 50 });
    // Right side: (150, 50) to (150, 150)
    for (let y = 60; y <= 150; y += 10) pts.push({ x: 150, y });
    // Bottom side: (150, 150) to (50, 150)
    for (let x = 140; x >= 50; x -= 10) pts.push({ x, y: 150 });
    // Left side: (50, 150) to (50, 50)
    for (let y = 140; y >= 50; y -= 10) pts.push({ x: 50, y });

    const result = recognizeShape(pts);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('rect');
  });

  it('does NOT falsely recognize irregular triangles or loops as rectangles', () => {
    const pts: Point[] = [];
    // Irregular triangle
    for (let i = 0; i < 10; i++) pts.push({ x: 50 + i * 10, y: 50 + i * 10 });
    for (let i = 0; i < 10; i++) pts.push({ x: 150 - i * 10, y: 150 });
    for (let i = 0; i < 10; i++) pts.push({ x: 50, y: 150 - i * 10 });

    const result = recognizeShape(pts);
    // Should not recognize as rect because points deviate far from top bounding box edge
    if (result) {
      expect(result.type).not.toBe('rect');
    }
  });
});
