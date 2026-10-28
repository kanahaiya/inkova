export type ToolType = 
  | 'pen' 
  | 'highlighter' 
  | 'laser' 
  | 'arrow' 
  | 'line' 
  | 'rect' 
  | 'circle' 
  | 'step' 
  | 'text' 
  | 'blur' 
  | 'eraser' 
  | 'spotlight' 
  | 'zoom';

export type BackdropType = 'transparent' | 'whiteboard' | 'blackboard' | 'grid';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface Stroke {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  width: number;
  alpha?: number;
  text?: string;
  stepNumber?: number;
  snapped?: boolean;
  blurRadius?: number;
  bounds?: { x: number; y: number; w: number; h: number };
  neonGlow?: boolean;
}

export interface LaserPoint {
  x: number;
  y: number;
  createdAt: number;
  color: string;
  width: number;
}

export interface LaserStroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  createdAt: number;
  completedAt: number | null;
}

export const DEFAULT_SHORTCUTS: Record<string, string> = {
  pen: 'p',
  highlighter: 'h',
  laser: 'l',
  arrow: 'a',
  line: 'i',
  rect: 'r',
  circle: 'o',
  step: 'b',
  blur: 'x',
  text: 't',
  eraser: 'e',
  spotlight: 'f',
  zoom: 'z',
  'toggle-glass': 'g',
  clear: 'c',
  undo: 'ctrl+z',
  redo: 'ctrl+y',
  snapshot: 'ctrl+s',
  'toggle-tray': 'ctrl+shift+h',
  'toggle-orientation': 'alt+o',
  help: '?'
};

export interface AppState {
  currentTool: ToolType;
  activeColor: string;
  activeWidth: number;
  backdrop: BackdropType;
  isGlassMode: boolean;
  spotlightEnabled: boolean;
  zoomEnabled: boolean;
  stepCounter: number;
  fadingTimerMs: number;
  snapEnabled: boolean;
  toolbarOrientation?: 'horizontal' | 'vertical';
  toolbarPosition?: { left: number; top: number };
  shortcuts: Record<string, string>;
}
