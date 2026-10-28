import { Stroke, Point, LaserPoint, LaserStroke, BackdropType } from '../types';

export class CanvasEngine {
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private fxCanvas: HTMLCanvasElement;
  private fxCtx: CanvasRenderingContext2D;
  private scratchCanvas: HTMLCanvasElement;
  private scratchCtx: CanvasRenderingContext2D;

  private strokes: Stroke[] = [];
  private laserStrokes: LaserStroke[] = [];
  private activeLaserStroke: LaserStroke | null = null;
  private laserPoints: LaserPoint[] = [];
  private cursorPoint: Point = { x: -1000, y: -1000 };
  
  public isLaserToolActive = false;
  private activeLaserColor = '#ef4444';
  private activeLaserWidth = 6;
  private laserLifespan = 2500; // ms (hold 1700ms + fade 800ms)

  private dpr = 1;
  private currentBackdrop: BackdropType = 'transparent';
  private isLoopRunning = false;
  private boundFrame: () => void;

  constructor(mainCanvas: HTMLCanvasElement, fxCanvas: HTMLCanvasElement) {
    this.mainCanvas = mainCanvas;
    this.mainCtx = mainCanvas.getContext('2d', { alpha: true })!;
    this.fxCanvas = fxCanvas;
    this.fxCtx = fxCanvas.getContext('2d', { alpha: true })!;
    this.scratchCanvas = document.createElement('canvas');
    this.scratchCtx = this.scratchCanvas.getContext('2d', { alpha: true })!;
    this.boundFrame = this.renderFxFrame.bind(this);

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.mainCanvas.width = w * this.dpr;
    this.mainCanvas.height = h * this.dpr;
    this.mainCanvas.style.width = `${w}px`;
    this.mainCanvas.style.height = `${h}px`;
    this.mainCtx.scale(this.dpr, this.dpr);

    this.fxCanvas.width = w * this.dpr;
    this.fxCanvas.height = h * this.dpr;
    this.fxCanvas.style.width = `${w}px`;
    this.fxCanvas.style.height = `${h}px`;
    this.fxCtx.scale(this.dpr, this.dpr);

    this.scratchCanvas.width = w * this.dpr;
    this.scratchCanvas.height = h * this.dpr;
    this.scratchCtx.scale(this.dpr, this.dpr);

    this.redrawAll();
  }

  setStrokes(strokes: Stroke[]) {
    this.strokes = strokes;
    this.redrawAll();
  }

  getStrokes(): Stroke[] {
    return this.strokes;
  }

  addStroke(stroke: Stroke) {
    this.strokes.push(stroke);
    this.renderSingleStroke(this.mainCtx, stroke);
  }

  private getNeonColor(color: string): { glow: string; core: string } {
    const c = color.toLowerCase();
    // High-vibrancy Apple OLED red
    if (c === '#ef4444' || c === '#dc2626' || c === '#f87171' || c === '#ff0000' || c === 'red') {
      return { glow: '#ff0038', core: '#ffffff' };
    }
    if (c === '#f59e0b') {
      return { glow: '#ff8800', core: '#ffffff' };
    }
    if (c === '#10b981') {
      return { glow: '#00ff88', core: '#ffffff' };
    }
    if (c === '#06b6d4' || c === '#38bdf8') {
      return { glow: '#00e5ff', core: '#ffffff' };
    }
    if (c === '#8b5cf6') {
      return { glow: '#b026ff', core: '#ffffff' };
    }
    if (c === '#ec4899') {
      return { glow: '#ff1493', core: '#ffffff' };
    }
    return { glow: color, core: '#ffffff' };
  }

  setLaserStyle(color: string, width: number, lifespanMs = 2500) {
    this.activeLaserColor = color;
    this.activeLaserWidth = width;
    this.laserLifespan = Math.max(1500, lifespanMs);
  }

  updateCursor(x: number, y: number) {
    this.cursorPoint = { x, y };
    if (
      this._activeSpotlight ||
      this._activeZoom ||
      this._activePreviewStroke !== null ||
      (this.isLaserToolActive && !this.activeLaserStroke)
    ) {
      this.wakeAnimationLoop();
    }
  }

