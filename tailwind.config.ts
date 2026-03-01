import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#050507',
        panel: '#111218',
        ink: '#e8e9ef',
        muted: '#9da3b4',
        accent: '#9cc4ff'
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(255,255,255,0.04), 0 20px 35px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
};

export default config;
