import type { Config } from 'tailwindcss';

// Tokens 1:1 aus dem Phase-2.5-Mockup (assets/css/styles.css).
// Diese Datei ist die spätere SU24-Preset-Quelle.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        petrol: {
          DEFAULT: '#1B6CA8',
          700: '#134f7d',
          900: '#0c3a5c',
          glow: 'rgba(27,108,168,.12)',
          soft: 'rgba(27,108,168,.08)'
        },
        green: { DEFAULT: '#059669', bg: 'rgba(5,150,105,.10)' },
        amber: { DEFAULT: '#d97706', bg: 'rgba(217,119,6,.10)' },
        red:   { DEFAULT: '#dc2626', bg: 'rgba(220,38,38,.10)' },
        ink:   { 1: '#0f1923', 2: '#4a5568', 3: '#94a3b8' },
        surface: '#ffffff',
        canvas:  '#f0f4f8',
        line:    'rgba(0,0,0,.07)'
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '16px',
        pill: '999px'
      },
      boxShadow: {
        '1': '0 1px 2px rgba(0,0,0,.04)',
        '2': '0 8px 24px rgba(0,0,0,.08)',
        '3': '0 16px 40px rgba(15,25,35,.10)'
      }
    }
  },
  plugins: []
};

export default config;
