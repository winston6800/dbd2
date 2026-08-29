/**
 * Heatmap color themes. The user picks one to represent whatever they're
 * measuring — the growth objective's identity is the name *and* the color,
 * so "increase signups" can look different from "ship the landing page".
 */
export interface HeatmapTheme {
  id: string;
  label: string;
  /** Low-intensity base color; interpolates toward white as volume rises. */
  rgb: [number, number, number];
}

export const HEATMAP_THEMES: HeatmapTheme[] = [
  { id: 'red', label: 'Growth', rgb: [225, 29, 72] },
  { id: 'blue', label: 'Focus', rgb: [37, 99, 235] },
  { id: 'green', label: 'Health', rgb: [22, 163, 74] },
  { id: 'purple', label: 'Creative', rgb: [147, 51, 234] },
  { id: 'orange', label: 'Energy', rgb: [234, 88, 12] },
  { id: 'pink', label: 'Social', rgb: [219, 39, 119] },
];

export const DEFAULT_HEATMAP_THEME_ID = HEATMAP_THEMES[0].id;

export function getHeatmapTheme(id: string | undefined): HeatmapTheme {
  return HEATMAP_THEMES.find(t => t.id === id) ?? HEATMAP_THEMES[0];
}

export function rgbCss([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}
