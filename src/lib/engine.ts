import {
  Bloco,
  BlocoConsulta,
  BlocoFeedback,
  BlocoPergunta,
  Condicao,
  DecisaoResultado,
  ehCondicional,
  ehConsulta,
  ehFeedback,
  ehPergunta,
  Hook,
  Operador,
  Regra,
  RuleSet,
  acharDesfecho,
  Desfecho,
  DESFECHOS_PADRAO,
} from "./types";

// --------------------------------------------------------------------------
// Motor de fatos: respostas + retornos de hook num único dicionário
// --------------------------------------------------------------------------
/**
 * Dicionário de fatos.
 *
 * `resposta` guarda o que foi respondido na pesquisa; toda outra chave é o
 * prefixo de um hook que executou durante o fluxo. O motor não conhece
 * nenhuma fonte por nome — tudo entra por hook.
 */
export interface Fatos {
  resposta: Record<string, unknown>;
  [prefixo: string]: Record<string, unknown>;
}

export function montarFatos(
  respostas: Record<string, unknown>,
  /** Fatos trazidos pelos blocos de consulta, agrupados por prefixo do hook. */
  externos: Record<string, Record<string, unknown>> = {},
): Fatos {
  return { ...externos, resposta: respostas };
}

// --------------------------------------------------------------------------
// Resolver caminho como "credito.score" ou "resposta.modelo"
// --------------------------------------------------------------------------
function resolveFato(caminho: string, fatos: Fatos): unknown {
  if (!caminho) return undefined;
  const partes = caminho.split(".");
  let atual: unknown = fatos;
  for (const p of partes) {
    if (atual == null || typeof atual !== "object") return undefined;
    atual = (atual as Record<string, unknown>)[p];
  }
  return atual;
}

// --------------------------------------------------------------------------
// Avaliar condição (com AND/OR aninhados)
// --------------------------------------------------------------------------
export function avaliarCondicao(cond: Condicao, fatos: Fatos): boolean {
  // Grupos AND / OR (o campo "fato" fica vazio quando é grupo)
  if (cond.todas && cond.todas.length > 0) {
    return cond.todas.every((c) => avaliarCondicao(c, fatos));
  }
  if (cond.qualquer && cond.qualquer.length > 0) {
    return cond.qualquer.some((c) => avaliarCondicao(c, fatos));
  }

  const esquerda = resolveFato(cond.fato, fatos);

  // O lado direito é um literal ou outro fato — comparar resposta com resposta
  // é o que tira a amarra de valores fixos no meio da regra.
  const direita = cond.valorFato ? resolveFato(cond.valorFato, fatos) : cond.valor;

  switch (cond.operador) {
    case "=":  return iguais(esquerda, direita);
    case "!=": return !iguais(esquerda, direita);
    case ">":  return compararNumeros(esquerda, direita, (a, b) => a > b);
    case ">=": return compararNumeros(esquerda, direita, (a, b) => a >= b);
    case "<":  return compararNumeros(esquerda, direita, (a, b) => a < b);
    case "<=": return compararNumeros(esquerda, direita, (a, b) => a <= b);
    case "contem":
      return texto(esquerda).includes(texto(direita));
    case "naoContem":
      return !texto(esquerda).includes(texto(direita));
    case "comecaCom":
      return texto(esquerda).startsWith(texto(direita));
    case "in":
      return Array.isArray(direita) && (direita as unknown[]).includes(esquerda);
    case "notIn":
      return Array.isArray(direita) && !(direita as unknown[]).includes(esquerda);
    case "exists":
      return esquerda !== undefined && esquerda !== null && esquerda !== "";
    case "missing":
      return esquerda === undefined || esquerda === null || esquerda === "";
    case "truthy":
      return Boolean(esquerda);
    case "falsy":
      return !esquerda;
    default:
      return false;
  }
}

/** Converte para número quando os dois lados representam número. */
function comoNumero(v: unknown): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Comparações de ordem aceitam número guardado como texto. Sem isso, um limiar
 * digitado no editor ("500") nunca casaria com um fato numérico (500).
 */
function compararNumeros(a: unknown, b: unknown, cmp: (x: number, y: number) => boolean): boolean {
  const na = comoNumero(a);
  const nb = comoNumero(b);
  if (na === null || nb === null) return false;
  return cmp(na, nb);
}

