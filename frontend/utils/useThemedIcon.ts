'use client';

import { useTheme } from '@/components/ThemeProvider';

export function useThemedIcon() {
  const { theme } = useTheme();

  const getIconPath = (iconName: string): string => {
    return `/icons/${theme}/${iconName}`;
  };

  return { getIconPath, theme };
}
