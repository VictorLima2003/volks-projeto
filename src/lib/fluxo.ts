import { Bloco, ehCondicional, ehFeedback } from "./types";

/**
 * Converte a árvore de blocos no grafo que a tela de fluxo desenha.
 *
 * A pesquisa é uma **árvore** — o condicional carrega `entao` e `senao` dentro
 * de si — e o canvas é um **grafo**. Esta função é a tradução entre os dois, e
 * mora aqui, fora do componente, porque é a parte que precisa estar certa: uma
 * seta a mais no desenho é uma promessa de caminho que o motor não cumpre.
 *
 * As três regras vêm de `passosVisiveis`, e não de intuição sobre fluxogramas:
 *
 * 1. Numa lista, cada bloco leva ao seguinte.
 * 2. Terminado um ramo, o fluxo **volta** para o bloco seguinte ao condicional.
 *    É o que o motor faz: o ramo é um desvio, não uma saída.
 * 3. Um fim de caminho encerra — nada depois dele é alcançável, então ele não
 *    tem seta de saída nem devolve o ramo para a sequência.
 *
 * Um ramo vazio liga direto ao bloco seguinte: é exatamente o que acontece na
 * jornada, e deixar o handle solto sugeriria um beco.
 */

export type TipoNo = "pergunta" | "condicional" | "consulta" | "feedback";

export interface NoFluxo {
  id: string;
  tipo: TipoNo;
  bloco: Bloco;
  /** Profundidade na árvore: 0 na raiz, +1 dentro de cada ramo. */
  nivel: number;
  /** Onde um bloco novo entra, se a pessoa adicionar a partir daqui. */
  destino: DestinoFluxo;
}

/** `null` é a raiz; o resto é um ramo de condicional. */
export type DestinoFluxo = { condicionalId: string; ramo: "entao" | "senao" } | null;

export interface ArestaFluxo {
  id: string;
  de: string;
  para: string;
  /** Preenchido só quando a aresta sai de um condicional. */
  ramo?: "entao" | "senao";
}

export interface Grafo {
  nos: NoFluxo[];
  arestas: ArestaFluxo[];
  /**
   * As pontas soltas do caminho principal — de onde um bloco novo continuaria.
   *
   * São várias quando o fluxo termina numa condicional: os dois ramos ficam
   * abertos, e o próximo bloco entra depois dos dois.
   */
  pontas: { de: string; ramo?: "entao" | "senao" }[];
}

function tipoDe(b: Bloco): TipoNo {
  if (ehCondicional(b)) return "condicional";
  if (ehFeedback(b)) return "feedback";
  return b.bloco === "consulta" ? "consulta" : "pergunta";
}

export function montarGrafo(blocos: Bloco[]): Grafo {
  const nos: NoFluxo[] = [];
  const arestas: ArestaFluxo[] = [];

  function ligar(de: string, para: string, ramo?: "entao" | "senao") {
    arestas.push({ id: `${de}->${para}${ramo ? `:${ramo}` : ""}`, de, para, ramo });
  }

  /**
   * Percorre uma lista e devolve as pontas soltas dela — os blocos de onde o
   * fluxo continua depois. São várias porque um condicional deixa duas.
   */
  function percorrer(
    lista: Bloco[],
    nivel: number,
    destino: DestinoFluxo,
    entrada: { de: string; ramo?: "entao" | "senao" }[],
  ): { de: string; ramo?: "entao" | "senao" }[] {
    let pendentes = entrada;

    for (const b of lista) {
      nos.push({ id: b.id, tipo: tipoDe(b), bloco: b, nivel, destino });
      for (const p of pendentes) ligar(p.de, b.id, p.ramo);

      if (ehFeedback(b)) {
        // Regra 3: fim de caminho não continua. Some das pendências.
        pendentes = [];
        continue;
      }

      if (ehCondicional(b)) {
        const saidas: { de: string; ramo?: "entao" | "senao" }[] = [];
        for (const ramo of ["entao", "senao"] as const) {
          const dentro = percorrer(b[ramo], nivel + 1, { condicionalId: b.id, ramo }, [
            { de: b.id, ramo },
          ]);
          saidas.push(...dentro);
        }
        // Regra 2: o que sobrou dos ramos volta para a sequência.
        pendentes = saidas;
        continue;
      }

      pendentes = [{ de: b.id }];
    }

    return pendentes;
  }

  const pontas = percorrer(blocos, 0, null, []);
  return { nos, arestas, pontas };
}