/** Igualdade tolerante: "500" e 500 são o mesmo valor para quem preencheu. */
function iguais(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const na = comoNumero(a);
  const nb = comoNumero(b);
  if (na !== null && nb !== null) return na === nb;
  if (typeof a === "boolean" || typeof b === "boolean") {
    return Boolean(a) === (b === "true" || b === true);
  }
  return texto(a) === texto(b);
}

function texto(v: unknown): string {
  return String(v ?? "").toLowerCase();
}

/** Caminhos de fato usados por uma condição, incluindo grupos aninhados. */
function caminhosDe(cond: Condicao): string[] {
  if (cond.todas?.length) return cond.todas.flatMap(caminhosDe);
  if (cond.qualquer?.length) return cond.qualquer.flatMap(caminhosDe);
  return [cond.fato, cond.valorFato].filter((c): c is string => Boolean(c));
}

/**
 * Snapshot dos fatos que a regra leu, para a decisão ficar explicável sem
 * que o motor precise conhecer nome de campo nenhum.
 */
function fatosCitadosPor(cond: Condicao, fatos: Fatos): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const caminho of caminhosDe(cond)) {
    saida[caminho] = resolveFato(caminho, fatos);
  }
  return saida;
}

// --------------------------------------------------------------------------
// Aplicar regras (por prioridade crescente → 1ª que casar vence)
// --------------------------------------------------------------------------
/**
 * A primeira regra que casa decide.
 *
 * `desfechos` entra porque a decisão grava o **efeito** junto: a sessão é
 * histórico, e o que o desfecho fazia no dia é o que vale para o pedido que foi
 * liberado naquele dia — mesmo que alguém mude o desfecho depois.
 */
export function decidir(
  ruleSet: RuleSet,
  fatos: Fatos,
  desfechos: Desfecho[] = DESFECHOS_PADRAO,
): DecisaoResultado {
  const ordenadas = [...ruleSet.regras].sort((a, b) => a.prioridade - b.prioridade);
  for (const regra of ordenadas) {
    if (avaliarCondicao(regra.condicao, fatos)) {
      return {
        tipo: regra.resultado,
        efeito: acharDesfecho(desfechos, regra.resultado).efeito,
        motivo: regra.motivo,
        proximaAcao: regra.proximaAcao,
        regraAplicadaId: regra.id,
        ruleSetVersao: ruleSet.versao,
        decididoEm: new Date().toISOString(),
        // Guarda os fatos que a regra realmente leu — é o que explica a
        // decisão depois, sem o motor precisar saber que campos existem.
        contexto: fatosCitadosPor(regra.condicao, fatos),
      };
    }
  }
  return {
    tipo: "erro",
    efeito: acharDesfecho(desfechos, "erro").efeito,
    motivo: "Nenhuma regra aplicável — verifique a régua desta pesquisa.",
    ruleSetVersao: ruleSet.versao,
    decididoEm: new Date().toISOString(),
    contexto: {},
  };
}

// --------------------------------------------------------------------------
// Avaliação com rastro: por que cada regra casou ou não
// --------------------------------------------------------------------------
export interface PassoTrace {
  regraId: string;
  nome: string;
  prioridade: number;
  /** Id do desfecho que a regra produz. */
  resultado: string;
  casou: boolean;
  vencedora: boolean;
  /** "credito.score ≥ 700" com o valor real observado ao lado */
  termos: TermoTrace[];
}

export interface TermoTrace {
  fato: string;
  operador: Operador;
  esperado?: unknown;
  observado: unknown;
  casou: boolean;
  /** Profundidade em grupos AND/OR, para indentar na UI */
  nivel: number;
  grupo?: "todas" | "qualquer";
}

/**
 * Roda o RuleSet inteiro sem parar na primeira que casa, marcando qual venceu.
 * É o que alimenta o simulador — o `decidir` continua sendo o caminho de produção.
 */
export function decidirComTrace(
  ruleSet: RuleSet,
  fatos: Fatos,
  desfechos: Desfecho[] = DESFECHOS_PADRAO,
): { decisao: DecisaoResultado; trace: PassoTrace[] } {
  const ordenadas = [...ruleSet.regras].sort((a, b) => a.prioridade - b.prioridade);
  const trace: PassoTrace[] = [];
  let vencedoraId: string | null = null;

  for (const regra of ordenadas) {
    const casou = avaliarCondicao(regra.condicao, fatos);
    const primeiraQueCasa = casou && vencedoraId === null;
    if (primeiraQueCasa) vencedoraId = regra.id;
    trace.push({
      regraId: regra.id,
      nome: regra.nome,
      prioridade: regra.prioridade,
      resultado: regra.resultado,
      casou,
      vencedora: primeiraQueCasa,
      termos: explodirTermos(regra.condicao, fatos, 0),
    });
  }

  return { decisao: decidir(ruleSet, fatos, desfechos), trace };
}