  startLaserStroke(x: number, y: number, color?: string, width?: number) {
    const strokeColor = color || this.activeLaserColor;
    const strokeWidth = width || this.activeLaserWidth;
    const newStroke: LaserStroke = {
      id: crypto.randomUUID(),
      points: [{ x, y, pressure: 1, time: performance.now() }],
      color: strokeColor,
      width: strokeWidth,
      createdAt: performance.now(),
      completedAt: null
    };
    this.laserStrokes.push(newStroke);
    this.activeLaserStroke = newStroke;

    // Backward compatibility for laserPoints
    this.laserPoints.push({
      x,
      y,
      createdAt: performance.now(),
      color: strokeColor,
      width: strokeWidth
    });

    this.wakeAnimationLoop();
  }

  addLaserPoint(x: number, y: number, color?: string, width?: number) {
    const strokeColor = color || this.activeLaserColor;
    const strokeWidth = width || this.activeLaserWidth;

    if (!this.activeLaserStroke || this.activeLaserStroke.completedAt !== null) {
      this.startLaserStroke(x, y, strokeColor, strokeWidth);
      return;
    }

    const pts = this.activeLaserStroke.points;
    const last = pts[pts.length - 1];
    if (last && Math.hypot(x - last.x, y - last.y) < 1.5) {
      return;
    }

    pts.push({ x, y, pressure: 1, time: performance.now() });

    // Backward compatibility for laserPoints
    this.laserPoints.push({
      x,
      y,
      createdAt: performance.now(),
      color: strokeColor,
      width: strokeWidth
    });

    this.wakeAnimationLoop();
  }

  endLaserStroke() {
    if (this.activeLaserStroke) {
      this.activeLaserStroke.completedAt = performance.now();
      this.activeLaserStroke = null;
      this.wakeAnimationLoop();
    }
  }

  clearLaserStrokes() {
    this.laserStrokes = [];
    this.activeLaserStroke = null;
    this.laserPoints = [];
    this.wakeAnimationLoop();
  }

