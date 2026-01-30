import type { Config } from "tailwindcss";

export default {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        'roboto-mono': ['var(--font-roboto-mono)', 'monospace'],
        'roboto-flex': ['var(--font-roboto-flex)', 'sans-serif'],
        'noto-sans-sc': ['var(--font-noto-sans-sc)', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