/** Achata a condição em termos individuais, cada um com o valor realmente observado. */
function explodirTermos(cond: Condicao, fatos: Fatos, nivel: number): TermoTrace[] {
  if (cond.todas && cond.todas.length > 0) {
    return cond.todas.flatMap((c) =>
      explodirTermos(c, fatos, nivel + 1).map((t) => ({ ...t, grupo: "todas" as const })),
    );
  }
  if (cond.qualquer && cond.qualquer.length > 0) {
    return cond.qualquer.flatMap((c) =>
      explodirTermos(c, fatos, nivel + 1).map((t) => ({ ...t, grupo: "qualquer" as const })),
    );
  }
  return [
    {
      fato: cond.fato,
      operador: cond.operador,
      esperado: cond.valor,
      observado: lerFato(cond.fato, fatos),
      casou: avaliarCondicao(cond, fatos),
      nivel,
    },
  ];
}

/** Exposto para a UI mostrar o valor real por trás de cada fato. */
export function lerFato(caminho: string, fatos: Fatos): unknown {
  return resolveFato(caminho, fatos);
}

/**
 * Diff entre duas versões, em linguagem de negócio.
 * Usado tanto na tela de regras quanto na fila de revisão.
 */
export function diffRuleSets(atual: RuleSet, anterior?: RuleSet): string[] {
  if (!anterior) return [];
  const linhas: string[] = [];
  const antesPorId = new Map(anterior.regras.map((r) => [r.id, r]));
  const agoraPorId = new Map(atual.regras.map((r) => [r.id, r]));

  for (const r of atual.regras) {
    const antes = antesPorId.get(r.id);
    if (!antes) {
      linhas.push(`+ Regra criada: "${r.nome}"`);
      continue;
    }
    if (antes.nome !== r.nome) linhas.push(`~ "${antes.nome}" renomeada para "${r.nome}"`);
    if (antes.prioridade !== r.prioridade)
      linhas.push(`~ "${r.nome}": prioridade ${antes.prioridade} → ${r.prioridade}`);
    if (antes.resultado !== r.resultado)
      linhas.push(
        `~ "${r.nome}": resultado ${resultadoLabel(antes.resultado)} → ${resultadoLabel(r.resultado)}`,
      );
    if (JSON.stringify(antes.condicao) !== JSON.stringify(r.condicao))
      linhas.push(`~ "${r.nome}": condição agora é ${explicarRegra(r).split(": ").slice(1).join(": ")}`);
    if (antes.motivo !== r.motivo) linhas.push(`~ "${r.nome}": mensagem ao motorista alterada`);
    if ((antes.proximaAcao ?? "") !== (r.proximaAcao ?? ""))
      linhas.push(`~ "${r.nome}": próxima ação alterada`);
  }
  for (const r of anterior.regras) {
    if (!agoraPorId.has(r.id)) linhas.push(`− Regra removida: "${r.nome}"`);
  }
  return linhas;
}

// Não existe mais lista fixa de fatos: tudo vem das perguntas da pesquisa e
// dos hooks cadastrados. O motor não conhece nenhuma fonte por nome.

/**
 * Fatos das fontes externas, deduzidos do script de cada uma.
 * O script é JS livre, então lemos as chaves do objeto que ele retorna —
 * é uma leitura estática simples, suficiente para popular o seletor.
 */
/**
 * Palpite de tipo a partir do que está escrito depois dos dois-pontos.
 *
 * Só literais: `14` é número, `true` é booleano, `"ativo"` é texto. Qualquer
 * outra coisa — uma variável, uma chamada, uma conta — vira `desconhecido`, e
 * aí a tela oferece todos os operadores em vez de adivinhar errado. Errar para
 * "texto", que era o comportamento anterior, escondia as comparações numéricas.
 */
