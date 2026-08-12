import {
  APRESENTACAO_PADRAO,
  DESFECHOS_PADRAO,
  desfechosDa,
  DecisaoResultado,
  Hook,
  Pedido,
  Pesquisa,
  RuleSet,
  SessaoMotorista,
  UUID,
} from "./types";
import {
  HOOKS_SEED,
  PEDIDOS_SEED,
  PESQUISAS_SEED,
  SESSOES_SEED,
} from "./seed";
import { decidir, montarFatos } from "./engine";

// --------------------------------------------------------------------------
// Store singleton em memória (reset a cada restart do server)
// --------------------------------------------------------------------------
type State = {
  /** Fontes de dado da plataforma. Uma coleção só, compartilhada. */
  hooks: Hook[];
  /** As pesquisas — a unidade do sistema. */
  pesquisas: Pesquisa[];
  sessoes: SessaoMotorista[];
  pedidos: Pedido[];
};

declare global {
  // eslint-disable-next-line no-var
  var __VOLKSWAGEN_STORE__: State | undefined;
}

function initialState(): State {
  return {
    hooks: JSON.parse(JSON.stringify(HOOKS_SEED)),
    pesquisas: JSON.parse(JSON.stringify(PESQUISAS_SEED)),
    sessoes: [...SESSOES_SEED],
    pedidos: [...PEDIDOS_SEED],
  };
}

function state(): State {
  if (!globalThis.__VOLKSWAGEN_STORE__) {
    globalThis.__VOLKSWAGEN_STORE__ = initialState();
  }
  return globalThis.__VOLKSWAGEN_STORE__!;
}


// --------------------------------------------------------------------------
// Fontes de dado (hooks) — do sistema, não de uma pesquisa
// --------------------------------------------------------------------------
export function listarHooks(): Hook[] {
  return state().hooks;
}
export function obterHook(id: UUID): Hook | undefined {
  return state().hooks.find((h) => h.id === id);
}
export function salvarHooks(hooks: Hook[]) {
  state().hooks = hooks;
}

// --------------------------------------------------------------------------
// Pesquisas e réguas — também do sistema
// --------------------------------------------------------------------------
export function listarPesquisas(): Pesquisa[] {
  return state().pesquisas;
}
export function obterPesquisa(id: UUID): Pesquisa | undefined {
  return state().pesquisas.find((p) => p.id === id);
}
/**
 * Cria uma pesquisa vazia. Nasce sem bloco nenhum de propósito: qualquer bloco
 * padrão seria um palpite sobre o caso de uso, e é o construtor que pergunta.
 */
export function criarPesquisa(nome: string, descricao?: string): Pesquisa {
  const agora = new Date().toISOString();
  const pesquisa: Pesquisa = {
    id: `pesq_${Date.now().toString(36)}`,
    nome,
    descricao,
    status: "rascunho",
    blocos: [],
    versoes: [],
    apresentacao: { ...APRESENTACAO_PADRAO },
    /* Cópia, não referência: mexer nos desfechos de uma pesquisa não pode
       reescrever os das outras. */
    desfechos: DESFECHOS_PADRAO.map((d) => ({ ...d })),
    criadaEm: agora,
    atualizadaEm: agora,
  };
  state().pesquisas.push(pesquisa);
  return pesquisa;
}

export function salvarPesquisa(p: Pesquisa) {
  const s = state();
  const i = s.pesquisas.findIndex((x) => x.id === p.id);
  if (i >= 0) s.pesquisas[i] = p;
  else s.pesquisas.push(p);
}

/**
 * A versão das regras que decide por esta pesquisa.
 *
 * `undefined` quer dizer que não há decisão a tomar: a pesquisa só coleta, ou
 * nenhuma versão foi publicada ainda. Quem chama precisa dizer isso na tela em
 * vez de tratar como erro.
 */
export function versaoAtivaDaPesquisa(pesquisa: Pesquisa): RuleSet | undefined {
  if (pesquisa.versoes.length === 0) return undefined;
  return pesquisa.versoes.find((v) => v.id === pesquisa.versaoAtivaId);
}

