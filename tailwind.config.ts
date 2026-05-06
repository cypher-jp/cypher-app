import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0B",
        paper: "#F5F2EC",
        cypher: {
          red: "#E63946",
          navy: "#1D3557",
          green: "#2A9D8F",
          yellow: "#F4D35E",
        },
      },
      fontFamily: {
        display: ['"Arial Black"', '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
        body: ['"Inter"', '"Hiragino Kaku Gothic ProN"', '"Yu Gothic"', "sans-serif"],
      },
      boxShadow: {
        card: "0 6px 24px -8px rgba(10,10,11,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