function palpiteDeTipo(bruto: string): TipoFato {
  const v = bruto.trim();
  if (/^-?\d+(\.\d+)?\b/.test(v)) return "numero";
  if (/^(true|false)\b/.test(v)) return "booleano";
  if (/^['"`]/.test(v)) return "texto";
  return "desconhecido";
}

export function fatosDoHook(hooks: { prefixo: string; codigo: string; nome: string }[]) {
  const saida: { chave: string; rotulo: string; tipo: TipoFato }[] = [];
  for (const f of hooks) {
    saida.push({
      chave: `${f.prefixo}.encontrado`,
      rotulo: `${f.nome}: encontrado`,
      tipo: "booleano",
    });
    // Captura `nomeDaChave: valor` dentro do objeto retornado pelo código.
    const achados = new Map<string, TipoFato>();
    for (const m of f.codigo.matchAll(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/gm)) {
      /* Primeira ocorrência ganha: hooks costumam devolver o objeto completo no
         caminho feliz e um objeto reduzido no `if (!achou)`, onde os mesmos
         campos aparecem como `null`. */
      if (!achados.has(m[1])) achados.set(m[1], palpiteDeTipo(m[2]));
    }
    for (const [k, tipo] of achados) {
      saida.push({ chave: `${f.prefixo}.${k}`, rotulo: `${f.nome}: ${k}`, tipo });
    }
  }
  return saida;
}

// --------------------------------------------------------------------------
// Catálogo de fatos: o que está disponível para comparar, e de onde vem
// --------------------------------------------------------------------------
/**
 * `desconhecido` é o tipo dos fatos que vêm de hook.
 *
 * O hook é código: o que ele devolve só se sabe rodando. Chutar "texto" — que
 * era o que acontecia — não era um detalhe de rótulo: o seletor de operador
 * some com "maior que" e "menor que" para texto, e não havia como escrever
 * "meses de app maior ou igual a 6" pela tela. Sem tipo declarado, o certo é
 * oferecer tudo e deixar a comparação com quem conhece o dado.
 */
export type TipoFato = "numero" | "texto" | "booleano" | "desconhecido";

export interface ItemDeFato {
  chave: string;
  rotulo: string;
  tipo: TipoFato;
  /** Valores conhecidos, quando a pergunta é de escolha. */
  opcoes?: string[];
}

export interface GrupoDeFatos {
  grupo: string;
  itens: ItemDeFato[];
}

function tipoDaPergunta(p: BlocoPergunta): TipoFato {
  if (p.tipo === "numero") return "numero";
  if (p.tipo === "consentimento") return "booleano";
  return "texto";
}

/**
 * Monta o que pode ser comparado num ponto da árvore.
 * `ateBlocoId` limita às respostas já coletadas antes daquele bloco — depender
 * de algo ainda não perguntado deixaria a condição sempre falsa.
 */
export function catalogoDeFatos(
  blocos: Bloco[],
  hooks: { prefixo: string; nome: string; codigo: string; ativo?: boolean }[],
  ateBlocoId?: string,
): GrupoDeFatos[] {
  const grupos: GrupoDeFatos[] = [];

  const perguntas = ateBlocoId ? perguntasAntesDe(blocos, ateBlocoId) : todasAsPerguntas(blocos);
  if (perguntas.length > 0) {
    grupos.push({
      grupo: "Respostas da pesquisa",
      itens: perguntas.map((p) => ({
        chave: `resposta.${p.campo}`,
        rotulo: p.rotulo || p.campo,
        tipo: tipoDaPergunta(p),
        opcoes: p.opcoes,
      })),
    });
  }

  for (const f of hooks) {
    const itens = fatosDoHook([f]).map((i) => ({
      chave: i.chave,
      rotulo: i.rotulo.replace(`${f.nome}: `, ""),
      tipo: i.tipo,
    }));
    if (itens.length > 0) {
      grupos.push({ grupo: `Hook: ${f.nome}`, itens });
    }
  }

  return grupos.filter((g) => g.itens.length > 0);
}

/**
 * Resolve os argumentos de um bloco de consulta a partir das respostas.
 * Um valor entre aspas é literal; o resto é identificador de resposta.
 */
export function resolverArgumentos(
  bloco: BlocoConsulta,
  respostas: Record<string, unknown>,
): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [param, origem] of Object.entries(bloco.argumentos ?? {})) {
    if (!origem) { saida[param] = undefined; continue; }
    const literal = /^['"](.*)['"]$/.exec(origem);
    saida[param] = literal ? literal[1] : respostas[origem];
  }
  return saida;
}

export function acharFato(grupos: GrupoDeFatos[], chave: string): ItemDeFato | undefined {
  for (const g of grupos) {
    const achado = g.itens.find((i) => i.chave === chave);
    if (achado) return achado;
  }
  return undefined;
}

/** Operadores que fazem sentido para cada tipo — menos ruído no seletor. */
export function operadoresPara(tipo: TipoFato | undefined): typeof OPERADORES {
  if (tipo === "numero") {
    return OPERADORES.filter((o) =>
      [">", ">=", "<", "<=", "=", "!=", "exists", "missing"].includes(o.valor),
    );
  }
  if (tipo === "booleano") {
    return OPERADORES.filter((o) => ["truthy", "falsy", "=", "!="].includes(o.valor));
  }
  if (tipo === "texto") {
    return OPERADORES.filter((o) =>
      ["=", "!=", "contem", "naoContem", "comecaCom", "exists", "missing"].includes(o.valor),
    );
  }
  /* Tipo desconhecido — fato de hook sem literal para inspecionar. Todos os
     operadores: cortar a lista aqui é esconder comparações que o motor faz. */
  return OPERADORES;
}

export const OPERADORES: { valor: Operador; rotulo: string; usaValor: boolean }[] = [
  { valor: ">=", rotulo: "maior ou igual a", usaValor: true },
  { valor: ">", rotulo: "maior que", usaValor: true },
  { valor: "<=", rotulo: "menor ou igual a", usaValor: true },
  { valor: "<", rotulo: "menor que", usaValor: true },
  { valor: "=", rotulo: "igual a", usaValor: true },
  { valor: "!=", rotulo: "diferente de", usaValor: true },
  { valor: "contem", rotulo: "contém", usaValor: true },
  { valor: "naoContem", rotulo: "não contém", usaValor: true },
  { valor: "comecaCom", rotulo: "começa com", usaValor: true },
  { valor: "truthy", rotulo: "é verdadeiro", usaValor: false },
  { valor: "falsy", rotulo: "é falso", usaValor: false },
  { valor: "exists", rotulo: "existe", usaValor: false },
  { valor: "missing", rotulo: "não existe", usaValor: false },
];

// --------------------------------------------------------------------------
// Percurso da árvore: quais perguntas aparecem para estes fatos
// --------------------------------------------------------------------------

/**
 * Achata a árvore em uma sequência de perguntas, entrando apenas no ramo que
 * a condição resolver. Cada condicional é reavaliada a cada chamada — é assim
 * que uma resposta nova abre ou fecha ramos adiante.
 */
export type Passo = BlocoPergunta | BlocoConsulta | BlocoFeedback;

/**
 * Passos do caminho ativo, na ordem em que acontecem.
 * Um feedback encerra o percurso — nada depois dele é alcançável.
 */
export function passosVisiveis(blocos: Bloco[], fatos: Fatos): Passo[] {
  const saida: Passo[] = [];
  for (const b of blocos) {
    if (ehCondicional(b)) {
      const dentro = passosVisiveis(avaliarCondicao(b.condicao, fatos) ? b.entao : b.senao, fatos);
      saida.push(...dentro);
      if (dentro.some(ehFeedback)) return saida;
    } else {
      saida.push(b);
      if (ehFeedback(b)) return saida;
    }
  }
  return saida;
}

export function perguntasVisiveis(blocos: Bloco[], fatos: Fatos): BlocoPergunta[] {
  return passosVisiveis(blocos, fatos).filter(ehPergunta);
}

function respondido(campo: string, fatos: Fatos): boolean {
  const v = fatos.resposta[campo];
  return v !== undefined && v !== null && v !== "";
}

/**
 * Próximo passo do fluxo: pode ser uma pergunta a fazer ou uma consulta a
 * disparar. Consultas já executadas ficam registradas em `consultasFeitas`.
 */
export function proximoPasso(
  blocos: Bloco[],
  fatos: Fatos,
  consultasFeitas: Set<string> = new Set(),
): Passo | null {
  for (const p of passosVisiveis(blocos, fatos)) {
    if (ehConsulta(p)) {
      if (!consultasFeitas.has(p.id)) return p;
    } else if (ehFeedback(p)) {
      return p;
    } else if (!respondido(p.campo, fatos)) {
      return p;
    }
  }
  return null;
}

export function proximaPergunta(blocos: Bloco[], fatos: Fatos): BlocoPergunta | null {
  return perguntasVisiveis(blocos, fatos).find((p) => !respondido(p.campo, fatos)) ?? null;
}

export function progressoDaPesquisa(
  blocos: Bloco[],
  fatos: Fatos,
): { respondidas: number; totalVisiveis: number } {
  const visiveis = perguntasVisiveis(blocos, fatos);
  return {
    respondidas: visiveis.filter((p) => respondido(p.campo, fatos)).length,
    totalVisiveis: visiveis.length,
  };
}

/** Todas as perguntas da árvore, independentemente de condição. */
export function todasAsPerguntas(blocos: Bloco[]): BlocoPergunta[] {
  return blocos.flatMap((b) =>
    ehCondicional(b) ? [...todasAsPerguntas(b.entao), ...todasAsPerguntas(b.senao)] : ehPergunta(b) ? [b] : [],
  );
}

/** Perguntas que já foram feitas antes de um bloco — usadas em condições. */
export function perguntasAntesDe(blocos: Bloco[], alvoId: string): BlocoPergunta[] {
  const anteriores: BlocoPergunta[] = [];
  let achou = false;

  function andar(lista: Bloco[]) {
    for (const b of lista) {
      if (achou) return;
      if (b.id === alvoId) { achou = true; return; }
      if (ehPergunta(b)) {
        anteriores.push(b);
      } else if (ehCondicional(b)) {
        // Um bloco dentro de um ramo enxerga o que veio antes da condicional
        andar(b.entao);
        if (achou) return;
        andar(b.senao);
        if (achou) return;
      }
    }
  }
  andar(blocos);
  return anteriores;
}

export function contarBlocos(blocos: Bloco[]): { perguntas: number; condicionais: number } {
  let perguntas = 0;
  let condicionais = 0;
  for (const b of blocos) {
    if (ehPergunta(b)) perguntas++;
    else if (ehCondicional(b)) {
      condicionais++;
      const dentro = contarBlocos([...b.entao, ...b.senao]);
      perguntas += dentro.perguntas;
      condicionais += dentro.condicionais;
    }
  }
  return { perguntas, condicionais };
}

// --------------------------------------------------------------------------
// Utilidade: obter a versão que decide
// --------------------------------------------------------------------------
/**
 * A versão que vale, dentre as que a pesquisa guarda.
 *
 * Devolve `undefined` em vez de estourar: pesquisa sem regra nenhuma é caso
 * legítimo — quem só coleta não decide — e um `throw` obrigaria toda tela a
 * proteger a chamada para um estado normal do produto.
 */
export function versaoQueDecide(versoes: RuleSet[], versaoAtivaId?: string): RuleSet | undefined {
  return versoes.find((r) => r.id === versaoAtivaId);
}

// --------------------------------------------------------------------------
// Explicar regra em linguagem natural (para o admin conferir)
// --------------------------------------------------------------------------
export function explicarRegra(regra: Regra): string {
  return `${regra.nome} → ${resultadoLabel(regra.resultado)}: ${explicarCond(regra.condicao)}`;
}

/**
 * O rótulo de um desfecho, para as telas de gestão.
 *
 * Recebe a lista da pesquisa porque o nome é dela, não do produto. Sem lista,
 * cai nos cinco padrões — que é o que as telas viam quando o nome era enum.
 */
export function resultadoLabel(id: string, desfechos: Desfecho[] = DESFECHOS_PADRAO): string {
  return acharDesfecho(desfechos, id).rotulo;
}

/**
 * Os critérios que o vendedor lê, em linguagem de gente.
 *
 * Saem da primeira regra que **libera** — não de texto escrito à mão, e não do
 * desfecho chamado "elegivel": é o efeito que define o que "passar" quer dizer,
 * e o nome dele é de quem montou a pesquisa. Mudou a regra, mudou a frase.
 *
 * Continua sem saber de negócio: o nome do fato vira rótulo por regra mecânica,
 * e o prefixo do hook é descartado porque quem lê não escolheu fonte nenhuma.
 */
export function criteriosLegiveis(
  rs: RuleSet,
  rotulos: Record<string, string> = {},
  desfechos: Desfecho[] = DESFECHOS_PADRAO,
): string[] {
  const regra = rs.regras
    .filter((r) => acharDesfecho(desfechos, r.resultado).efeito === "libera")
    .sort((a, b) => a.prioridade - b.prioridade)[0];
  if (!regra) return [];

  const termos = (c: Condicao): Condicao[] =>
    c.todas?.length ? c.todas.flatMap(termos) : c.qualquer?.length ? c.qualquer.flatMap(termos) : [c];

  return termos(regra.condicao)
    .filter((t) => t.fato)
    .map((t) => {
      const nome = rotularFato(t.fato, rotulos);
      const v = t.valor;
      switch (t.operador) {
        case ">=": return `${nome}: ${v} ou mais`;
        case ">":  return `${nome}: mais de ${v}`;
        case "<=": return `${nome}: ${v} ou menos`;
        case "<":  return `${nome}: menos de ${v}`;
        case "=":  return `${nome}: ${v}`;
        case "!=": return `${nome}: diferente de ${v}`;
        case "truthy": return `${nome}: sim`;
        case "falsy":  return `${nome}: não`;
        default: return `${nome}: ${t.operador} ${v ?? ""}`.trim();
      }
    });
}

/**
 * Rótulos declarados pelos hooks, indexados por caminho de fato.
 * `{ "credito.temRestricao": "Tem restrição" }`.
 */
export function mapaDeRotulos(hooks: Hook[]): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const h of hooks) {
    for (const [chave, rotulo] of Object.entries(h.rotulos ?? {})) {
      if (rotulo.trim()) mapa[`${h.prefixo}.${chave}`] = rotulo.trim();
    }
  }
  return mapa;
}

