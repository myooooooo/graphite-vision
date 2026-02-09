export const DARWIN_PENCILS = ['9H', '8H', '7H', '6H', '5H', '4H', '3H', '2H', 'H', 'F', 'HB', 'B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B'];
const LUMINANCE_SEGMENTS = 24;
export class PencilMapper {
    pencils;
    constructor(pencilSet = DARWIN_PENCILS) { this.pencils = pencilSet; }
    mapGrayToPencil(gray) {
        const clamped = Math.min(255, Math.max(0, gray));
        const seg = Math.min(LUMINANCE_SEGMENTS - 1, Math.floor(clamped / (256 / LUMINANCE_SEGMENTS)));
        const pencilIdx = Math.round(seg * (this.pencils.length - 1) / (LUMINANCE_SEGMENTS - 1));
        return this.pencils[pencilIdx];
    }
    getAllGrades() { return [...this.pencils]; }
    getPencilColor(grade) {
        const idx = this.pencils.indexOf(grade);
        const value = Math.round((idx / (this.pencils.length - 1)) * 255);
        const hex = `#${value.toString(16).padStart(2, '0').repeat(3)}`;
        return { name: grade, value, hex };
    }
}
