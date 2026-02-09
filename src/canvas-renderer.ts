import { GridSettings } from './types';

export class CanvasRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  applyPosterize(imageData: ImageData, levels: number[]): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const step = 256 / levels.length;
    for (let i = 0; i < data.length; i += 4) {
      const g = data[i];
      const bucket = Math.min(levels.length - 1, Math.floor(g / step));
      const v = levels[bucket];
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    return new ImageData(data, imageData.width, imageData.height);
  }

  drawGrid(divisions: number, settings: GridSettings) {
    if (!divisions || divisions < 1) return;
    const { width: w, height: h } = this.canvas;
    const stepX = w / divisions;
    const stepY = h / divisions;
    this.ctx.save();
    this.ctx.strokeStyle = settings.color;
    this.ctx.lineWidth = settings.thickness;
    this.ctx.font = '12px Inter, sans-serif';
    this.ctx.fillStyle = 'rgba(243,239,255,0.85)';
    for (let i = 1; i < divisions; i++) {
      const x = stepX * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
      this.ctx.fillText(String(i + 1), x + 4, 14);
    }
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let j = 1; j < divisions; j++) {
      const y = stepY * j;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
      this.ctx.fillText(letters[j] || j + 1, 6, y - 4);
    }
    this.ctx.restore();
  }
}
