export type Tool = 'pen' | 'highlighter' | 'eraser' | 'pointer' | 'select' | 'clear' | 'text';

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface Student {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  level: string;
  stars: number;
}

export interface DrawingPath {
  points: DrawingPoint[];
  color: string;
  width: number;
  tool: Tool;
  text?: string;
  fontSize?: number;
}

export interface AnnotationData {
  [pageNumber: number]: DrawingPath[];
}

export const COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Violet
  '#000000', // Black
];

export const TOOL_WIDTHS = {
  pen: 4,
  highlighter: 20,
  eraser: 30,
};
