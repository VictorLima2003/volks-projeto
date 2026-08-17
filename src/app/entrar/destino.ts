/**
 * Para onde mandar depois de entrar.
 *
 * Só caminho de dentro do site: um `de` com endereço completo faria esta tela
 * despachar gente para fora — o velho truque de mandar um link de login que,
 * depois de aceito, joga a pessoa num site parecido.
 *
 * Mora fora do `page.tsx` porque um módulo de página do Next só pode exportar o
 * que ele espera; qualquer outra exportação quebra a verificação de tipos da
 * rota.
 */
export function destinoSeguro(de: string | undefined, area: "gestor" | "vendedor") {
  if (!de || !de.startsWith("/") || de.startsWith("//")) {
    return area === "vendedor" ? "/vendedor" : "/gestor/pesquisas";
  }
  return de;
}
