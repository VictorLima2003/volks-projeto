// ============================================================================
// Domínio: plataforma de pesquisas com decisão automatizada.
// Nada aqui conhece um caso de negócio específico — o vocabulário do caso
// vive em `seed.ts` e nos dados da campanha.
// ============================================================================

export type UUID = string;

// --- Campanha ---------------------------------------------------------------
export type CampanhaStatus = "rascunho" | "ativa" | "pausada" | "encerrada";

export interface Campanha {
  id: UUID;
  nome: string;
  concessionaria: string;
  /** Uma campanha pode ofertar vários modelos. */
  modelos: string[];
  cidadesAlvo: string[];
  ufsAlvo: string[];
  /** Faixas etárias elegíveis; vazio = sem restrição de idade. */
  faixasEtarias: string[];
  verbaTotal: number;
  verbaConsumida: number;
  vigenciaInicio: string;      // ISO
  vigenciaFim: string;         // ISO
  status: CampanhaStatus;
  criadaEm: string;
  /** A pesquisa é uma árvore de blocos, não uma lista plana. */
  blocos: Bloco[];
  /** Hooks de código disponíveis nesta campanha. */
  hooks: Hook[];
  ruleSets: RuleSet[];         // versionadas
  ruleSetAtivoId: UUID;
}

// --- Pesquisa: árvore de blocos ---------------------------------------------
export type TipoPergunta =
  | "texto"
  | "numero"
  | "cpf"
  | "email"
  | "telefone"
  | "data"
  | "opcao"
  | "multipla"
  | "consentimento";

/**
 * Uma pergunta é um bloco da cadeia. `campo` é o identificador da resposta —
 * é por ele que as regras e as condições referenciam o que foi respondido.
 */
export interface BlocoPergunta {
  id: UUID;
  bloco: "pergunta";
  campo: string;
  rotulo: string;
  ajuda?: string;
  tipo: TipoPergunta;
  opcoes?: string[];
  obrigatoria: boolean;
}

/**
 * A condicional também é um bloco da cadeia, não um atributo escondido dentro
 * da pergunta. Quando resolvida, ela abre a ramificação correspondente —
 * é isso que dá a árvore.
 */
export interface BlocoCondicional {
  id: UUID;
  bloco: "condicional";
  rotulo: string;
  condicao: Condicao;
  entao: Bloco[];
  senao: Bloco[];
}

/**
 * Gatilho de busca externa: quando o fluxo chega aqui, o sistema consulta a
 * fonte usando uma resposta já coletada (o CPF, tipicamente) e injeta o
 * resultado como fatos. É GET, não push — o fluxo puxa o dado quando precisa.
 */
export interface BlocoConsulta {
  id: UUID;
  bloco: "consulta";
  rotulo: string;
  hookId: UUID;
  /**
   * De onde sai cada parâmetro do hook: nome do parâmetro → identificador de
   * uma resposta já coletada. Um valor entre aspas é tratado como literal.
   */
  argumentos: Record<string, string>;
  /** Se a busca falhar, seguir mesmo assim ou tratar como erro. */
  obrigatoria: boolean;
}

export type TipoFeedback = "sucesso" | "info" | "warning" | "error";

/**
 * Fim de caminho. O fluxograma tem um final, e esse final pode ser
 * condicionado — daí o feedback viver dentro de um ramo. Nenhum bloco pode
 * vir depois dele: quando o fluxo chega aqui, acabou.
 */
export interface BlocoFeedback {
  id: UUID;
  bloco: "feedback";
  tipo: TipoFeedback;
  titulo: string;
  mensagem?: string;
  imagemUrl?: string;
  /** Cor de destaque em hex; vazio usa a cor padrão do tipo. */
  cor?: string;
}

export type Bloco = BlocoPergunta | BlocoCondicional | BlocoConsulta | BlocoFeedback;

export function ehPergunta(b: Bloco): b is BlocoPergunta {
  return b.bloco === "pergunta";
}
export function ehCondicional(b: Bloco): b is BlocoCondicional {
  return b.bloco === "condicional";
}
export function ehConsulta(b: Bloco): b is BlocoConsulta {
  return b.bloco === "consulta";
}
export function ehFeedback(b: Bloco): b is BlocoFeedback {
  return b.bloco === "feedback";
}

/** Cor padrão de cada tipo, quando o autor não escolhe uma. */
export const COR_FEEDBACK: Record<TipoFeedback, string> = {
  sucesso: "#0E7C3A",
  info: "#001E50",
  warning: "#96560B",
  error: "#BB0B22",
};

// --- Hooks de código --------------------------------------------------------

/** Um parâmetro de entrada do hook, preenchido no bloco de consulta. */
export interface ParametroHook {
  /** Nome da variável dentro do código. */
  nome: string;
  rotulo: string;
  descricao?: string;
}

/** Arquivo anexado ao hook, acessível pelo código via `arquivo(nome)`. */
export interface AnexoHook {
  nome: string;
  conteudo: string;
}

