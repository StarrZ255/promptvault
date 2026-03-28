import type { Config } from 'tailwindcss';

export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        muted: 'var(--muted)',
        text: 'var(--text)',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