/**
 * Nome de exibição de um fato. Usa o rótulo que o hook declarou; sem ele, cai na
 * regra mecânica. É por isso que o motor continua sem conhecer campo por nome:
 * quem nomeia é o hook, não o código.
 */
export function rotularFato(caminho: string, rotulos: Record<string, string> = {}): string {
  return rotulos[caminho] ?? rotuloDeFato(caminho);
}

/** `uber.mesesUber` → "Meses Uber". O prefixo some: quem lê não escolheu fonte. */
function rotuloDeFato(caminho: string): string {
  const chave = caminho.split(".").pop() ?? caminho;
  if (chave.length <= 2) return chave.toUpperCase();
  const separado = chave.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return separado.charAt(0).toUpperCase() + separado.slice(1);
}

function explicarCond(c: Condicao): string {
  if (c.todas && c.todas.length) return `(${c.todas.map(explicarCond).join(" E ")})`;
  if (c.qualquer && c.qualquer.length) return `(${c.qualquer.map(explicarCond).join(" OU ")})`;
  const op: Record<string, string> = {
    "=": "=", "!=": "≠", ">": ">", ">=": "≥", "<": "<", "<=": "≤",
    in: "está em", notIn: "não está em",
    exists: "existe", missing: "não existe",
    truthy: "é verdadeiro", falsy: "é falso",
  };
  const rhs = c.valor === undefined ? "" : ` ${JSON.stringify(c.valor)}`;
  return `${c.fato} ${op[c.operador] ?? c.operador}${rhs}`;
}

