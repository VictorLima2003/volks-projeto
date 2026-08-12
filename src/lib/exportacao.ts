import { acharDesfecho, desfechosDa, Pesquisa, SessaoMotorista } from "./types";

/**
 * As submissões em formato tabular — o mesmo dado para o CSV e para a API.
 *
 * Uma função só porque as duas saídas precisam concordar: se a coluna existe no
 * download e não na API, quem cruzar os dois vai achar que perdeu registro.
 *
 * As colunas são **descobertas do dado**, não declaradas: cada identificador de
 * resposta vira `resposta.<campo>` e cada fato de hook vira `<prefixo>.<campo>`.
 * Uma lista fixa aqui seria o vocabulário de uma pesquisa entrando no produto.
 */

export interface LinhaExportada {
  [coluna: string]: string | number | boolean | null;
}

const FIXAS = [
  "submissao_id",
  "pesquisa_id",
  "pesquisa_nome",
  "identificador",
  "estado",
  "iniciada_em",
  "atualizada_em",
  "desfecho_id",
  "desfecho",
  "efeito",
  "motivo",
  "regras_versao",
  "consulta_falhou",
] as const;

export function linhasDeSubmissao(
  sessoes: SessaoMotorista[],
  pesquisas: Pesquisa[],
): { colunas: string[]; linhas: LinhaExportada[] } {
  const porId = new Map(pesquisas.map((p) => [p.id, p]));
  const dinamicas = new Set<string>();

  const linhas = sessoes.map((s) => {
    const pesquisa = porId.get(s.pesquisaId);
    const desfecho = s.resultado
      ? acharDesfecho(pesquisa ? desfechosDa(pesquisa) : undefined, s.resultado.tipo)
      : null;

    const linha: LinhaExportada = {
      submissao_id: s.id,
      pesquisa_id: s.pesquisaId,
      pesquisa_nome: pesquisa?.nome ?? "",
      identificador: s.cpf ?? "",
      estado: s.status,
      iniciada_em: s.iniciadaEm,
      atualizada_em: s.atualizadaEm,
      desfecho_id: s.resultado?.tipo ?? "",
      desfecho: desfecho?.rotulo ?? "",
      efeito: s.resultado?.efeito ?? "",
      motivo: s.resultado?.motivo ?? "",
      regras_versao: s.ruleSetVersao ?? "",
      consulta_falhou: Object.values(s.externos ?? {}).some((f) => f?.erro === true),
    };

    for (const [campo, valor] of Object.entries(s.respostas ?? {})) {
      const coluna = `resposta.${campo}`;
      dinamicas.add(coluna);
      linha[coluna] = normalizar(valor);
    }

    for (const [prefixo, fatos] of Object.entries(s.externos ?? {})) {
      for (const [campo, valor] of Object.entries(fatos ?? {})) {
        const coluna = `${prefixo}.${campo}`;
        dinamicas.add(coluna);
        linha[coluna] = normalizar(valor);
      }
    }

    return linha;
  });

  return { colunas: [...FIXAS, ...[...dinamicas].sort()], linhas };
}

function normalizar(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return v;
  return JSON.stringify(v);
}

/**
 * CSV com `;` e BOM.
 *
 * Não é preferência: o Excel em português lê `,` como separador decimal e joga
 * a linha inteira numa célula só. O BOM é o que faz ele abrir em UTF-8 em vez
 * de quebrar os acentos. Quem consome por Python ou R passa `sep=';'` e segue.
 */
export function paraCsv(colunas: string[], linhas: LinhaExportada[]): string {
  const celula = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const texto = String(v);
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const corpo = linhas.map((l) => colunas.map((c) => celula(l[c])).join(";"));
  return "﻿" + [colunas.join(";"), ...corpo].join("\r\n");
}
