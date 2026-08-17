import { AnexoHook, Hook, ParametroHook } from "./types";

/**
 * Levar uma peça de uma instalação para outra, por arquivo.
 *
 * O protótipo guarda tudo em memória, então "exportar" aqui não é backup: é o
 * jeito de tirar uma fonte da máquina de quem a escreveu e pôr na de quem vai
 * usá-la, sem os dois abrirem o mesmo servidor.
 *
 * O arquivo se identifica no campo `formato`. Sem isso, arrastar o arquivo
 * errado — uma pesquisa onde se espera uma fonte, um JSON qualquer — daria erro
 * de campo faltando, que manda quem lê procurar defeito no arquivo certo. Com a
 * marca, a recusa consegue dizer o que veio e o que se esperava.
 */

export const FORMATO_FONTE = "fonte-volkswagen@1";

type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };

/**
 * O `id` e o `ativo` ficam de fora.
 *
 * O id é da instalação, não da fonte: trazer o de origem faria a importação
 * sobrescrever silenciosamente um hook existente que tivesse o mesmo id.
 *
 * O `ativo` é decisão de quem recebe. Uma fonte chega desligada e quem importou
 * liga depois de ler o código — importar algo que já sai executando é o tipo de
 * coisa que ninguém espera de um arquivo.
 */
export function fonteParaArquivo(hook: Hook): string {
  const { nome, descricao, prefixo, parametros, mensagemCarregando, rotulos, codigo, anexos } =
    hook;
  return JSON.stringify(
    {
      formato: FORMATO_FONTE,
      fonte: {
        nome,
        descricao,
        prefixo,
        parametros,
        mensagemCarregando,
        rotulos,
        codigo,
        anexos,
      },
    },
    null,
    2,
  );
}

export function fonteDeArquivo(texto: string): Resultado<Omit<Hook, "id">> {
  let cru: unknown;
  try {
    cru = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "O arquivo não é um JSON válido." };
  }

  if (typeof cru !== "object" || cru === null) {
    return { ok: false, erro: "O arquivo não descreve uma fonte." };
  }

  const env = cru as { formato?: unknown; fonte?: unknown };
  if (env.formato !== FORMATO_FONTE) {
    return {
      ok: false,
      erro: `Este arquivo é "${String(env.formato ?? "sem formato")}", e aqui se importa "${FORMATO_FONTE}".`,
    };
  }

  const f = env.fonte as Partial<Hook> | undefined;
  if (!f || typeof f !== "object") {
    return { ok: false, erro: "O arquivo tem a marca de fonte, mas não traz a fonte." };
  }

  const texto_ = (v: unknown) => (typeof v === "string" ? v : undefined);
  const nome = texto_(f.nome);
  const prefixo = texto_(f.prefixo);
  const codigo = texto_(f.codigo);
  if (!nome || !prefixo || codigo === undefined) {
    return { ok: false, erro: "Falta nome, prefixo ou código." };
  }

  /*
   * Cada lista é peneirada item a item.
   *
   * O código do hook roda no servidor com o que estiver aqui; um parâmetro com
   * `nome` numérico ou um anexo sem conteúdo entrariam como `undefined` no
   * escopo e quebrariam longe daqui, na execução, com uma mensagem que não
   * aponta para o arquivo.
   */
  const parametros: ParametroHook[] = Array.isArray(f.parametros)
    ? f.parametros
        .filter((p): p is ParametroHook => !!p && typeof (p as ParametroHook).nome === "string")
        .map((p) => ({
          nome: p.nome,
          rotulo: texto_(p.rotulo) ?? p.nome,
          descricao: texto_(p.descricao),
        }))
    : [];

  const anexos: AnexoHook[] = Array.isArray(f.anexos)
    ? f.anexos
        .filter(
          (a): a is AnexoHook =>
            !!a &&
            typeof (a as AnexoHook).nome === "string" &&
            typeof (a as AnexoHook).conteudo === "string",
        )
        .map((a) => ({ nome: a.nome, conteudo: a.conteudo }))
    : [];

  const rotulos: Record<string, string> = {};
  if (f.rotulos && typeof f.rotulos === "object") {
    for (const [k, v] of Object.entries(f.rotulos)) {
      if (typeof v === "string") rotulos[k] = v;
    }
  }

  return {
    ok: true,
    valor: {
      nome,
      descricao: texto_(f.descricao) ?? "",
      prefixo,
      parametros,
      mensagemCarregando: texto_(f.mensagemCarregando) ?? "Consultando...",
      rotulos,
      codigo,
      anexos,
      ativo: false,
    },
  };
}

/**
 * Baixar um texto como arquivo, sem passar pelo servidor.
 *
 * O conteúdo já está no navegador; mandá-lo para uma rota só para ele voltar
 * seria uma ida e volta para nada.
 */
export function baixarTexto(nomeDoArquivo: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeDoArquivo;
  a.click();
  /* Sem revogar, o blob fica preso na memória da aba até ela fechar. */
  URL.revokeObjectURL(url);
}
