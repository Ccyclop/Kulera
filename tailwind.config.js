/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F3EE",
        "paper-deep": "#E8DCCA",
        surface: "#FFFFFF",
        ink: "#1F1A17",
        muted: "#5F544C",
        oat: "#E9DED1",
        clay: "#B6542D",
        "clay-dark": "#8E3F24",
        "soft-clay": "#F2D7C9",
        sage: "#66785F",
        "sage-light": "#E8EDE4",
        sand: "#D8C6B5",
        placeholder: "#F1E8DD",
        wine: "#4A221B",
        danger: "#9E2F24",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(53, 31, 20, 0.045)",
        panel: "0 18px 48px rgba(53, 31, 20, 0.08)",
      },
      borderRadius: {
        kulera: "30px",
      },
      fontFamily: {
        sans: ['var(--font-mersad)', '"Noto Sans Georgian"', '"Noto Sans"', "Inter", "Arial", "sans-serif"],
        mersad: ['var(--font-mersad)', '"Noto Sans Georgian"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
