export class AppState {
    image = null;
    graySnapshot = null;
    settings;
    palette;
    constructor(palette, initial) {
        this.palette = palette;
        this.settings = {
            posterize: initial?.posterize ?? false,
            grid: initial?.grid ?? { divisions: 0, color: '#8A22BE', thickness: 1 },
            showOriginal: initial?.showOriginal ?? true,
        };
    }
    update(path, value) {
        const parts = path.split('.');
        let ref = this.settings;
        for (let i = 0; i < parts.length - 1; i++) {
            ref = ref[parts[i]];
        }
        ref[parts.at(-1)] = value;
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
