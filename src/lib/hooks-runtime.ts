import "server-only";
import { Hook } from "./types";

export interface ResultadoHook {
  ok: boolean;
  /** Fatos devolvidos pelo código, para gravar sob o prefixo do hook. */
  fatos: Record<string, unknown>;
  erro?: string;
  /** Mensagens de `log()` do código, para o autor depurar. */
  logs: string[];
  duracaoMs: number;
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

const LIMITE_MS = 10_000;

// --------------------------------------------------------------------------
// Helpers oferecidos ao código do hook
// --------------------------------------------------------------------------

/** Converte texto CSV em lista de objetos, usando a primeira linha como cabeçalho. */
function parseCsv(texto: string): Record<string, string>[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (linhas.length < 2) return [];

  const cabecalho = linhas[0].split(",").map((h) => h.trim());
  return linhas.slice(1).map((linha) => {
    const celulas = linha.split(",").map((c) => c.trim());
    const registro: Record<string, string> = {};
    cabecalho.forEach((h, i) => (registro[h] = celulas[i] ?? ""));
    return registro;
  });
}

/** Normaliza documentos: 111.222.333-44 e 11122233344 viram a mesma chave. */
function normalizarChave(v: unknown): string {
  const s = String(v ?? "").trim();
  return /\d/.test(s) && /[.\-/]/.test(s) ? s.replace(/\D/g, "") : s.toLowerCase();
}

// --------------------------------------------------------------------------
// Execução
// --------------------------------------------------------------------------

/**
 * Roda o código do hook com os argumentos informados.
 *
 * O código é assíncrono, então `await fetch(...)` funciona direto — é assim
 * que um hook consome uma API externa. Anexos ficam disponíveis por `csv()`.
 *
 * LIMITAÇÕES CONHECIDAS (verificadas, não teóricas):
 *
 * 1. Isto executa JavaScript arbitrário no servidor. Não há isolamento real —
 *    o código enxerga o processo.
 *
 * 2. O timeout abaixo só interrompe espera ASSÍNCRONA (um fetch pendurado).
 *    Contra laço síncrono — `while (true) {}` — ele não serve: o event loop
 *    fica bloqueado e o próprio timer nunca dispara. Um hook assim derruba o
 *    servidor inteiro. Testado: derruba mesmo.
 *
 * A correção dos dois pontos é a mesma: rodar em worker isolado com limite de
 * CPU (isolated-vm, ou `worker_threads` com terminate). Fica registrado como
 * restrição em aberto, conforme combinado.
 */
export async function executarHook(
  hook: Hook,
  argumentos: Record<string, unknown>,
): Promise<ResultadoHook> {
  const inicio = Date.now();
  const logs: string[] = [];

  const anexos = new Map(hook.anexos.map((a) => [a.nome, a.conteudo]));

  /** Lê um anexo ou uma URL, sempre devolvendo linhas já convertidas. */
  const csv = async (nomeOuUrl: string): Promise<Record<string, string>[]> => {
    const anexo = anexos.get(nomeOuUrl);
    if (anexo !== undefined) return parseCsv(anexo);

    if (/^https?:\/\//i.test(nomeOuUrl)) {
      const res = await fetch(nomeOuUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`CSV remoto respondeu ${res.status}.`);
      return parseCsv(await res.text());
    }
    throw new Error(`Anexo "${nomeOuUrl}" não existe neste hook.`);
  };

  const log = (...partes: unknown[]) => {
    logs.push(partes.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join(" "));
  };

  const nomes = hook.parametros.map((p) => p.nome);
  const valores = nomes.map((n) => argumentos[n]);

  // Um nome inválido viraria "Unexpected number" na hora de montar a função —
  // erro que não diz nada a quem está no editor.
  const invalido = nomes.find((n) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n));
  if (invalido !== undefined) {
    return {
      ok: false,
      fatos: { encontrado: false, erro: true },
      erro: `"${invalido}" não serve como nome de parâmetro — ele vira uma variável no código, então precisa começar com letra e não pode ter espaços nem pontuação.`,
      logs,
      duracaoMs: Date.now() - inicio,
    };
  }

  try {
    const fn = new AsyncFunction(
      ...nomes,
      "csv",
      "log",
      "chave",
      `"use strict";\n${hook.codigo}`,
    );

    const execucao = fn(...valores, csv, log, normalizarChave);
    const comLimite = Promise.race([
      execucao,
      new Promise((_, rejeitar) =>
        setTimeout(() => rejeitar(new Error(`O hook passou de ${LIMITE_MS / 1000}s.`)), LIMITE_MS),
      ),
    ]);

    const saida = await comLimite;

    if (saida === null || saida === undefined) {
      return { ok: true, fatos: { encontrado: false }, logs, duracaoMs: Date.now() - inicio };
    }
    if (typeof saida !== "object" || Array.isArray(saida)) {
      throw new Error("O hook precisa retornar um objeto (ou null quando não encontrar).");
    }

    return {
      ok: true,
      // `encontrado` sempre existe: é o fato que as condicionais mais usam.
      fatos: { encontrado: true, ...(saida as Record<string, unknown>) },
      logs,
      duracaoMs: Date.now() - inicio,
    };
  } catch (e) {
    return {
      ok: false,
      fatos: { encontrado: false, erro: true },
      erro: e instanceof Error ? e.message : "Falha desconhecida no hook.",
      logs,
      duracaoMs: Date.now() - inicio,
    };
  }
}
