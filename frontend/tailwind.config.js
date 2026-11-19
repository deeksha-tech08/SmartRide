/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          bg: '#0f172a',
          card: '#1e293b',
          accent: '#22c55e',
          'accent-dark': '#16a34a',
        },
        warning: '#f59e0b',
        error: '#ef4444',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
      },
    },
  },
  plugins: [],
};
