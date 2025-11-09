/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: update this to your source code
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4B5563',
          light: '#6B7280',
          dark: '#374151',
        },
        secondary: {
          DEFAULT: '#6B7280',
        },
        success: {
          DEFAULT: '#10B981',
        },
        warning: {
          DEFAULT: '#F59E0B',
        },
        danger: {
          DEFAULT: '#EF4444',
        },
        'background-dark': '#0A0A0A',
        'primary-green': '#10B981',
        'primary-yellow': '#F59E0B',
        'input-bg': '#F1F3F5',
        'text-primary': '#F5F5F5',
        'text-secondary': '#A3A3A3',
        background: {
          light: '#FFFFFF',
          dark: '#0A0A0A',
        },
        card: {
          light: '#FFFFFF',
          dark: '#262626',
        },
        text: {
          light: '#1A1A1A',
          dark: '#F5F5F5',
        },
        subtle: {
          light: '#6B7280',
          dark: '#737373',
        },
        border: {
          light: '#E5E7EB',
          dark: '#404040',
        },
      },
      borderRadius: {
        '2xl': '1rem',
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
  plugins: [],
}