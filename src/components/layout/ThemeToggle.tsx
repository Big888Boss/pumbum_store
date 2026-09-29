'use client';

import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'pumbum-theme';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The theme still applies for the current page when storage is unavailable.
  }

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColor) themeColor.content = theme === 'dark' ? '#020618' : '#f1f5f9';
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  return (
    <button
      className={`theme-toggle ${className}`.trim()}
      type="button"
      aria-label="Переключить цветовую тему"
      title="Переключить цветовую тему"
      onClick={() => {
        const theme: Theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
        const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
      }}
    >
      <Sun className="theme-icon-sun" aria-hidden="true" />
      <Moon className="theme-icon-moon" aria-hidden="true" />
      <span className="theme-toggle-label">Сменить тему</span>
    </button>
  );
}
