import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0000CC',
        secondary: '#38b6ff',
        cream: '#f8f6f2',
      },
      boxShadow: {
        soft: '0 22px 60px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
