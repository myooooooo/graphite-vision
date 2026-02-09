export class PaletteManager {
  private storageKey: string;
  private data: Map<string, number>;

  constructor(storageKey = 'gradient_palette') {
    this.storageKey = storageKey;
    this.data = new Map();
  }

  add(pencil: string, grayValue: number) {
    if (this.data.has(pencil)) return;
    this.data.set(pencil, grayValue);
    this.save();
  }

  remove(pencil: string) {
    this.data.delete(pencil);
    this.save();
  }

  clear() {
    this.data.clear();
    this.save();
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(Array.from(this.data.entries())));
    } catch (_) {}
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.data = new Map(JSON.parse(saved));
      }
    } catch (_) {}
    return this.export();
  }

  export(): Array<[string, number]> {
    return Array.from(this.data.entries());
  }
}
