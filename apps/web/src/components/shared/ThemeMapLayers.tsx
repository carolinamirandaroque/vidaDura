import { useEffect, useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { MAP_ATTRIBUTION, MAP_TILES } from '@/lib/map-theme';

function useDarkMapTheme() {
  const [isDark, setIsDark] = useState(isDarkMapTheme);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

function isDarkMapTheme() {
  return document.documentElement.classList.contains('dark');
}

export function ThemeMapTileLayer() {
  const isDark = useDarkMapTheme();

  return (
    <TileLayer
      attribution={MAP_ATTRIBUTION}
      url={isDark ? MAP_TILES.dark : MAP_TILES.light}
    />
  );
}
