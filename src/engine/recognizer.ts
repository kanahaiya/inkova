import { Point, ToolType } from '../types';

export interface RecognizedShape {
  type: ToolType;
  points: Point[];
  confidence: number;
}

export function recognizeShape(points: Point[]): RecognizedShape | null {
  if (points.length < 8) return null;

  const start = points[0];
  const end = points[points.length - 1];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let totalLength = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (i > 0) {
      const prev = points[i - 1];
      totalLength += Math.hypot(p.x - prev.x, p.y - prev.y);
    }
  }

  const directDist = Math.hypot(end.x - start.x, end.y - start.y);
  const width = maxX - minX;
  const height = maxY - minY;

  // Minimum size threshold to prevent snapping accidental tiny twitches
  if (totalLength < 30) return null;

  // 1. Check for Straight Line
  if (directDist / totalLength > 0.88) {
    // Verify maximum perpendicular deviation
    let maxDev = 0;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lineLen = Math.hypot(dx, dy);

    if (lineLen > 0) {
      for (const p of points) {
        const dev = Math.abs(dy * p.x - dx * p.y + end.x * start.y - end.y * start.x) / lineLen;
        if (dev > maxDev) maxDev = dev;
      }
    }

    const maxAllowedDev = Math.min(18, Math.max(5, lineLen * 0.10));
    if (maxDev <= maxAllowedDev) {
      return {
        type: 'line',
        points: [start, end],
        confidence: 0.95
      };
    }
  }

  // Check if stroke is closed (start is near end)
  const isClosed = directDist < totalLength * 0.28 || directDist < 40;

  if (isClosed && points.length >= 12) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = width / 2;
    const ry = height / 2;

    // 2. Check for Rectangle (require all 4 corners and edge proximity)
    const corners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];
    const bboxPerimeter = 2 * (width + height);
    const perimeterDiff = Math.abs(totalLength - bboxPerimeter) / bboxPerimeter;
    const maxCornerDist = Math.max(8, Math.min(width, height) * 0.12);
    let allCornersFound = true;
    for (const c of corners) {
      let minD = Infinity;
      for (const p of points) {
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        if (d < minD) minD = d;
      }
      if (minD > maxCornerDist) {
        allCornersFound = false;
        break;
      }
    }

    if (allCornersFound && perimeterDiff < 0.15 && width > 25 && height > 25) {
      // Check that points align closely to the 4 bounding box edges
      let edgeDeviationSum = 0;
      for (const p of points) {
        const dEdge = Math.min(
          Math.abs(p.x - minX),
          Math.abs(p.x - maxX),
          Math.abs(p.y - minY),
          Math.abs(p.y - maxY)
        );
        edgeDeviationSum += dEdge;
      }
      const avgEdgeDeviation = edgeDeviationSum / points.length;
      const maxAllowedDev = Math.max(8, Math.min(width, height) * 0.15);

      if (avgEdgeDeviation <= maxAllowedDev) {
        return {
          type: 'rect',
          points: [
            { x: minX, y: minY },
            { x: maxX, y: maxY }
          ],
          confidence: 0.90
        };
      }
    }

    // 3. Check for Circle / Ellipse
    let variance = 0;
    for (const p of points) {
      // Normalized distance from center
      const nd = Math.hypot((p.x - cx) / (rx || 1), (p.y - cy) / (ry || 1));
      variance += Math.abs(nd - 1);
    }
    const avgDeviation = variance / points.length;

    if (avgDeviation < 0.14) {
      // Generate clean ellipse points (or circle if aspect ratio is close to 1)
      const aspect = Math.abs(width - height) / Math.max(width, height);
      const isCircle = aspect < 0.25;
      const finalRx = isCircle ? (rx + ry) / 2 : rx;
      const finalRy = isCircle ? (rx + ry) / 2 : ry;

      return {
        type: 'circle',
        points: [
          { x: cx - finalRx, y: cy - finalRy },
          { x: cx + finalRx, y: cy + finalRy }
        ],
        confidence: 0.92
      };
    }
  }

  return null;
}
