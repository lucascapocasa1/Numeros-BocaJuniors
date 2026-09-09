/** @type {import('tailwindcss').Config} */

// Tokens de color semánticos financieros — fuente de verdad única
export const financialColors = {
  ingreso: {
    DEFAULT: '#16a34a',
    dark: '#14532d',
    light: '#dcfce7',
  },
  egreso: {
    DEFAULT: '#b91c1c',
    dark: '#7f1d1d',
    light: '#fee2e2',
  },
};

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        azul: {
          DEFAULT: '#0a2c6b',
          dark: '#071d47',
          light: '#3f5fa0',
        },
        oro: {
          DEFAULT: '#ffd200',
          dark: '#cc9f00',
          light: '#ffe666',
        },
        ingreso: financialColors.ingreso,
        egreso: financialColors.egreso,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
