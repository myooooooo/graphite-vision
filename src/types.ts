export interface PencilGrade {
  name: string;
  value: number; // 0-255
  hex: string;
}

export interface GridSettings {
  divisions: number;
  color: string;
  thickness: number;
}

export interface AppSettings {
  posterize: boolean;
  grid: GridSettings;
  showOriginal: boolean;
}

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'pdf';
  quality?: number;
  includeGrid: boolean;
  includePalette: boolean;
}
