import { AppSettings } from './types';
import { PaletteManager } from './palette-manager';

export class AppState {
  image: HTMLImageElement | null = null;
  graySnapshot: ImageData | null = null;
  settings: AppSettings;
  palette: PaletteManager;

  constructor(palette: PaletteManager, initial?: Partial<AppSettings>) {
    this.palette = palette;
    this.settings = {
      posterize: initial?.posterize ?? false,
      grid: initial?.grid ?? { divisions: 0, color: '#8A22BE', thickness: 1 },
      showOriginal: initial?.showOriginal ?? true,
    };
  }

  update(path: string, value: any) {
    const parts = path.split('.');
    let ref: any = this.settings;
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
