import type { Config } from "tailwindcss";

/**
 * Paleta extraída do site oficial da Volkswagen Brasil (vw.com.br):
 *   #1B2236  texto principal (navy)      #001E50  VW Deep Blue (marca)
 *   #293043  navy secundário             #606574  texto de apoio
 *   #DFE4E8  linhas / divisores          #F6F5F2  fundo quente
 *
 * A referência completa (uso de cada degrau, gradientes, tipografia) está em
 * `docs/design-system.md`. Todo valor daqui é rastreável até lá, e vice-versa.
 */

/**
 * Interpola entre o valor mobile (a 375px) e o desktop (a 1280px) da tabela de
 * tipografia do design system. O `rem` no meio do clamp é deliberado: sem ele o
 * texto pararia de responder ao zoom do navegador, que é falha de acessibilidade.
 */
const fluido = (min: string, base: string, vw: string, max: string) =>
  `clamp(${min}, ${base} + ${vw}, ${max})`;

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

        // ------------------------------------------------------------------
        // Escalas completas do design system.
        //
        // `azul` estende `vw.deep`/`vw.blue` (que são os degraus 900 e 600) com
        // a faixa que faltava para fundo escuro, borda tingida e estado hover.
        // `cinza` e `sucesso`/`alerta`/`erro` são a mesma paleta de `ink` e
        // `signal`, agora em faixa completa — a intenção registrada no
        // documento é que substituam aqueles tokens conforme as telas forem
        // migrando, não que convivam com eles para sempre. Enquanto a migração
        // não acontece, `ink` e `signal` continuam sendo o que as telas usam.
        // ------------------------------------------------------------------
        azul: {
          950: "#00112C", 900: "#001E50", 800: "#093177", 700: "#12449D",
          600: "#1B57C4", 500: "#3E71CE", 400: "#628CD7", 300: "#85A6E1",
          200: "#A8C0EB", 100: "#CCDBF4", 50: "#EFF5FE",
        },
        cinza: {
          950: "#121623", 900: "#1B2236", 800: "#293043", 700: "#484E5F",
          600: "#606574", 500: "#9AA0AC", 400: "#C3C8D0", 300: "#DFE4E8",
          200: "#E9EBEE", 100: "#F6F5F2", 50: "#FBFAF8",
        },
        sucesso: { 50: "#ECF5EF", 100: "#CAE2D4", 300: "#87BE9D", 500: "#0E7C3A", 700: "#0B632E", 900: "#084420" },
        alerta:  { 50: "#F7F1EB", 100: "#E8DAC9", 300: "#CBAB85", 500: "#96560B", 700: "#784509", 900: "#532F06" },
        erro:    { 50: "#FAECED", 100: "#F0C9CE", 300: "#DD8591", 500: "#BB0B22", 700: "#96091B", 900: "#670613" },
      },
      backgroundImage: {
        // Os cinco gradientes com função definida do design system. Cada um
        // caminha em degraus vizinhos da própria escala — pular do escuro
        // direto pro claro lê como emenda, não como gradiente.
        profundo: "linear-gradient(160deg, #00112C 0%, #001E50 55%, #093177 100%)",
        sinal: "linear-gradient(120deg, #001E50 0%, #12449D 30%, #1B57C4 60%, #3E71CE 85%, #628CD7 100%)",
        glow: "radial-gradient(circle at 28% 22%, #3E71CE 0%, #1B57C4 35%, #12449D 65%, #001E50 100%)",
        nevoa: "linear-gradient(160deg, #FBFAF8 0%, #EFF5FE 55%, #E9EBEE 100%)",
        scrim: "linear-gradient(0deg, rgba(0,17,44,0.92) 0%, rgba(0,17,44,0.55) 45%, rgba(0,17,44,0) 100%)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue", "Arial"],
      },
      fontSize: {
        // Escala do design system. O tamanho é fluido entre mobile e desktop;
        // altura de linha e tracking vêm do nível, não de quem usa — é por isso
        // que `.display` no globals.css cuida só do peso.
        xs:   [fluido("0.75rem",   "0.724rem", "0.111vw", "0.8125rem"), { lineHeight: "1.4",  letterSpacing: "0.01em" }],   // Legenda
        sm:   [fluido("0.875rem",  "0.849rem", "0.111vw", "0.9375rem"), { lineHeight: "1.55", letterSpacing: "0em" }],      // B2
        base: [fluido("1rem",      "0.974rem", "0.111vw", "1.0625rem"), { lineHeight: "1.6",  letterSpacing: "0em" }],      // B1
        lg:   [fluido("1.0625rem", "1.011rem", "0.221vw", "1.1875rem"), { lineHeight: "1.35", letterSpacing: "0em" }],      // H6
        xl:   [fluido("1.1875rem", "1.11rem",  "0.332vw", "1.375rem"),  { lineHeight: "1.3",  letterSpacing: "-0.005em" }], // H5
        "2xl": [fluido("1.375rem", "1.22rem",  "0.663vw", "1.75rem"),   { lineHeight: "1.25", letterSpacing: "-0.01em" }],  // H4
        "3xl": [fluido("1.625rem", "1.418rem", "0.884vw", "2.125rem"),  { lineHeight: "1.2",  letterSpacing: "-0.015em" }], // H3
        "4xl": [fluido("1.875rem", "1.512rem", "1.547vw", "2.75rem"),   { lineHeight: "1.15", letterSpacing: "-0.02em" }],  // H2
        "5xl": [fluido("2.25rem",  "1.732rem", "2.21vw",  "3.5rem"),    { lineHeight: "1.1",  letterSpacing: "-0.025em" }], // H1
        // D0 — o degrau de dobra. Só as telas de marketing usam; existe porque um
        // hero que preenche a dobra não cabe em H1, e inventar um tamanho solto no
        // meio do JSX seria pior que documentar o nível.
        "6xl": [fluido("2.75rem", "2.025rem", "3.094vw", "4.5rem"), { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        // Acima de D0 não há nível definido; fica fixo.
        "7xl": ["5.5rem", { lineHeight: "0.98" }],
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
