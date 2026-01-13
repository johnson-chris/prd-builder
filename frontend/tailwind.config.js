/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a2332',
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#1a2332',
        },
        accent: {
          DEFAULT: '#00bfa5',
          50: '#e6fff9',
          100: '#b3ffef',
          200: '#80ffe5',
          300: '#4dffdb',
          400: '#1affd1',
          500: '#00e6b8',
          600: '#00bfa5',
          700: '#009982',
          800: '#007360',
          900: '#004d3d',
        },
        background: '#f8f7f4',
        surface: '#ffffff',
        text: {
          DEFAULT: '#2d3748',
          muted: '#6b7280',
        },
        border: '#e2e8f0',
        success: '#059669',
        warning: '#f59e0b',
        error: '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      maxWidth: {
        container: '1400px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