  // Draw backdrop (whiteboard, blackboard, grid)
  drawBackdrop(ctx: CanvasRenderingContext2D, type: BackdropType, w: number, h: number) {
    ctx.clearRect(0, 0, w, h);

    if (type === 'whiteboard') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    } else if (type === 'blackboard') {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, w, h);
    } else if (type === 'grid') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Dot grid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      const step = 28;
      for (let x = step / 2; x < w; x += step) {
        for (let y = step / 2; y < h; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  setBackdrop(backdrop: BackdropType) {
    this.currentBackdrop = backdrop;
    this.redrawAll();
  }

  getBackdrop(): BackdropType {
    return this.currentBackdrop;
  }

  redrawAll(backdrop?: BackdropType) {
    if (backdrop !== undefined) {
      this.currentBackdrop = backdrop;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.drawBackdrop(this.mainCtx, this.currentBackdrop, w, h);

    for (const stroke of this.strokes) {
      this.renderSingleStroke(this.mainCtx, stroke);
    }
  }

  renderSingleStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (stroke.type) {
      case 'pen':
        if (stroke.neonGlow) {
          this.renderNeonStroke(ctx, stroke);
        } else {
          this.renderPen(ctx, stroke);
        }
        break;
      case 'laser':
        this.renderNeonStroke(ctx, stroke);
        break;
      case 'highlighter':
        this.renderHighlighter(ctx, stroke);
        break;
      case 'line':
        this.renderLine(ctx, stroke);
        break;
      case 'arrow':
        this.renderArrow(ctx, stroke);
        break;
      case 'rect':
        this.renderRect(ctx, stroke);
        break;
      case 'circle':
        this.renderCircle(ctx, stroke);
        break;
      case 'step':
        this.renderStepBadge(ctx, stroke);
        break;
      case 'blur':
        this.renderBlur(ctx, stroke);
        break;
      case 'text':
        this.renderText(ctx, stroke);
        break;
    }
    ctx.restore();
  }

  // Exact iPhone-style 3-layer neon glow rendering (White Core + Electric Neon Halo)
  public renderNeonStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length === 0) return;
    const neon = this.getNeonColor(stroke.color);
    const strokeWidth = Math.max(6, stroke.width * 1.25);
    const pts = stroke.points;
    const alpha = stroke.alpha ?? 1;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (pts.length === 1) {
      const pt = pts[0];
      const r = Math.max(strokeWidth * 0.7, 4);

      ctx.globalAlpha = alpha;
      ctx.shadowColor = neon.glow;
      ctx.shadowBlur = r * 3;
      ctx.fillStyle = neon.glow;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = r * 1.2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r * 1.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = neon.core;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(2, r * 0.48), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    const traceBézier = () => {
      ctx.beginPath();
      if (pts.length === 2) {
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        return;
      }
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    };

    // Layer 1: Atmospheric Neon Bloom (Soft radiance)
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = neon.glow;
    ctx.shadowColor = neon.glow;
    ctx.shadowBlur = strokeWidth * 2.5;
    ctx.lineWidth = strokeWidth * 1.55;
    traceBézier();
    ctx.stroke();
    ctx.restore();

    // Layer 2: Saturated Neon Halo / Border (Vibrant rim)
    ctx.save();
    ctx.globalAlpha = alpha * 0.98;
    ctx.strokeStyle = neon.glow;
    ctx.shadowColor = neon.glow;
    ctx.shadowBlur = strokeWidth * 0.95;
    ctx.lineWidth = strokeWidth * 1.12;
    traceBézier();
    ctx.stroke();
    ctx.restore();

    // Layer 3: Solid Razor-Sharp Pure White Core
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = neon.core;
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2.4, strokeWidth * 0.44);
    traceBézier();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private renderPen(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    const pts = stroke.points;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  private renderHighlighter(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length === 0) return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.scratchCtx.clearRect(0, 0, w, h);
    this.scratchCtx.save();
    this.scratchCtx.strokeStyle = stroke.color;
    this.scratchCtx.lineWidth = stroke.width * 2.2;
    this.scratchCtx.lineCap = 'square';
    this.scratchCtx.lineJoin = 'round';
    this.scratchCtx.globalAlpha = 1.0;

    this.renderPen(this.scratchCtx, stroke);
    this.scratchCtx.restore();

    ctx.save();
    ctx.globalAlpha = stroke.alpha || 0.38;
    ctx.drawImage(this.scratchCanvas, 0, 0, w, h);
    ctx.restore();
  }

  private renderLine(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return;
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  private renderArrow(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return;
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    // Shaft
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLen = Math.max(14, stroke.width * 2.6);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLen * Math.cos(angle - Math.PI / 6),
      end.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - headLen * Math.cos(angle + Math.PI / 6),
      end.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  private renderRect(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return;
    const p1 = stroke.points[0];
    const p2 = stroke.points[stroke.points.length - 1];

    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    const r = Math.min(8, w / 4, h / 4);

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.stroke();
  }

  private renderCircle(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return;
    const p1 = stroke.points[0];
    const p2 = stroke.points[stroke.points.length - 1];

    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const rx = Math.abs(p2.x - p1.x) / 2;
    const ry = Math.abs(p2.y - p1.y) / 2;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private renderStepBadge(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    const pt = stroke.points[0];
    const num = stroke.stepNumber || 1;
    const radius = Math.max(16, stroke.width * 1.6);

    ctx.save();
    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Circle background
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Number text
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(radius * 1.15)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${num}`, pt.x, pt.y + 1);
    ctx.restore();
  }

  private renderBlur(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return;
    const p1 = stroke.points[0];
    const p2 = stroke.points[stroke.points.length - 1];

    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);

    ctx.save();
    // Frosted glass redaction mask
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(x, y, w, h);

    // Subtle clean border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  private renderText(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    const pt = stroke.points[0];
    const text = stroke.text || '';
    if (!text) return;

    ctx.save();
    const fontSize = Math.max(16, stroke.width * 2);
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;

    const metrics = ctx.measureText(text);
    const pad = 8;
    const boxW = metrics.width + pad * 2;
    const boxH = fontSize + pad * 2;

    // Pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(pt.x - pad, pt.y - fontSize, boxW, boxH, 6);
    } else {
      ctx.rect(pt.x - pad, pt.y - fontSize, boxW, boxH);
    }
    ctx.fill();

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text
    ctx.fillStyle = stroke.color;
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, pt.x, pt.y + pad / 2);
    ctx.restore();
  }

  // Eraser hit detection with point-to-segment distance
  eraseAt(point: Point, radius = 24): boolean {
    const origLen = this.strokes.length;
    this.strokes = this.strokes.filter(s => !this.hitTestStroke(s, point, radius));
    if (this.strokes.length !== origLen) {
      this.redrawAll();
      return true;
    }
    return false;
  }

  private pointToSegmentDist(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(p.x - projX, p.y - projY);
  }

  private hitTestStroke(stroke: Stroke, p: Point, radius: number): boolean {
    const hitThreshold = radius + (stroke.width || 4) / 2;
    const pts = stroke.points;
    if (pts.length === 0) return false;

    // Single point (text, step badge, single click dot)
    if (pts.length === 1) {
      return Math.hypot(pts[0].x - p.x, pts[0].y - p.y) <= hitThreshold + 12;
    }

    // Rect or Blur box
    if (stroke.type === 'rect' || stroke.type === 'blur') {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);

      if (p.x >= minX - hitThreshold && p.x <= maxX + hitThreshold &&
          p.y >= minY - hitThreshold && p.y <= maxY + hitThreshold) {
        const dTop = Math.abs(p.y - minY);
        const dBottom = Math.abs(p.y - maxY);
        const dLeft = Math.abs(p.x - minX);
        const dRight = Math.abs(p.x - maxX);
        if (Math.min(dTop, dBottom, dLeft, dRight) <= hitThreshold) return true;
        if (stroke.type === 'blur') return true;
      }
      return false;
    }

    // Circle
    if (stroke.type === 'circle') {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const rx = Math.abs(p2.x - p1.x) / 2;
      const ry = Math.abs(p2.y - p1.y) / 2;
      const avgR = (rx + ry) / 2;
      const distFromCenter = Math.hypot(p.x - cx, p.y - cy);
      return Math.abs(distFromCenter - avgR) <= hitThreshold;
    }

    // Continuous curves, lines, arrows: test point-to-segment distance between consecutive points
    for (let i = 0; i < pts.length - 1; i++) {
      if (this.pointToSegmentDist(p, pts[i], pts[i + 1]) <= hitThreshold) {
        return true;
      }
    }
    return false;
  }

  // Active transient effects with wake triggers
  private _activePreviewStroke: Stroke | null = null;
  get activePreviewStroke(): Stroke | null {
    return this._activePreviewStroke;
  }
  set activePreviewStroke(val: Stroke | null) {
    this._activePreviewStroke = val;
    this.wakeAnimationLoop();
  }

  private _activeSpotlight = false;
  get activeSpotlight(): boolean {
    return this._activeSpotlight;
  }
  set activeSpotlight(val: boolean) {
    this._activeSpotlight = val;
    this.wakeAnimationLoop();
  }

  private _activeZoom = false;
  get activeZoom(): boolean {
    return this._activeZoom;
  }
  set activeZoom(val: boolean) {
    this._activeZoom = val;
    this.wakeAnimationLoop();
  }

  wakeAnimationLoop() {
    if (!this.isLoopRunning) {
      this.isLoopRunning = true;
      requestAnimationFrame(this.boundFrame);
    }
  }

  private renderFxFrame() {
    const ctx = this.fxCtx;
    const now = performance.now();
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Prune laser strokes that exceeded lifespan
    this.laserStrokes = this.laserStrokes.filter(s => {
      if (s.completedAt === null) return true;
      return (now - s.completedAt) < this.laserLifespan;
    });

    // Prune old laserPoints for backward compatibility
    this.laserPoints = this.laserPoints.filter(p => now - p.createdAt < this.laserLifespan);

    const hasActiveEffects =
      this.laserStrokes.length > 0 ||
      this.laserPoints.length > 0 ||
      this._activeSpotlight ||
      this._activeZoom ||
      this._activePreviewStroke !== null ||
      (this.isLaserToolActive && this.cursorPoint.x >= 0);

    ctx.clearRect(0, 0, w, h);

    if (!hasActiveEffects) {
      this.isLoopRunning = false;
      return;
    }

    // 1. Spotlight Dimmer
    if (this._activeSpotlight && this.cursorPoint.x >= 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.76)';
      ctx.fillRect(0, 0, w, h);

      // Cut out bright spotlight at cursor
      ctx.globalCompositeOperation = 'destination-out';
      const spotRadius = 140;
      const grad = ctx.createRadialGradient(
        this.cursorPoint.x, this.cursorPoint.y, spotRadius * 0.45,
        this.cursorPoint.x, this.cursorPoint.y, spotRadius
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.cursorPoint.x, this.cursorPoint.y, spotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Fading Laser Pointer Trails (iPhone FaceTime / Screen Share Dual-Layer Neon)
    this.renderLaserTrail(ctx, now);

    // 3. iPhone Glowing Pointer Bead when hovering with laser tool
    if (this.isLaserToolActive && this.cursorPoint.x >= 0 && !this.activeLaserStroke) {
      this.renderIPhonePointerBead(ctx, now);
    }

    // 4. Live Preview Stroke in Progress
    if (this._activePreviewStroke) {
      this.renderSingleStroke(ctx, this._activePreviewStroke);
    }

    // 5. Magnifier Loupe Zoom
    if (this._activeZoom && this.cursorPoint.x >= 0) {
      this.renderLoupe(ctx);
    }

    if (this.isLoopRunning) {
      requestAnimationFrame(this.boundFrame);
    }
  }

  // Render the distinctive glowing iPhone pointer bead (AssistiveTouch / iPadOS pointer style)
  private renderIPhonePointerBead(ctx: CanvasRenderingContext2D, now: number) {
    const x = this.cursorPoint.x;
    const y = this.cursorPoint.y;
    const neon = this.getNeonColor(this.activeLaserColor);
    const pulse = 1 + 0.06 * Math.sin(now * 0.005);
    const baseR = Math.max(9, this.activeLaserWidth * 0.95) * pulse;

    ctx.save();
    // Outer atmospheric glow
    ctx.shadowColor = neon.glow;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = neon.glow;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x, y, baseR, 0, Math.PI * 2);
    ctx.stroke();

    // Soft translucent tint inside ring
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();

    // Inner bright white center dot
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(3.2, baseR * 0.38), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderLoupe(ctx: CanvasRenderingContext2D) {
    const size = 160;
    const zoom = 2;
    const x = this.cursorPoint.x;
    const y = this.cursorPoint.y;

    ctx.save();
    // Circle clip for magnifier
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Fill magnifier background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - size / 2, y - size / 2, size, size);

    // Draw magnified mainCanvas content
    ctx.drawImage(
      this.mainCanvas,
      (x - size / (2 * zoom)) * this.dpr,
      (y - size / (2 * zoom)) * this.dpr,
      (size / zoom) * this.dpr,
      (size / zoom) * this.dpr,
      x - size / 2,
      y - size / 2,
      size,
      size
    );

    ctx.restore();

    // Metallic bezel
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Crosshair
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
    ctx.restore();
  }

  private renderLaserTrail(ctx: CanvasRenderingContext2D, now: number) {
    // 1. Render all multi-stroke laser annotations
    if (this.laserStrokes.length > 0) {
      for (const s of this.laserStrokes) {
        let opacity = 1.0;
        if (s.completedAt !== null) {
          const elapsed = now - s.completedAt;
          const holdTime = Math.min(this.laserLifespan * 0.7, 1800);
          const fadeTime = Math.max(500, this.laserLifespan - holdTime);
          if (elapsed <= holdTime) {
            opacity = 1.0;
          } else {
            const p = Math.min(1, (elapsed - holdTime) / fadeTime);
            opacity = Math.max(0, 1 - Math.sin(p * Math.PI * 0.5));
          }
        }
        if (opacity <= 0.01) continue;

        const neon = this.getNeonColor(s.color);
        const strokeWidth = Math.max(6, s.width * 1.25);
        const pts = s.points;
        if (pts.length === 0) continue;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (pts.length === 1) {
          const pt = pts[0];
          const r = Math.max(strokeWidth * 0.7, 4);

          ctx.globalAlpha = opacity;
          ctx.shadowColor = neon.glow;
          ctx.shadowBlur = r * 3;
          ctx.fillStyle = neon.glow;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r * 1.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = r * 1.2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r * 1.1, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.fillStyle = neon.core;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(2, r * 0.48), 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
          continue;
        }

        const traceBézier = () => {
          ctx.beginPath();
          if (pts.length === 2) {
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            return;
          }
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length - 1; i++) {
            const xc = (pts[i].x + pts[i + 1].x) / 2;
            const yc = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
          }
          const last = pts[pts.length - 1];
          ctx.lineTo(last.x, last.y);
        };

        // Pass 1: Broad Atmospheric Neon Radiance (Outer soft glow)
        ctx.save();
        ctx.globalAlpha = opacity * 0.8;
        ctx.strokeStyle = neon.glow;
        ctx.shadowColor = neon.glow;
        ctx.shadowBlur = strokeWidth * 2.5;
        ctx.lineWidth = strokeWidth * 1.55;
        traceBézier();
        ctx.stroke();
        ctx.restore();

        // Pass 2: Saturated Neon Halo / Border (Vibrant rim)
        ctx.save();
        ctx.globalAlpha = opacity * 0.98;
        ctx.strokeStyle = neon.glow;
        ctx.shadowColor = neon.glow;
        ctx.shadowBlur = strokeWidth * 0.95;
        ctx.lineWidth = strokeWidth * 1.12;
        traceBézier();
        ctx.stroke();
        ctx.restore();

        // Pass 3: Razor-Sharp Pure White Core
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = neon.core;
        ctx.shadowBlur = 0;
        ctx.lineWidth = Math.max(2.4, strokeWidth * 0.44);
        traceBézier();
        ctx.stroke();
        ctx.restore();

        // Active laser tip spark at the leading cursor position while drawing
        if (s.completedAt === null) {
          const head = pts[pts.length - 1];
          const r = Math.max(strokeWidth * 0.75, 5);

          ctx.save();
          ctx.shadowColor = neon.glow;
          ctx.shadowBlur = r * 3;
          ctx.fillStyle = neon.glow;
          ctx.beginPath();
          ctx.arc(head.x, head.y, r * 1.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = r * 1.2;
          ctx.fillStyle = neon.glow;
          ctx.beginPath();
          ctx.arc(head.x, head.y, r * 1.0, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(head.x, head.y, Math.max(2.5, r * 0.45), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
      }
      return;
    }

    // 2. Fallback for legacy laserPoints array
    const pts = this.laserPoints;
    if (pts.length === 0) return;

    const neon = this.getNeonColor(pts[0].color);
    const strokeWidth = Math.max(6, pts[0].width * 1.25);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.save();
    ctx.strokeStyle = neon.glow;
    ctx.shadowColor = neon.glow;
    ctx.shadowBlur = strokeWidth * 2.5;
    ctx.lineWidth = strokeWidth * 1.55;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = neon.core;
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2.4, strokeWidth * 0.44);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // Draw any active laser strokes into snapshot exports
  public renderLaserSnapshot(ctx: CanvasRenderingContext2D) {
    if (this.laserStrokes.length === 0) return;
    for (const s of this.laserStrokes) {
      this.renderNeonStroke(ctx, {
        id: s.id,
        type: 'laser',
        points: s.points,
        color: s.color,
        width: s.width
      });
    }
  }
}
