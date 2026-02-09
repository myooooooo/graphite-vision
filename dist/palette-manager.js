export class PaletteManager {
    storageKey;
    data;
    constructor(storageKey = 'gradient_palette') {
        this.storageKey = storageKey;
        this.data = new Map();
    }
    add(pencil, grayValue) {
        if (this.data.has(pencil))
            return false;
        this.data.set(pencil, grayValue);
        this.save();
        return true;
    }
    remove(pencil) {
        const res = this.data.delete(pencil);
        this.save();
        return res;
    }
    clear() {
        this.data.clear();
        this.save();
    }
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(Array.from(this.data.entries())));
        }
        catch (_) { /* ignore */ }
    }
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved)
                this.data = new Map(JSON.parse(saved));
        }
        catch (_) { /* ignore */ }
    }
    export() {
        return Array.from(this.data.entries());
    }
}
