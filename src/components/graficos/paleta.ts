import { Desfecho } from "@/lib/types";

/**
 * As cores dos gráficos — validadas, não escolhidas no olho.
 *
 * A primeira versão deste arquivo usava oito degraus da escala `azul` como
 * paleta categórica. Rodando o validador, ela reprovou em três dos seis testes:
 * faixa de luminosidade, piso de croma e contraste. Faz sentido — uma rampa de
 * um matiz só é escala **sequencial**, não paleta de identidade, e usá-la como
 * categórica é o anti-padrão de "rampa de valor em categoria nominal".
 *
 * O que ficou no lugar:
 *
 * - **Categoria nominal (modelo, canal, cidade) usa UMA cor.** Não há identidade
 *   a distinguir numa barra ranqueada: o comprimento já diz quem é maior, e o
 *   rótulo ao lado diz quem é. Oito cores ali gastariam o único canal livre para
 *   repetir o que a barra mostra.
 *
 * - **Desfecho e efeito usam paleta DIVERGENTE**, porque o dado é polaridade:
 *   liberou de um lado, recusou do outro, e no meio quem ficou esperando. Verde
 *   ↔ cinza ↔ vermelho passou em separação para daltonismo (ΔE 19,1 no pior par
 *   sob protanopia) e em visão normal (23,9).
 *
 *   O cinza no meio é exigência da regra de divergente — o ponto neutro precisa
 *   ler como "nada" —, e coincide com uma decisão que o `design.md` já tinha
 *   tomado por outro caminho: *"pendente e revalidar não levam cor; não deram
 *   errado, estão esperando"*.
 *
 * **O que NÃO deu certo, registrado para ninguém tentar de novo:** usar o trio de
 * sinal do produto (verde/âmbar/vermelho) como paleta de gráfico. `#BB0B22` e
 * `#96560B` dão ΔE **1,1** sob deuteranopia — são a mesma cor para quem tem a
 * forma mais comum de daltonismo — e 12,9 em visão normal, abaixo do piso de 15.
 * Servem como selo, ao lado de um ícone e de uma palavra; não servem como as
 * fatias de uma rosca, onde a cor é o que separa.
 */

/**
 * A cor de série única. Todo gráfico de categoria nominal usa esta e só esta.
 * É o `vw-deep` da marca, degrau 900 da escala azul.
 */
export const SLOT1 = "#001E50";

/** Quem não é o assunto, quando um gráfico destaca uma série. */
export const APAGADO = "#C3C8D0"; // cinza-400

/**
 * Os três polos do divergente, por efeito no sistema.
 *
 * Chaves nas duas grafias — a crua, que viaja na URL, e a legível, que a tela
 * escreve — apontando para a mesma cor. Um desencontro aqui pintaria a legenda
 * de uma cor e a fatia de outra.
 */
export const POR_EFEITO: Record<string, string> = {
  libera: "#0E7C3A", // sucesso-500
  segura: "#606574", // cinza-600 — o neutro do divergente
  recusa: "#BB0B22", // erro-500
  Liberou: "#0E7C3A",
  Segurou: "#606574",
  Recusou: "#BB0B22",
};

/** O que sobrou do teto de fatias. Mais claro que o neutro, e nunca um polo. */
export const RESTO = "#9AA0AC"; // cinza-500

/** A ordem em que os polos aparecem: bom → neutro → ruim, sempre. */
const ORDEM_EFEITO: Record<string, number> = { libera: 0, segura: 1, recusa: 2 };

export function ordemDoEfeito(efeito?: string): number {
  return efeito ? (ORDEM_EFEITO[efeito] ?? 1) : 1;
}

/**
 * A cor de cada rótulo.
 *
 * `desfechos` é o que liga o rótulo escrito pelo autor ao efeito que ele tem no
 * sistema — é assim que "Ainda não é dessa vez" sabe que é o polo vermelho sem
 * ninguém escrever isso em lugar nenhum.
 *
 * Sem efeito conhecido, tudo recebe `SLOT1`: categoria nominal é série única.
 */
export function coresDe(rotulos: string[], desfechos?: Desfecho[]): Record<string, string> {
  const porNome = new Map((desfechos ?? []).map((d) => [d.rotulo, d.efeito]));
  const saida: Record<string, string> = {};

  for (const rotulo of rotulos) {
    if (rotulo.startsWith("Outros") || rotulo === "(sem resposta)") {
      saida[rotulo] = RESTO;
      continue;
    }
    const efeito = porNome.get(rotulo);
    saida[rotulo] = (efeito && POR_EFEITO[efeito]) || POR_EFEITO[rotulo] || SLOT1;
  }

  return saida;
}

/** Verdadeiro quando a paleta carrega significado — muda como a legenda se lê. */
export function temPolaridade(rotulos: string[], desfechos?: Desfecho[]): boolean {
  const porNome = new Map((desfechos ?? []).map((d) => [d.rotulo, d.efeito]));
  return rotulos.some((r) => porNome.has(r) || POR_EFEITO[r]);
}

/** Número com separador brasileiro. */
export function numero(n: number): string {
  return n.toLocaleString("pt-BR");
}

/**
 * Percentual curto — uma casa só abaixo de 10%, nenhuma acima.
 *
 * `<1%` em vez de `0%` para o que existe mas é pouco: escrever zero ao lado de
 * uma fatia desenhada é a tela se contradizendo.
 */
export function percentual(fracao: number): string {
  const p = fracao * 100;
  if (p > 0 && p < 1) return "<1%";
  return `${p < 10 ? p.toFixed(1) : Math.round(p)}%`;
}
