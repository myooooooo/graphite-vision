import { AppSettings } from './types';
import { PaletteManager } from './palette-manager';

export class AppState {
  image: HTMLImageElement | null = null;
  graySnapshot: ImageData | null = null;
  settings: AppSettings = {
    posterize: false,
    grid: { divisions: 0, color: '#8A22BE', thickness: 1 },
    showOriginal: true,
  };
  palette: PaletteManager;

  constructor(storageKey = 'gradient_palette') {
    this.palette = new PaletteManager(storageKey);
    this.palette.load();
  }

  update(path: string, value: any) {
    const parts = path.split('.');
    // simple setter
    let ref: any = this;
    for (let i = 0; i < parts.length - 1; i++) {
      ref = ref[parts[i]];
    }
    ref[parts.at(-1) as string] = value;
  }

  reset() {
    this.image = null;
    this.graySnapshot = null;
    this.settings = {
      posterize: false,
      grid: { divisions: 0, color: '#8A22BE', thickness: 1 },
      showOriginal: true,
    };
    this.palette.clear();
  }
}
