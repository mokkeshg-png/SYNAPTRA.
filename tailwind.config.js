/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#142033",
          50: "#f4f6f9",
          100: "#e6ebf2",
          200: "#c5d0de",
          300: "#8fa3bb",
          400: "#5c7594",
          500: "#3d5574",
          600: "#2a3f5c",
          700: "#1e3048",
          800: "#142033",
          900: "#0d1624",
        },
        navy: {
          DEFAULT: "#1c3d6e",
          50: "#f2f6fb",
          100: "#dce7f4",
          200: "#b5cce6",
          300: "#7aa6d1",
          400: "#3d7bb8",
          500: "#1c3d6e",
          600: "#16325a",
          700: "#122848",
          800: "#0e1e36",
        },
        brass: {
          DEFAULT: "#8b6f47",
          50: "#f8f4ee",
          100: "#efe6d6",
          200: "#ddc9a8",
          300: "#c4a574",
          400: "#a88854",
          500: "#8b6f47",
          600: "#6f5838",
        },
        paper: {
          DEFAULT: "#f5f2ec",
          50: "#fbfaf7",
          100: "#f5f2ec",
          200: "#ebe5d8",
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        sans: ['"Source Sans 3"', "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,32,51,0.06), 0 8px 24px rgba(20,32,51,0.06)",
        lift: "0 12px 32px rgba(20,32,51,0.10)",
      },
    },
  },
  plugins: [],
};
