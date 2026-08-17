import { acharDesfecho, Desfecho, Pesquisa, SessaoMotorista, SessaoStatus } from "./types";

/**
 * Recorte e agregação das submissões — puro, sem I/O.
 *
 * Mora fora das telas porque as três saídas precisam concordar: o gráfico, o
 * CSV e a API respondem sobre o **mesmo** recorte. Enquanto cada tela filtrasse
 * do seu jeito, quem baixasse o CSV de um painel encontraria outro total.
 *
 * O princípio do projeto vale aqui igual: **nada neste arquivo conhece um campo
 * de negócio pelo nome**. Os caminhos agregáveis são descobertos do dado —
 * cada resposta vira `resposta.<campo>`, cada fato de hook vira
 * `<prefixo>.<campo>` — e os poucos nomes fixos (`desfecho`, `efeito`, `estado`)
 * são do sistema, não do caso de uso.
 */

// --------------------------------------------------------------------------
// Ler um valor pelo caminho
// --------------------------------------------------------------------------

/**
 * Os campos que o próprio sistema produz, e que não são fato de ninguém.
 *
 * Ficam num prefixo declarado para não disputarem espaço com um hook: um hook
 * de prefixo `estado` existiria sem conflito, porque o que se agrega aqui é
 * `sistema.estado`.
 */
/** O efeito escrito como se fala. Ver `valorEm`. */
export const EFEITO_LEGIVEL: Record<string, string> = {
  libera: "Liberou",
  segura: "Segurou",
  recusa: "Recusou",
};

export const CAMPOS_DO_SISTEMA = [
  { caminho: "sistema.desfecho", rotulo: "Desfecho" },
  { caminho: "sistema.efeito", rotulo: "Efeito no sistema" },
  { caminho: "sistema.estado", rotulo: "Estado técnico" },
  { caminho: "sistema.motivo", rotulo: "Motivo da decisão" },
  { caminho: "sistema.versaoRegras", rotulo: "Versão da régua" },
] as const;

export function valorEm(
  sessao: SessaoMotorista,
  caminho: string,
  desfechos?: Desfecho[],
): unknown {
  const [prefixo, ...resto] = caminho.split(".");
  const campo = resto.join(".");

  if (prefixo === "sistema") {
    switch (campo) {
      case "desfecho":
        /* O rótulo, não o id: quem lê o gráfico lê o nome que o autor deu. O id
           continua disponível na exportação, que é onde ele serve. */
        return sessao.resultado
          ? acharDesfecho(desfechos, sessao.resultado.tipo).rotulo
          : undefined;
      case "efeito":
        /* Legível, não o identificador cru: "libera" é como o sistema chama, e
           a legenda de um gráfico não é lugar de vocabulário de código. O
           filtro continua batendo no valor cru, que é o que a URL carrega. */
        return sessao.resultado ? EFEITO_LEGIVEL[sessao.resultado.efeito] : undefined;
      case "estado":
        return sessao.status;
      case "motivo":
        return sessao.resultado?.motivo;
      case "versaoRegras":
        return sessao.ruleSetVersao;
      default:
        return undefined;
    }
  }

  if (prefixo === "resposta") return sessao.respostas?.[campo];
  return sessao.externos?.[prefixo]?.[campo];
}

/** Uma consulta que voltou com erro deixa esta marca nos fatos da sessão. */
export function consultaFalhou(sessao: SessaoMotorista): boolean {
  return Object.values(sessao.externos ?? {}).some((f) => f?.erro === true);
}

// --------------------------------------------------------------------------
// Recorte
// --------------------------------------------------------------------------

export interface Recorte {
  pesquisaId?: string;
  /** Datas no formato `aaaa-mm-dd`, inclusivas nas duas pontas. */
  de?: string;
  ate?: string;
  /** Id do desfecho — não o rótulo, para o link continuar valendo se renomearem. */
  desfecho?: string;
  efeito?: string;
  estado?: SessaoStatus;
  /** Só as que tiveram consulta com erro. */
  falha?: boolean;
  /** Texto livre: bate em identificador, respostas, fatos e motivo. */
  busca?: string;
}

