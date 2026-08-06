import type { Config } from "tailwindcss";

/**
 * Paleta extraída do site oficial da Volkswagen Brasil (vw.com.br):
 *   #1B2236  texto principal (navy)      #001E50  VW Deep Blue (marca)
 *   #293043  navy secundário             #606574  texto de apoio
 *   #DFE4E8  linhas / divisores          #F6F5F2  fundo quente
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Escala clara sobre base navy VW: ink-0 = fundo, ink-900 = texto
        ink: {
          0: "#FFFFFF",
          50: "#FBFAF8",
          100: "#F6F5F2",
          200: "#E9EBEE",
          300: "#DFE4E8",
          400: "#C3C8D0",
          500: "#9AA0AC",
          600: "#606574",
          700: "#484E5F",
          800: "#293043",
          900: "#1B2236",
        },
        vw: {
          deep: "#001E50",
          blue: "#1B57C4",
          sky: "#00B0F0",
          mist: "#DFE4E8",
          sand: "#F6F5F2",
        },
        signal: {
          go: "#0E7C3A",
          warn: "#96560B",
          stop: "#BB0B22",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue", "Arial"],
      },
      fontSize: {
        // Escala levemente maior que o padrão, para leitura confortável
        xs: ["0.8125rem", { lineHeight: "1.15rem" }],   // 13
        sm: ["0.9375rem", { lineHeight: "1.4rem" }],    // 15
        base: ["1.0625rem", { lineHeight: "1.65rem" }], // 17
        lg: ["1.1875rem", { lineHeight: "1.75rem" }],   // 19
        xl: ["1.375rem", { lineHeight: "1.9rem" }],     // 22
        "2xl": ["1.75rem", { lineHeight: "2.1rem" }],   // 28
        "3xl": ["2.125rem", { lineHeight: "2.4rem" }],  // 34
        "4xl": ["2.75rem", { lineHeight: "2.9rem" }],   // 44
        "5xl": ["3.5rem", { lineHeight: "3.6rem" }],    // 56
        "6xl": ["4.5rem", { lineHeight: "4.5rem" }],    // 72
        "7xl": ["5.5rem", { lineHeight: "5.4rem" }],    // 88
      },
      borderRadius: {
        none: "0",
        sm: "6px",
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,34,54,0.05)",
        lift: "0 6px 20px rgba(27,34,54,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
