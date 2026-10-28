import { ToolType } from '../types';

export interface RadialOption {
  tool: ToolType;
  label: string;
  icon: string;
}

export class RadialMenu {
  private container: HTMLElement;
  private isOpen = false;
  private onSelectCallback: (tool: ToolType) => void;
  
  private activeIndex = -1;

  private options: RadialOption[] = [
    { tool: 'pen', label: 'Pen', icon: '🖊️' },
    { tool: 'highlighter', label: 'Highlight', icon: '🖍️' },
    { tool: 'laser', label: 'Laser', icon: '⚡' },
    { tool: 'arrow', label: 'Arrow', icon: '↗️' },
    { tool: 'rect', label: 'Rect', icon: '🔲' },
    { tool: 'circle', label: 'Circle', icon: '⭕' },
    { tool: 'step', label: 'Step ①', icon: '①' },
    { tool: 'eraser', label: 'Eraser', icon: '🧹' }
  ];

  constructor(container: HTMLElement, onSelect: (tool: ToolType) => void) {
    this.container = container;
    this.onSelectCallback = onSelect;
    this.render();
  }

  private render() {
    this.container.className = 'radial-menu hidden';
    const total = this.options.length;
    const radius = 80;

    let html = `<div class="radial-center"><span>✕</span></div>`;

    this.options.forEach((opt, idx) => {
      const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
      const x = Math.round(Math.cos(angle) * radius);
      const y = Math.round(Math.sin(angle) * radius);

      html += `
        <div class="radial-item" data-index="${idx}" style="transform: translate(${x}px, ${y}px)">
          <div class="radial-icon">${opt.icon}</div>
          <div class="radial-label">${opt.label}</div>
        </div>
      `;
    });

    this.container.innerHTML = html;
  }

  open(x: number, y: number) {
    this.isOpen = true;
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.classList.remove('hidden');
    this.activeIndex = -1;
    this.highlightActive();
  }

  updateCursor(x: number, y: number) {
    if (!this.isOpen) return;

    const rect = this.container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < 24) {
      // Dead zone in center
      this.activeIndex = -1;
    } else {
      let angle = Math.atan2(dy, dx) + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;

      const slice = (Math.PI * 2) / this.options.length;
      this.activeIndex = Math.floor((angle + slice / 2) % (Math.PI * 2) / slice);
    }

    this.highlightActive();
  }

  close(): ToolType | null {
    if (!this.isOpen) return null;
    this.isOpen = false;
    this.container.classList.add('hidden');

    if (this.activeIndex >= 0 && this.activeIndex < this.options.length) {
      const selected = this.options[this.activeIndex].tool;
      this.onSelectCallback(selected);
      return selected;
    }
    return null;
  }

  cancel() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.activeIndex = -1;
    this.container.classList.add('hidden');
    this.highlightActive();
  }

  isMenuOpen(): boolean {
    return this.isOpen;
  }

  private highlightActive() {
    const items = this.container.querySelectorAll('.radial-item');
    items.forEach((item, idx) => {
      if (idx === this.activeIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}
