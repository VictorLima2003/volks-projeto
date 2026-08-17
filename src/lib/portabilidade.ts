import {
  AnexoHook,
  Apresentacao,
  Bloco,
  Condicao,
  Consentimento,
  Desfecho,
  Hook,
  ParametroHook,
  Regra,
  ehCondicional,
  ehConsulta,
} from "./types";

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

// --- Pesquisa ---------------------------------------------------------------

export const FORMATO_PESQUISA = "pesquisa-volkswagen@1";

/** O que uma pesquisa carrega ao viajar. Sem id, sem situação, sem histórico. */
export interface PesquisaPortavel {
  nome: string;
  descricao?: string;
  chamada?: string;
  apresentacao?: Apresentacao;
  /** A etapa fixa de autorização, com o texto que o autor escreveu. */
  consentimento?: Consentimento;
  blocos: Bloco[];
  desfechos?: Desfecho[];
  /**
   * Os critérios que decidem, e **uma** versão só.
   *
   * Levar o histórico de versões junto levaria também quem propôs, quem
   * publicou e quando — a trilha de auditoria de outra instalação, com nomes de
   * gente que talvez nem trabalhe aqui. O que viaja é a régua; a trilha começa
   * do zero em quem recebe, e é dele daí em diante.
   */
  regras?: Regra[];
  descricaoDasRegras?: string;
}

export function pesquisaParaArquivo(p: PesquisaPortavel): string {
  return JSON.stringify({ formato: FORMATO_PESQUISA, pesquisa: p }, null, 2);
}

/**
 * As fontes que esta pesquisa precisa para funcionar.
 *
 * Uma pesquisa não carrega os hooks junto: eles são da instalação, com código
 * que pode ler bases que só existem lá. Mas ela **depende** deles — um bloco de
 * consulta aponta para um `hookId`, e cada regra lê `<prefixo>.campo`. Sem
 * dizer isso na importação, a pesquisa entra parecendo inteira e só falha
 * quando alguém percorre a jornada.
 */
export function fontesCitadas(p: PesquisaPortavel): { hookIds: string[]; prefixos: string[] } {
  const hookIds = new Set<string>();
  const prefixos = new Set<string>();

  const daCondicao = (c: Condicao | undefined) => {
    if (!c) return;
    /* O prefixo é o que vem antes do primeiro ponto, e `resposta` não conta:
       esse não vem de fonte nenhuma, vem do próprio questionário. */
    const raiz = c.fato?.split(".")[0];
    if (raiz && raiz !== "resposta") prefixos.add(raiz);
    for (const sub of [...(c.todas ?? []), ...(c.qualquer ?? [])]) daCondicao(sub);
  };

  const andar = (blocos: Bloco[]) => {
    for (const b of blocos) {
      if (ehConsulta(b)) hookIds.add(b.hookId);
      if (ehCondicional(b)) {
        daCondicao(b.condicao);
        andar(b.entao);
        andar(b.senao);
      }
    }
  };

  andar(p.blocos);
  for (const r of p.regras ?? []) daCondicao(r.condicao);

  return { hookIds: [...hookIds], prefixos: [...prefixos] };
}

export function pesquisaDeArquivo(texto: string): Resultado<PesquisaPortavel> {
  let cru: unknown;
  try {
    cru = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "O arquivo não é um JSON válido." };
  }

  const env = (cru ?? {}) as { formato?: unknown; pesquisa?: unknown };
  if (env.formato !== FORMATO_PESQUISA) {
    return {
      ok: false,
      erro: `Este arquivo é "${String(env.formato ?? "sem formato")}", e aqui se importa "${FORMATO_PESQUISA}".`,
    };
  }

  const p = env.pesquisa as Partial<PesquisaPortavel> | undefined;
  if (!p || typeof p !== "object") {
    return { ok: false, erro: "O arquivo tem a marca de pesquisa, mas não traz a pesquisa." };
  }
  if (typeof p.nome !== "string" || !p.nome.trim()) {
    return { ok: false, erro: "A pesquisa no arquivo não tem nome." };
  }
  if (!Array.isArray(p.blocos)) {
    return { ok: false, erro: "A pesquisa no arquivo não tem blocos." };
  }

  /*
   * A árvore não é conferida campo a campo aqui: quem faz isso é
   * `validarPesquisa`, a mesma função que a tela de montagem usa. Repetir a
   * conferência daria duas listas de regras para manter em dia, e a segunda
   * envelheceria calada.
   */
  return {
    ok: true,
    valor: {
      nome: p.nome.trim(),
      descricao: typeof p.descricao === "string" ? p.descricao : undefined,
      chamada: typeof p.chamada === "string" ? p.chamada : undefined,
      apresentacao: p.apresentacao,
      consentimento: p.consentimento,
      blocos: p.blocos,
      desfechos: Array.isArray(p.desfechos) ? p.desfechos : undefined,
      regras: Array.isArray(p.regras) ? p.regras : undefined,
      descricaoDasRegras:
        typeof p.descricaoDasRegras === "string" ? p.descricaoDasRegras : undefined,
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
