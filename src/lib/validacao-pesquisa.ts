import { perguntasAntesDe, todasAsPerguntas } from "./engine";
import { Bloco, ehCondicional, ehFeedback, ehPergunta } from "./types";

export interface Problema {
  blocoId: string | null;
  gravidade: "erro" | "aviso";
  mensagem: string;
}

const CHAVE_VALIDA = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * Valida a árvore inteira. Roda no cliente (feedback imediato) e no servidor
 * (a trava de verdade) — mesma função, mesmo resultado.
 */
export function validarPesquisa(blocos: Bloco[]): Problema[] {
  const problemas: Problema[] = [];
  const perguntas = todasAsPerguntas(blocos);

  if (perguntas.length === 0) {
    problemas.push({
      blocoId: null,
      gravidade: "erro",
      mensagem: "A pesquisa precisa de pelo menos uma pergunta.",
    });
    return problemas;
  }

  // Chaves duplicadas em qualquer ponto da árvore sobrescreveriam respostas.
  const contagem = new Map<string, number>();
  for (const p of perguntas) contagem.set(p.campo, (contagem.get(p.campo) ?? 0) + 1);

  for (const p of perguntas) {
    if (!p.rotulo.trim()) {
      problemas.push({
        blocoId: p.id,
        gravidade: "erro",
        mensagem: "A pergunta precisa de um enunciado.",
      });
    }
    if (!p.campo.trim()) {
      problemas.push({
        blocoId: p.id,
        gravidade: "erro",
        mensagem: "A pergunta precisa de um identificador.",
      });
    } else if (!CHAVE_VALIDA.test(p.campo)) {
      problemas.push({
        blocoId: p.id,
        gravidade: "erro",
        mensagem: `O identificador "${p.campo}" deve começar com letra e usar só letras, números e _.`,
      });
    } else if ((contagem.get(p.campo) ?? 0) > 1) {
      problemas.push({
        blocoId: p.id,
        gravidade: "erro",
        mensagem: `O identificador "${p.campo}" é usado por mais de uma pergunta. Cada resposta precisa do seu.`,
      });
    }

    if ((p.tipo === "opcao" || p.tipo === "multipla") && (p.opcoes?.filter((o) => o.trim()).length ?? 0) < 2) {
      problemas.push({
        blocoId: p.id,
        gravidade: "erro",
        mensagem: "Perguntas de escolha precisam de pelo menos duas opções.",
      });
    }
  }

  validarCondicionais(blocos, blocos, problemas);
  validarFinais(blocos, problemas);
  return problemas;
}

/** O feedback encerra o caminho: nada depois dele na mesma lista é alcançável. */
function validarFinais(lista: Bloco[], problemas: Problema[]) {
  lista.forEach((b, i) => {
    if (ehFeedback(b)) {
      const depois = lista.length - 1 - i;
      if (depois > 0) {
        problemas.push({
          blocoId: b.id,
          gravidade: "erro",
          mensagem: `Esta tela final encerra o caminho, mas há ${depois} bloco(s) depois dela — que ninguém alcançaria. Mova-a para o fim ou remova o que vem depois.`,
        });
      }
      if (!b.titulo.trim()) {
        problemas.push({
          blocoId: b.id,
          gravidade: "erro",
          mensagem: "A tela final precisa de um título.",
        });
      }
    } else if (ehCondicional(b)) {
      validarFinais(b.entao, problemas);
      validarFinais(b.senao, problemas);
    }
  });
}

function validarCondicionais(raiz: Bloco[], lista: Bloco[], problemas: Problema[]) {
  for (const b of lista) {
    if (!ehCondicional(b)) continue;

    if (b.entao.length === 0 && b.senao.length === 0) {
      problemas.push({
        blocoId: b.id,
        gravidade: "aviso",
        mensagem: "Condicional sem nenhum bloco nos dois ramos — ela não faz nada.",
      });
    }

    const fato = b.condicao.fato ?? "";
    if (fato.startsWith("resposta.")) {
      const dependeDe = fato.slice("resposta.".length);
      const existe = todasAsPerguntas(raiz).some((p) => p.campo === dependeDe);
      if (!existe) {
        problemas.push({
          blocoId: b.id,
          gravidade: "aviso",
          mensagem: `A condição usa "${dependeDe}", que nenhuma pergunta desta pesquisa responde.`,
        });
      } else {
        // A resposta precisa ter sido coletada ANTES da condicional, senão o
        // ramo nunca abre: no momento da avaliação o campo ainda está vazio.
        const disponiveis = perguntasAntesDe(raiz, b.id).map((p) => p.campo);
        if (!disponiveis.includes(dependeDe)) {
          problemas.push({
            blocoId: b.id,
            gravidade: "erro",
            mensagem: `A condição depende de "${dependeDe}", que só é perguntada depois. Mova a condicional para baixo ou a pergunta para cima.`,
          });
        }
      }
    }

    validarCondicionais(raiz, b.entao, problemas);
    validarCondicionais(raiz, b.senao, problemas);
  }
}

