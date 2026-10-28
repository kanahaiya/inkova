import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from './history';
import { Stroke } from '../types';

describe('HistoryManager', () => {
  let history: HistoryManager;

  const createDummyStroke = (id: string, text = ''): Stroke => ({
    id,
    type: 'pen',
    points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
    color: '#ef4444',
    width: 4,
    text
  });

  beforeEach(() => {
    history = new HistoryManager();
  });

  it('initializes with empty history stacks', () => {
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.canUndoClear()).toBe(false);
  });

  it('pushes state and supports undo and redo', () => {
    const s1 = createDummyStroke('1');
    const s2 = createDummyStroke('2');

    history.push([]);
    history.push([s1]);

    expect(history.canUndo()).toBe(true);
    const undo1 = history.undo([s1, s2]);
    expect(undo1).toEqual([s1]);

    expect(history.canRedo()).toBe(true);
    const redo1 = history.redo([s1]);
    expect(redo1).toEqual([s1, s2]);
  });

  it('correctly records clear and restores cleared strokes via undoClear', () => {
    const s1 = createDummyStroke('1');
    const s2 = createDummyStroke('2');
    const activeStrokes = [s1, s2];

    history.recordClear(activeStrokes);
    expect(history.canUndoClear()).toBe(true);

    const restored = history.undoClear();
    expect(restored).toEqual(activeStrokes);
    expect(history.canUndoClear()).toBe(false);
  });

  it('synchronizes undoStack and lastClearedState when undo is used instead of undoClear', () => {
    const s1 = createDummyStroke('1');
    history.recordClear([s1]);
    expect(history.canUndoClear()).toBe(true);

    // Standard undo pops cleared state
    const restored = history.undo([]);
    expect(restored).toEqual([s1]);
    // lastClearedState must be cleared so toast cannot double-trigger
    expect(history.canUndoClear()).toBe(false);
  });

  it('pops undoStack when undoClear is called to prevent duplicate undo entries', () => {
    const s1 = createDummyStroke('1');
    history.push([]);
    history.recordClear([s1]);

    history.undoClear();
    // undoStack should now point to [] rather than duplicate [s1]
    const prev = history.undo([s1]);
    expect(prev).toEqual([]);
  });

  it('caps history stack at maxHistory', () => {
    for (let i = 0; i < 60; i++) {
      history.push([createDummyStroke(`${i}`)]);
    }
    // Should cap at 50 without crashing
    expect(history.canUndo()).toBe(true);
  });
});