/**
 * Um hook é código que busca e trata dados. Ele substitui a antiga separação
 * entre "fonte CSV" e "fonte API": o próprio código decide se faz `fetch`,
 * se lê um CSV anexado ou se combina os dois.
 *
 * O que ele retorna vira fato sob o `prefixo`, disponível nas condicionais
 * e nas regras.
 */
export interface Hook {
  id: UUID;
  nome: string;
  descricao?: string;
  /** Prefixo dos fatos retornados: "credito" → credito.score, credito.limite. */
  prefixo: string;
  parametros: ParametroHook[];
  /** Exibido ao respondente enquanto o hook executa. */
  mensagemCarregando: string;
  /**
   * Como cada fato retornado deve ser escrito na tela: `{ temRestricao: "Tem
   * restrição" }`.
   *
   * Existe porque a chave é identificador de código e não leva acento. Sem isto,
   * a interface só podia separar o camelCase e subir a inicial — e `temRestricao`
   * aparecia como "Tem Restricao", errado em português. Quem sabe escrever o
   * nome direito é quem escreveu o hook.
   *
   * Opcional e parcial: o que não estiver aqui continua caindo na regra
   * mecânica, e o motor segue sem conhecer nenhum campo por nome.
   */
  rotulos?: Record<string, string>;
  /** Corpo de uma função assíncrona. Recebe os parâmetros por nome. */
  codigo: string;
  anexos: AnexoHook[];
  ativo: boolean;
}

// --- Regras (motor) ---------------------------------------------------------
export type Operador =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "contem"
  | "naoContem"
  | "comecaCom"
  | "in"
  | "notIn"
  | "exists"
  | "missing"
  | "truthy"
  | "falsy";

export interface Condicao {
  /** Caminho do fato: "resposta.<campo>" ou "<prefixoDoHook>.<chave>". */
  fato: string;
  operador: Operador;
  /** Valor literal digitado pelo autor. */
  valor?: unknown;
  /**
   * Comparar contra OUTRO fato em vez de um literal. Quando presente, tem
   * precedência sobre `valor` — é o que permite "resposta A maior que resposta B".
   */
  valorFato?: string;
  todas?: Condicao[];          // AND
  qualquer?: Condicao[];       // OR
}

export type ResultadoTipo =
  | "elegivel"
  | "nao_elegivel"
  | "pendente_validacao"
  | "revalidar"
  | "erro";

export interface Regra {
  id: UUID;
  nome: string;
  condicao: Condicao;
  resultado: ResultadoTipo;
  motivo: string;              // mensagem exibida (motorista/vendedor)
  proximaAcao?: string;        // orientação p/ vendedor/central
  prioridade: number;          // menor = maior prioridade
}

/**
 * Uma versão só entra em produção depois de aprovada por alguém diferente
 * de quem a propôs. `arquivado` é a versão que já valeu e foi substituída.
 */
export type RuleSetStatus = "em_aprovacao" | "ativo" | "rejeitado" | "arquivado";

export interface RuleSet {
  id: UUID;
  versao: number;
  criadoEm: string;
  criadoPor: string;
  descricao: string;
  regras: Regra[];
  ativo: boolean;

  status: RuleSetStatus;
  propostoPor: string;
  propostaEm: string;
  aprovadoPor?: string;
  aprovadoEm?: string;
  rejeitadoPor?: string;
  rejeitadoEm?: string;
  motivoRejeicao?: string;
}

// --- Respostas / Sessões ----------------------------------------------------
export type SessaoStatus =
  | "em_andamento"
  | "concluida"
  | "abandonada";

export interface SessaoMotorista {
  id: UUID;
  campanhaId: UUID;
  cpf: string;
  iniciadaEm: string;
  atualizadaEm: string;
  status: SessaoStatus;
  respostas: Record<string, unknown>;
  /** Fatos vindos de fontes externas, agrupados por prefixo. */
  externos?: Record<string, Record<string, unknown>>;
  resultado?: DecisaoResultado;
  ruleSetVersao?: number;
}

export interface DecisaoResultado {
  tipo: ResultadoTipo;
  motivo: string;
  proximaAcao?: string;
  regraAplicadaId?: UUID;
  ruleSetVersao: number;
  decididoEm: string;
  contexto: Record<string, unknown>;
}

// --- Pedido (esteira comercial) --------------------------------------------
export type PedidoStatus =
  | "aguardando_elegibilidade"
  | "liberado"
  | "bloqueado"
  | "em_analise"
  | "concluido";

export interface Pedido {
  id: UUID;
  campanhaId: UUID;
  cpf: string;
  /**
   * Id do usuário que registrou, como em `propostoPor` do RuleSet. Guardar o
   * nome solto deixava a autoria envelhecer junto com o cadastro e impedia
   * filtrar a carteira por quem vendeu.
   */
  vendedor: string;
  concessionaria: string;
  modelo: string;
  criadoEm: string;
  status: PedidoStatus;
  motivo?: string;
}