export function temErro(problemas: Problema[]): boolean {
  return problemas.some((p) => p.gravidade === "erro");
}

/** Todos os identificadores em uso, para sugerir um novo sem colidir. */
export function identificadoresEmUso(blocos: Bloco[]): string[] {
  return todasAsPerguntas(blocos).map((p) => p.campo);
}

export function sugerirIdentificador(rotulo: string, emUso: string[]): string {
  const base =
    rotulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .map((palavra, i) =>
        i === 0 ? palavra.toLowerCase() : palavra[0].toUpperCase() + palavra.slice(1).toLowerCase(),
      )
      .join("") || "campo";

  const inicial = /^[a-zA-Z]/.test(base) ? base : `campo${base}`;
  if (!emUso.includes(inicial)) return inicial;
  let n = 2;
  while (emUso.includes(`${inicial}${n}`)) n++;
  return `${inicial}${n}`;
}

/** Utilidades de árvore usadas pelo construtor. */
export function removerBloco(blocos: Bloco[], id: string): Bloco[] {
  return blocos
    .filter((b) => b.id !== id)
    .map((b) =>
      ehCondicional(b)
        ? { ...b, entao: removerBloco(b.entao, id), senao: removerBloco(b.senao, id) }
        : b,
    );
}

export function atualizarBloco(blocos: Bloco[], id: string, patch: Partial<Bloco>): Bloco[] {
  return blocos.map((b) => {
    if (b.id === id) return { ...b, ...patch } as Bloco;
    if (ehCondicional(b)) {
      return {
        ...b,
        entao: atualizarBloco(b.entao, id, patch),
        senao: atualizarBloco(b.senao, id, patch),
      };
    }
    return b;
  });
}

/** Insere um bloco numa lista específica (raiz ou ramo de uma condicional). */
export function inserirEm(
  blocos: Bloco[],
  destino: { condicionalId: string; ramo: "entao" | "senao" } | null,
  novo: Bloco,
): Bloco[] {
  if (!destino) return [...blocos, novo];
  return blocos.map((b) => {
    if (!ehCondicional(b)) return b;
    if (b.id === destino.condicionalId) {
      return { ...b, [destino.ramo]: [...b[destino.ramo], novo] } as Bloco;
    }
    return {
      ...b,
      entao: inserirEm(b.entao, destino, novo),
      senao: inserirEm(b.senao, destino, novo),
    };
  });
}

/** Move um bloco dentro da lista em que ele já está. */
export function moverNaLista(blocos: Bloco[], id: string, delta: number): Bloco[] {
  const i = blocos.findIndex((b) => b.id === id);
  if (i >= 0) {
    const j = i + delta;
    if (j < 0 || j >= blocos.length) return blocos;
    const copia = [...blocos];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return copia;
  }
  return blocos.map((b) =>
    ehCondicional(b)
      ? { ...b, entao: moverNaLista(b.entao, id, delta), senao: moverNaLista(b.senao, id, delta) }
      : b,
  );
}

/** Reordena por arrasto: tira o bloco de onde está e põe antes do alvo, na mesma lista. */
export function reordenarPara(blocos: Bloco[], arrastadoId: string, alvoId: string): Bloco[] {
  const iA = blocos.findIndex((b) => b.id === arrastadoId);
  const iB = blocos.findIndex((b) => b.id === alvoId);

  if (iA >= 0 && iB >= 0) {
    const copia = [...blocos];
    const [movido] = copia.splice(iA, 1);
    copia.splice(copia.findIndex((b) => b.id === alvoId), 0, movido);
    return copia;
  }
  // Não estão nesta lista: desce para os ramos.
  return blocos.map((b) =>
    ehCondicional(b)
      ? {
          ...b,
          entao: reordenarPara(b.entao, arrastadoId, alvoId),
          senao: reordenarPara(b.senao, arrastadoId, alvoId),
        }
      : b,
  );
}
