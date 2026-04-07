export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 🔥 THIS IS THE FIX
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}