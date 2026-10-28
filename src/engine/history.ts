import { Stroke } from '../types';

export class HistoryManager {
  private undoStack: Stroke[][] = [];
  private redoStack: Stroke[][] = [];
  private maxHistory = 50;
  private lastClearedState: Stroke[] | null = null;

  constructor() {}

  push(strokes: Stroke[]) {
    // Shallow immutable array clone avoids JSON stringify GC thrashing
    this.undoStack.push([...strokes]);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.lastClearedState = null;
  }

  undo(currentStrokes: Stroke[]): Stroke[] | null {
    if (this.undoStack.length === 0) return null;
    this.lastClearedState = null;
    this.redoStack.push([...currentStrokes]);
    return this.undoStack.pop() || [];
  }

  redo(currentStrokes: Stroke[]): Stroke[] | null {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push([...currentStrokes]);
    return this.redoStack.pop() || [];
  }

  recordClear(currentStrokes: Stroke[]) {
    if (currentStrokes.length > 0) {
      this.lastClearedState = [...currentStrokes];
      this.undoStack.push([...currentStrokes]);
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
      this.redoStack = [];
    }
  }

  undoClear(): Stroke[] | null {
    if (this.lastClearedState && this.lastClearedState.length > 0) {
      const restored = [...this.lastClearedState];
      this.lastClearedState = null;
      this.undoStack.pop();
      this.redoStack.push([]);
      return restored;
    }
    return null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  canUndoClear(): boolean {
    return this.lastClearedState !== null && this.lastClearedState.length > 0;
  }
}
