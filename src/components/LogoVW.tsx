/**
 * Símbolo Volkswagen desenhado em traço, como no logo atual da marca.
 * Usa `currentColor` para herdar a cor de quem o renderiza.
 *
 * Construção: um anel externo, o "V" no topo e o "W" abaixo, unidos no
 * mesmo vértice central — é assim que o mark original se encaixa.
 */
export function LogoVW({
  className = "",
  titulo = "Volkswagen",
  decorativo = false,
}: {
  className?: string;
  titulo?: string;
  /** Use quando o elemento em volta (um link, por exemplo) já tem rótulo próprio. */
  decorativo?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      {...(decorativo
        ? { "aria-hidden": true as const }
        : { role: "img", "aria-label": titulo })}
      fill="none"
      stroke="currentColor"
      strokeWidth={6}
      strokeLinejoin="miter"
      /* Limite baixo corta a ponta do vértice: sem ele, os bicos do V e do W
         se esticam e se fundem num borrão no centro. */
      strokeMiterlimit={3}
    >
      <circle cx="50" cy="50" r="45" />
      {/* V — desce até uma ponta, logo acima do pico central do W */}
      <path d="M35 21 L50 46 L65 21" />
      {/* W — braços externos, os dois vales e o pico central */}
      <path d="M18 29 L35 79 L50 56 L65 79 L82 29" />
    </svg>
  );
}