/** O dia local de uma sessão, como `aaaa-mm-dd`. */
export function diaDe(iso: string): string {
  const d = new Date(iso);
  /*
   * Data local, e não `iso.slice(0, 10)`.
   *
   * O corte da string dá o dia em UTC: uma jornada das 21h de São Paulo cai no
   * dia seguinte, e o gráfico ganha movimento numa data em que ninguém
   * respondeu. Quem olha o painel olha no fuso dele.
   */
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function combina(sessao: SessaoMotorista, busca: string): boolean {
  const alvo = busca.trim().toLowerCase();
  if (!alvo) return true;

  const pedacos: unknown[] = [
    sessao.cpf,
    sessao.resultado?.motivo,
    ...Object.values(sessao.respostas ?? {}),
    ...Object.values(sessao.externos ?? {}).flatMap((f) => Object.values(f ?? {})),
  ];

  return pedacos.some((p) => p != null && String(p).toLowerCase().includes(alvo));
}

export function aplicarRecorte(
  sessoes: SessaoMotorista[],
  recorte: Recorte,
): SessaoMotorista[] {
  return sessoes.filter((s) => {
    if (recorte.pesquisaId && s.pesquisaId !== recorte.pesquisaId) return false;
    if (recorte.estado && s.status !== recorte.estado) return false;
    if (recorte.desfecho && s.resultado?.tipo !== recorte.desfecho) return false;
    if (recorte.efeito && s.resultado?.efeito !== recorte.efeito) return false;
    if (recorte.falha && !consultaFalhou(s)) return false;

    const dia = diaDe(s.iniciadaEm);
    if (recorte.de && dia < recorte.de) return false;
    if (recorte.ate && dia > recorte.ate) return false;

    if (recorte.busca && !combina(s, recorte.busca)) return false;
    return true;
  });
}

// --------------------------------------------------------------------------
// Descobrir o que dá para agregar
// --------------------------------------------------------------------------

export type TipoDeValor = "numero" | "texto" | "booleano";

export interface CaminhoAgregavel {
  caminho: string;
  rotulo: string;
  origem: "sistema" | "resposta" | "consulta";
  tipo: TipoDeValor;
  /** Quantos valores diferentes aparecem — é o que decide se cabe numa rosca. */
  distintos: number;
  preenchidos: number;
}

/**
 * Teto de fatias antes de um campo deixar de ser categórico.
 *
 * Um identificador tem tantos valores quanto linhas, e uma rosca com 300 fatias
 * não é gráfico, é confete. Acima disto o campo continua exportável e
 * pesquisável — só não é oferecido como eixo de agrupamento.
 */
export const TETO_DE_CATEGORIAS = 24;

export function caminhosAgregaveis(
  sessoes: SessaoMotorista[],
  desfechos?: Desfecho[],
): CaminhoAgregavel[] {
  const vistos = new Map<
    string,
    { origem: CaminhoAgregavel["origem"]; valores: Set<string>; tipos: Set<TipoDeValor>; n: number }
  >();

  const registrar = (
    caminho: string,
    origem: CaminhoAgregavel["origem"],
    valor: unknown,
  ) => {
    if (valor === undefined || valor === null || valor === "") return;
    const atual =
      vistos.get(caminho) ?? { origem, valores: new Set<string>(), tipos: new Set<TipoDeValor>(), n: 0 };
    atual.n++;
    /* O conjunto de valores para de crescer no teto: guardar 300 identificadores
       distintos só para descobrir que não cabem num gráfico é memória à toa. */
    if (atual.valores.size <= TETO_DE_CATEGORIAS) atual.valores.add(String(valor));
    atual.tipos.add(
      typeof valor === "number" ? "numero" : typeof valor === "boolean" ? "booleano" : "texto",
    );
    vistos.set(caminho, atual);
  };

  for (const s of sessoes) {
    for (const campo of CAMPOS_DO_SISTEMA) {
      registrar(campo.caminho, "sistema", valorEm(s, campo.caminho, desfechos));
    }
    for (const [campo, valor] of Object.entries(s.respostas ?? {})) {
      registrar(`resposta.${campo}`, "resposta", valor);
    }
    for (const [prefixo, fatos] of Object.entries(s.externos ?? {})) {
      for (const [campo, valor] of Object.entries(fatos ?? {})) {
        registrar(`${prefixo}.${campo}`, "consulta", valor);
      }
    }
  }

  return [...vistos.entries()]
    .map(([caminho, v]) => ({
      caminho,
      rotulo: rotuloDeCaminho(caminho),
      origem: v.origem,
      /* Coluna com número e texto misturados é texto: somar "12" com "não
         informado" não dá média nenhuma. */
      tipo: v.tipos.size === 1 ? [...v.tipos][0] : "texto",
      distintos: v.valores.size,
      preenchidos: v.n,
    }))
    .sort((a, b) => a.caminho.localeCompare(b.caminho));
}

/** Rótulo mecânico — o do hook, quando houver, entra por `rotularFato` na tela. */
export function rotuloDeCaminho(caminho: string): string {
  const doSistema = CAMPOS_DO_SISTEMA.find((c) => c.caminho === caminho);
  if (doSistema) return doSistema.rotulo;
  const campo = caminho.split(".").slice(1).join(".");
  const separado = campo.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return separado.charAt(0).toUpperCase() + separado.slice(1);
}

// --------------------------------------------------------------------------
// Distribuição — a rosca, a barra, a tabela
// --------------------------------------------------------------------------

export interface Fatia {
  rotulo: string;
  n: number;
  fracao: number;
}

/**
 * Conta por valor, do maior para o menor.
 *
 * O que passar do teto vira uma fatia "outros" em vez de sumir: a soma das
 * fatias precisa bater com o total, senão o gráfico e o contador da tela
 * discordam e ninguém sabe qual dos dois está certo.
 */
export function distribuicao(
  sessoes: SessaoMotorista[],
  caminho: string,
  opcoes: { desfechos?: Desfecho[]; teto?: number; incluirVazio?: boolean } = {},
): { fatias: Fatia[]; total: number; semValor: number } {
  const teto = opcoes.teto ?? 8;
  const contagem = new Map<string, number>();
  let semValor = 0;

  for (const s of sessoes) {
    const v = valorEm(s, caminho, opcoes.desfechos);
    if (v === undefined || v === null || v === "") {
      semValor++;
      continue;
    }
    const chave = typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v);
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }

  if (opcoes.incluirVazio && semValor > 0) contagem.set("(sem resposta)", semValor);

  const ordenadas = [...contagem.entries()].sort((a, b) => b[1] - a[1]);
  const principais = ordenadas.slice(0, teto);
  const resto = ordenadas.slice(teto);
  if (resto.length) {
    principais.push([`Outros (${resto.length})`, resto.reduce((soma, [, n]) => soma + n, 0)]);
  }

  const total = principais.reduce((soma, [, n]) => soma + n, 0);
  return {
    fatias: principais.map(([rotulo, n]) => ({
      rotulo,
      n,
      fracao: total ? n / total : 0,
    })),
    total,
    semValor,
  };
}

