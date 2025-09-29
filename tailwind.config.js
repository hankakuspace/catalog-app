// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    "bg-black",
    "text-white",
    "grid-cols-4",
    "min-h-screen",
    "flex",
    "flex-col",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