// --------------------------------------------------------------------------
// Texto de desfecho: as duas trocas que a tela final faz
// --------------------------------------------------------------------------
/**
 * Troca `{nome}` e `{identificador}` no texto escrito pelo autor.
 *
 * São duas e são fechadas de propósito. Um mecanismo de variáveis livres
 * pareceria mais poderoso e seria pior: quem escreve não tem como saber quais
 * fatos existem no meio de uma frase, e um `{corridas}` que não veio viraria
 * chave crua na tela de quem responde.
 *
 * `{nome}` carrega a vírgula junto — "{nome}você está elegível!" vira "Marcos,
 * você está elegível!" ou "Você está elegível!". Sem hook que traga nome, a
 * frase se resolve com maiúscula, como sempre se resolveu.
 */
export function preencherTexto(
  texto: string,
  trocas: { nome?: string | null; identificador?: string },
): string {
  const semNome = !trocas.nome;
  const saida = texto
    .replace(/\{nome\}/g, trocas.nome ? `${trocas.nome}, ` : "")
    .replace(/\{identificador\}/g, trocas.identificador ?? "");

  /* Sem nome, a frase começa onde começava a continuação — e continuação
     começa em minúscula. */
  return semNome && texto.startsWith("{nome}")
    ? saida.charAt(0).toUpperCase() + saida.slice(1)
    : saida;
}
