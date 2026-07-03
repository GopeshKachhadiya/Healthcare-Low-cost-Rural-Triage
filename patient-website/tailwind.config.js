/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF6EF",
        ink: "#1F2A37",
        teal: {
          50: "#EAF5F2",
          100: "#CFE7E0",
          400: "#177A67",
          500: "#0F6B5C",
          600: "#0B5449",
          700: "#083E36",
        },
        marigold: {
          50: "#FCF1DF",
          400: "#EEB158",
          500: "#E8A33D",
          600: "#C77F1F",
        },
        tier: {
          green: "#2F9E44",
          "green-bg": "#EBFBEE",
          yellow: "#F2B705",
          "yellow-bg": "#FFF9DB",
          orange: "#E8590C",
          "orange-bg": "#FFF0E6",
          red: "#E03131",
          "red-bg": "#FFF0F0",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "Noto Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      minHeight: {
        touch: "56px",
      },
      minWidth: {
        touch: "56px",
      },
    },
  },
  plugins: [],
};
