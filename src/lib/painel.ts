/**
 * Faixa de saudação das telas de painel — gestor e vendedor.
 *
 * São funções puras de propósito: não leem cookie nem store, e por isso podem
 * ser chamadas de qualquer componente sem arrastar `next/headers` junto. O nome
 * de quem está logado entra por parâmetro, vindo de `usuarioAtual()` na página.
 */

/** Saudação pela hora de Brasília, que é onde o time está. */
export function saudacaoAgora(nome: string): string {
  const h = Number(
    new Date().toLocaleString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }),
  );
  const parte = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return `${parte}, ${nome.split(" ")[0]}`;
}

/** "Segunda-feira, 10 de agosto" — sem caixa alta, que a regra 4 proíbe. */
export function dataPorExtenso(): string {
  const texto = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