// --------------------------------------------------------------------------
// Sessões (motorista)
// --------------------------------------------------------------------------
export function listarSessoes(pesquisaId?: UUID): SessaoMotorista[] {
  const s = state().sessoes;
  return pesquisaId ? s.filter((x) => x.pesquisaId === pesquisaId) : s;
}
/**
 * Abre a sessão no **começo** do percurso, e não no fim.
 *
 * Antes ela só nascia em `/api/decidir`, quando a jornada terminava: quem
 * fechava a aba na terceira pergunta não existia em lugar nenhum, e a tela de
 * submissões não tinha como mostrar "100% delas". Agora quem percorre traz o
 * próprio `id`, gerado no navegador, e a sessão acompanha o percurso.
 *
 * O `id` vem de fora porque a identificação pode chegar depois — numa pesquisa
 * que abre por convite, o CPF é a terceira pergunta. Sem um id próprio, cada
 * atualização criaria uma sessão nova até o identificador aparecer.
 */
export function abrirSessao(
  pesquisaId: UUID,
  sessaoId: UUID,
  identificador = "",
): SessaoMotorista {
  const s = state();
  let sessao = s.sessoes.find((x) => x.id === sessaoId);
  if (!sessao) {
    sessao = {
      id: sessaoId,
      pesquisaId,
      cpf: identificador,
      iniciadaEm: new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      status: "em_andamento",
      respostas: {},
    };
    s.sessoes.push(sessao);
  }
  /* O identificador só sobrescreve quando chega — uma atualização anterior ao
     CPF não pode apagar o que já foi identificado. */
  if (identificador) sessao.cpf = identificador;
  sessao.atualizadaEm = new Date().toISOString();
  return sessao;
}

/** Compatibilidade: quem ainda chama por CPF cai na sessão em andamento dele. */
export function obterOuIniciarSessao(pesquisaId: UUID, cpf: string): SessaoMotorista {
  const s = state();
  const existente = s.sessoes.find(
    (x) => x.pesquisaId === pesquisaId && x.cpf === cpf && x.status === "em_andamento",
  );
  if (existente) return existente;
  return abrirSessao(pesquisaId, `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, cpf);
}

export function atualizarResposta(sessaoId: UUID, campo: string, valor: unknown) {
  const s = state();
  const sessao = s.sessoes.find((x) => x.id === sessaoId);
  if (!sessao) return;
  sessao.respostas[campo] = valor;
  sessao.atualizadaEm = new Date().toISOString();
}

/** Guarda os fatos que vieram de fontes externas durante a jornada. */
export function registrarExternos(
  sessaoId: UUID,
  externos: Record<string, Record<string, unknown>>,
) {
  const s = state();
  const sessao = s.sessoes.find((x) => x.id === sessaoId);
  if (!sessao) return;
  sessao.externos = { ...(sessao.externos ?? {}), ...externos };
  sessao.atualizadaEm = new Date().toISOString();
}

export function finalizarSessao(sessaoId: UUID): DecisaoResultado | null {
  const s = state();
  const sessao = s.sessoes.find((x) => x.id === sessaoId);
  if (!sessao) return null;
  const pesquisa = obterPesquisa(sessao.pesquisaId);
  if (!pesquisa) return null;
  const rs = versaoAtivaDaPesquisa(pesquisa);
  // Sem regras a pesquisa só coleta: encerra a sessão, mas não inventa desfecho.
  if (!rs) {
    sessao.status = "concluida";
    sessao.atualizadaEm = new Date().toISOString();
    return null;
  }
  const fatos = montarFatos(sessao.respostas, sessao.externos ?? {});
  const decisao = decidir(rs, fatos, desfechosDa(pesquisa));
  sessao.resultado = decisao;
  sessao.ruleSetVersao = rs.versao;
  sessao.status = "concluida";
  sessao.atualizadaEm = new Date().toISOString();
  return decisao;
}

// --------------------------------------------------------------------------
// Pedidos (vendedor)
// --------------------------------------------------------------------------
export function listarPedidos(): Pedido[] {
  return state().pedidos;
}
export function pedidosPorCpf(cpf: string): Pedido[] {
  return state().pedidos.filter((p) => p.cpf === cpf);
}
export function criarPedido(p: Omit<Pedido, "id" | "criadoEm">): Pedido {
  const s = state();
  const novo: Pedido = {
    ...p,
    id: `ped_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    criadoEm: new Date().toISOString(),
  };
  s.pedidos.push(novo);
  return novo;
}
export function atualizarPedido(id: UUID, patch: Partial<Pedido>) {
  const s = state();
  const i = s.pedidos.findIndex((p) => p.id === id);
  if (i >= 0) s.pedidos[i] = { ...s.pedidos[i], ...patch };
}

// --------------------------------------------------------------------------
// Reset (útil para demo)
// --------------------------------------------------------------------------
export function resetStore() {
  globalThis.__VOLKSWAGEN_STORE__ = initialState();
}