// --------------------------------------------------------------------------
// Série no tempo
// --------------------------------------------------------------------------

export type Granularidade = "dia" | "semana" | "mes";

export interface PontoDaSerie {
  /** Chave ordenável (`aaaa-mm-dd`) — é por ela que o eixo ordena. */
  chave: string;
  rotulo: string;
  total: number;
  /** Quando há agrupamento, um total por série. */
  porSerie: Record<string, number>;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** A segunda-feira da semana de uma data — o balde da granularidade semanal. */
function segundaDa(d: Date): Date {
  const copia = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  /* `getDay()` devolve 0 no domingo; sem o ajuste, o domingo abriria semana
     sozinho e apareceria como um balde de um dia no fim da série. */
  const desloca = (copia.getDay() + 6) % 7;
  copia.setDate(copia.getDate() - desloca);
  return copia;
}

function balde(iso: string, granularidade: Granularidade): { chave: string; rotulo: string } {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");

  if (granularidade === "mes") {
    return { chave: `${d.getFullYear()}-${mm}-01`, rotulo: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` };
  }
  if (granularidade === "semana") {
    const s = segundaDa(d);
    const chave = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
    return { chave, rotulo: `${String(s.getDate()).padStart(2, "0")}/${String(s.getMonth() + 1).padStart(2, "0")}` };
  }
  return { chave: `${d.getFullYear()}-${mm}-${dd}`, rotulo: `${dd}/${mm}` };
}

/** Avança um balde — é o que permite preencher os vazios sem pular data. */
function proximoBalde(chave: string, granularidade: Granularidade): string {
  const [a, m, d] = chave.split("-").map(Number);
  const data = new Date(a, m - 1, d);
  if (granularidade === "mes") data.setMonth(data.getMonth() + 1);
  else data.setDate(data.getDate() + (granularidade === "semana" ? 7 : 1));
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

/**
 * A série no tempo, com os dias sem movimento presentes e valendo zero.
 *
 * Pular o dia vazio encurta o eixo e mente sobre o ritmo: duas respostas em
 * dias seguidos e duas separadas por uma semana desenhariam a mesma linha.
 */
export function serieTemporal(
  sessoes: SessaoMotorista[],
  granularidade: Granularidade,
  opcoes: { agruparPor?: string; desfechos?: Desfecho[]; teto?: number } = {},
): { pontos: PontoDaSerie[]; series: string[] } {
  if (sessoes.length === 0) return { pontos: [], series: [] };

  /* As séries saem da distribuição para herdarem a mesma regra de teto e de
     "outros" — duas contagens do mesmo campo com cortes diferentes é o tipo de
     divergência que ninguém encontra depois. */
  const series = opcoes.agruparPor
    ? distribuicao(sessoes, opcoes.agruparPor, {
        desfechos: opcoes.desfechos,
        teto: opcoes.teto ?? 5,
      }).fatias.map((f) => f.rotulo)
    : [];
  const conhecidas = new Set(series);

  const baldes = new Map<string, PontoDaSerie>();

  for (const s of sessoes) {
    const { chave, rotulo } = balde(s.iniciadaEm, granularidade);
    const ponto =
      baldes.get(chave) ?? { chave, rotulo, total: 0, porSerie: {} as Record<string, number> };
    ponto.total++;

    if (opcoes.agruparPor) {
      const v = valorEm(s, opcoes.agruparPor, opcoes.desfechos);
      const bruto =
        v === undefined || v === null || v === ""
          ? "(sem resposta)"
          : typeof v === "boolean"
            ? v ? "Sim" : "Não"
            : String(v);
      /* O que não entrou no teto cai no mesmo "Outros" que a legenda mostra. */
      const nome = conhecidas.has(bruto) ? bruto : series.find((x) => x.startsWith("Outros")) ?? bruto;
      ponto.porSerie[nome] = (ponto.porSerie[nome] ?? 0) + 1;
    }

    baldes.set(chave, ponto);
  }

  const ordenadas = [...baldes.keys()].sort();
  const pontos: PontoDaSerie[] = [];
  let cursor = ordenadas[0];
  const ultimo = ordenadas[ordenadas.length - 1];
  /* Teto de baldes: um recorte de dois anos por dia geraria 700 colunas, e
     nenhuma tela desenha isso — a granularidade maior é que resolve. */
  for (let i = 0; i < 800 && cursor <= ultimo; i++) {
    pontos.push(
      baldes.get(cursor) ?? {
        chave: cursor,
        rotulo: balde(`${cursor}T12:00:00`, granularidade).rotulo,
        total: 0,
        porSerie: {},
      },
    );
    cursor = proximoBalde(cursor, granularidade);
  }

  return { pontos, series };
}

/** A granularidade que cabe no período — evita 120 colunas de um pixel. */
export function granularidadeSugerida(sessoes: SessaoMotorista[]): Granularidade {
  if (sessoes.length === 0) return "dia";
  const dias = new Set(sessoes.map((s) => diaDe(s.iniciadaEm)));
  const chaves = [...dias].sort();
  const inicio = new Date(chaves[0]);
  const fim = new Date(chaves[chaves.length - 1]);
  const span = (fim.getTime() - inicio.getTime()) / 86_400_000;
  if (span > 180) return "mes";
  if (span > 45) return "semana";
  return "dia";
}

// --------------------------------------------------------------------------
// Comparação entre períodos
// --------------------------------------------------------------------------

export interface Comparacao {
  agora: number;
  antes: number;
  /** Variação relativa; `null` quando não havia base para comparar. */
  variacao: number | null;
}

function compara(agora: number, antes: number): Comparacao {
  /* Sem base anterior não existe "+100%": crescer de zero é começar, não
     dobrar. `null` deixa a tela escrever "sem período anterior". */
  return { agora, antes, variacao: antes === 0 ? null : (agora - antes) / antes };
}

/**
 * O mesmo recorte, na janela imediatamente anterior e de igual duração.
 *
 * A janela anterior é derivada do período pedido — comparar sempre "mês
 * passado" daria uma comparação errada para quem está olhando sete dias.
 */
export function compararComPeriodoAnterior(
  todas: SessaoMotorista[],
  recorte: Recorte,
): { atual: SessaoMotorista[]; anterior: SessaoMotorista[]; dias: number } | null {
  if (!recorte.de || !recorte.ate) return null;

  const de = new Date(recorte.de);
  const ate = new Date(recorte.ate);
  const dias = Math.round((ate.getTime() - de.getTime()) / 86_400_000) + 1;
  if (dias <= 0) return null;

  const fimAnterior = new Date(de);
  fimAnterior.setDate(fimAnterior.getDate() - 1);
  const inicioAnterior = new Date(fimAnterior);
  inicioAnterior.setDate(inicioAnterior.getDate() - (dias - 1));

  const comoDia = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return {
    atual: aplicarRecorte(todas, recorte),
    anterior: aplicarRecorte(todas, {
      ...recorte,
      de: comoDia(inicioAnterior),
      ate: comoDia(fimAnterior),
    }),
    dias,
  };
}

export interface ResumoDoRecorte {
  submissoes: Comparacao;
  concluidas: Comparacao;
  taxaConclusao: Comparacao;
  liberadas: Comparacao;
}

export function resumir(
  atual: SessaoMotorista[],
  anterior: SessaoMotorista[],
): ResumoDoRecorte {
  const concluidas = (l: SessaoMotorista[]) => l.filter((s) => s.status === "concluida").length;
  const liberadas = (l: SessaoMotorista[]) =>
    l.filter((s) => s.resultado?.efeito === "libera").length;
  const taxa = (l: SessaoMotorista[]) => (l.length ? (concluidas(l) / l.length) * 100 : 0);

  return {
    submissoes: compara(atual.length, anterior.length),
    concluidas: compara(concluidas(atual), concluidas(anterior)),
    taxaConclusao: compara(Math.round(taxa(atual)), Math.round(taxa(anterior))),
    liberadas: compara(liberadas(atual), liberadas(anterior)),
  };
}

// --------------------------------------------------------------------------
// Números: para os fatos que são quantidade
// --------------------------------------------------------------------------

export interface ResumoNumerico {
  n: number;
  minimo: number;
  maximo: number;
  media: number;
  mediana: number;
  /** Faixas para o histograma, já contadas. */
  faixas: { rotulo: string; n: number }[];
}

export function resumoNumerico(
  sessoes: SessaoMotorista[],
  caminho: string,
  faixas = 8,
): ResumoNumerico | null {
  const valores = sessoes
    .map((s) => valorEm(s, caminho))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .sort((a, b) => a - b);

  if (valores.length === 0) return null;

  const minimo = valores[0];
  const maximo = valores[valores.length - 1];
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const meio = Math.floor(valores.length / 2);
  const mediana =
    valores.length % 2 ? valores[meio] : (valores[meio - 1] + valores[meio]) / 2;

  /* Todos iguais: uma faixa só. Dividir por (max - min) daria divisão por zero
     e o histograma sairia com NaN no rótulo. */
  const largura = maximo === minimo ? 1 : (maximo - minimo) / faixas;
  const baldes = Array.from({ length: maximo === minimo ? 1 : faixas }, (_, i) => ({
    inicio: minimo + i * largura,
    n: 0,
  }));

  for (const v of valores) {
    const i = Math.min(baldes.length - 1, Math.floor((v - minimo) / largura));
    baldes[i].n++;
  }

  const curto = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n));

  return {
    n: valores.length,
    minimo,
    maximo,
    media,
    mediana,
    faixas: baldes.map((b, i) => ({
      rotulo:
        baldes.length === 1
          ? curto(b.inicio)
          : `${curto(b.inicio)}–${curto(i === baldes.length - 1 ? maximo : b.inicio + largura)}`,
      n: b.n,
    })),
  };
}

// --------------------------------------------------------------------------
// Cruzamento — a tabela de duas entradas
// --------------------------------------------------------------------------

export interface Cruzamento {
  linhas: string[];
  colunas: string[];
  celulas: number[][];
  totaisLinha: number[];
  totaisColuna: number[];
  total: number;
}

export function cruzar(
  sessoes: SessaoMotorista[],
  caminhoLinha: string,
  caminhoColuna: string,
  opcoes: { desfechos?: Desfecho[]; teto?: number } = {},
): Cruzamento {
  const teto = opcoes.teto ?? 6;
  /*
   * "(sem resposta)" é linha e coluna, não buraco.
   *
   * Sem isto a matriz somava menos que a tela e ninguém sabia por quê: quem não
   * foi achado na base nunca respondeu a pergunta do eixo, então caía fora da
   * tabela — e junto ia a coluna inteira de "pendente de validação", que
   * aparecia zerada bem ao lado de uma rosca dizendo 37.
   */
  const eixo = { ...opcoes, teto, incluirVazio: true };
  const linhas = distribuicao(sessoes, caminhoLinha, eixo).fatias.map((f) => f.rotulo);
  const colunas = distribuicao(sessoes, caminhoColuna, eixo).fatias.map((f) => f.rotulo);

  const iLinha = new Map(linhas.map((r, i) => [r, i]));
  const iColuna = new Map(colunas.map((c, i) => [c, i]));
  const celulas = linhas.map(() => colunas.map(() => 0));

  const nomear = (v: unknown) =>
    v === undefined || v === null || v === ""
      ? "(sem resposta)"
      : typeof v === "boolean"
        ? v ? "Sim" : "Não"
        : String(v);

  for (const s of sessoes) {
    const l = iLinha.get(nomear(valorEm(s, caminhoLinha, opcoes.desfechos)));
    const c = iColuna.get(nomear(valorEm(s, caminhoColuna, opcoes.desfechos)));
    /* Fora do teto em qualquer um dos eixos, a submissão não entra na matriz —
       e é por isso que a tabela mostra o próprio total, e não o da tela. */
    if (l === undefined || c === undefined) continue;
    celulas[l][c]++;
  }

  const totaisLinha = celulas.map((linha) => linha.reduce((a, b) => a + b, 0));
  const totaisColuna = colunas.map((_, c) => celulas.reduce((soma, linha) => soma + linha[c], 0));

  return {
    linhas,
    colunas,
    celulas,
    totaisLinha,
    totaisColuna,
    total: totaisLinha.reduce((a, b) => a + b, 0),
  };
}

// --------------------------------------------------------------------------
// Funil
// --------------------------------------------------------------------------

export interface EtapaDoFunil {
  etapa: string;
  n: number;
  /** Fração sobre a primeira etapa — é o que responde "onde perdemos gente". */
  fracao: number;
}

export function funil(
  sessoes: SessaoMotorista[],
  pedidosNoRecorte: number,
  vendasNoRecorte: number,
): EtapaDoFunil[] {
  const iniciaram = sessoes.length;
  const concluiram = sessoes.filter((s) => s.status === "concluida").length;
  const liberadas = sessoes.filter((s) => s.resultado?.efeito === "libera").length;

  const bruto = [
    { etapa: "Iniciaram", n: iniciaram },
    { etapa: "Concluíram", n: concluiram },
    { etapa: "Saíram liberadas", n: liberadas },
    { etapa: "Viraram pedido", n: pedidosNoRecorte },
    { etapa: "Viraram venda", n: vendasNoRecorte },
  ];

  return bruto.map((e) => ({ ...e, fracao: iniciaram ? e.n / iniciaram : 0 }));
}

/** Lê o recorte da URL — mesma leitura na tela, no CSV e na API. */
export function recorteDeParams(params: Record<string, string | undefined>): Recorte {
  return {
    pesquisaId: params.pesquisa || undefined,
    de: params.de || undefined,
    ate: params.ate || undefined,
    desfecho: params.desfecho || undefined,
    efeito: params.efeito || undefined,
    estado: (params.estado as SessaoStatus) || undefined,
    falha: params.falha === "1" || undefined,
    busca: params.busca || undefined,
  };
}

/** De volta para a URL, sem as chaves vazias sujando o endereço. */
export function paramsDoRecorte(recorte: Recorte): URLSearchParams {
  const p = new URLSearchParams();
  if (recorte.pesquisaId) p.set("pesquisa", recorte.pesquisaId);
  if (recorte.de) p.set("de", recorte.de);
  if (recorte.ate) p.set("ate", recorte.ate);
  if (recorte.desfecho) p.set("desfecho", recorte.desfecho);
  if (recorte.efeito) p.set("efeito", recorte.efeito);
  if (recorte.estado) p.set("estado", recorte.estado);
  if (recorte.falha) p.set("falha", "1");
  if (recorte.busca) p.set("busca", recorte.busca);
  return p;
}

/** O período coberto pelas submissões — o padrão do seletor de datas. */
export function periodoDe(sessoes: SessaoMotorista[]): { de: string; ate: string } | null {
  if (sessoes.length === 0) return null;
  const dias = sessoes.map((s) => diaDe(s.iniciadaEm)).sort();
  return { de: dias[0], ate: dias[dias.length - 1] };
}

/** Só para a tela não precisar importar `types` só por causa disto. */
export type { Pesquisa };
