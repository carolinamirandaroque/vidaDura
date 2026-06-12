import L from 'leaflet';

export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const MAP_TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
} as const;

export function isDarkMapTheme() {
  return document.documentElement.classList.contains('dark');
}

export function createPrimaryMarkerIcon(selected = false) {
  const size = selected ? 18 : 14;
  const border = selected ? 3 : 2;
  const shadow = selected ? '0 2px 6px rgba(0,0,0,.4)' : '0 1px 4px rgba(0,0,0,.35)';

  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:hsl(var(--primary));border:${border}px solid hsl(var(--background));box-shadow:${shadow}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
