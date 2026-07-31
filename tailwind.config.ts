import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Matches the Haven Kids Club logo's blue sail/wordmark.
        brand: {
          50: "#eef6fc",
          100: "#d7eaf7",
          200: "#b0d5ef",
          300: "#7fb8e3",
          400: "#4f97d2",
          500: "#2f77c1",
          600: "#2568ab",
          700: "#1d4d80",
          800: "#173e68",
          900: "#122f4f",
        },
        // Matches the logo's gold figures - used sparingly as an accent.
        gold: {
          50: "#fffbeb",
          100: "#fff3c4",
          400: "#ffc004",
          500: "#eab000",
          600: "#c78f00",
        },
      },
    },
  },
  plugins: [],
};
export default config;
