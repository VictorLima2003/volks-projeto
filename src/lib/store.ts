import {
  Campanha,
  DecisaoResultado,
  Pedido,
  SessaoMotorista,
  UUID,
} from "./types";
import {
  CAMPANHAS_SEED,
  PEDIDOS_SEED,
  SESSOES_SEED,
} from "./seed";
import { decidir, montarFatos, ruleSetAtivo } from "./engine";

// --------------------------------------------------------------------------
// Store singleton em memória (reset a cada restart do server)
// --------------------------------------------------------------------------
type State = {
  campanhas: Campanha[];
  sessoes: SessaoMotorista[];
  pedidos: Pedido[];
};

declare global {
  // eslint-disable-next-line no-var
  var __WOLKS_STORE__: State | undefined;
}

function initialState(): State {
  return {
    campanhas: JSON.parse(JSON.stringify(CAMPANHAS_SEED)),
    sessoes: [...SESSOES_SEED],
    pedidos: [...PEDIDOS_SEED],
  };
}

function state(): State {
  if (!globalThis.__WOLKS_STORE__) {
    globalThis.__WOLKS_STORE__ = initialState();
  }
  return globalThis.__WOLKS_STORE__!;
}


// --------------------------------------------------------------------------
// Campanhas
// --------------------------------------------------------------------------
export function listarCampanhas(): Campanha[] {
  return state().campanhas;
}
export function obterCampanha(id: UUID): Campanha | undefined {
  return state().campanhas.find((c) => c.id === id);
}
export function salvarCampanha(c: Campanha) {
  const s = state();
  const i = s.campanhas.findIndex((x) => x.id === c.id);
  if (i >= 0) s.campanhas[i] = c;
  else s.campanhas.push(c);
}

// --------------------------------------------------------------------------
// Sessões (motorista)
// --------------------------------------------------------------------------
export function listarSessoes(campanhaId?: UUID): SessaoMotorista[] {
  const s = state().sessoes;
  return campanhaId ? s.filter((x) => x.campanhaId === campanhaId) : s;
}
export function obterOuIniciarSessao(campanhaId: UUID, cpf: string): SessaoMotorista {
  const s = state();
  let sessao = s.sessoes.find((x) => x.campanhaId === campanhaId && x.cpf === cpf && x.status === "em_andamento");
  if (!sessao) {
    sessao = {
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      campanhaId,
      cpf,
      iniciadaEm: new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      status: "em_andamento",
      respostas: {},
    };
    s.sessoes.push(sessao);
  }
  return sessao;
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
  const campanha = obterCampanha(sessao.campanhaId);
  if (!campanha) return null;
  const rs = ruleSetAtivo(campanha);
  const fatos = montarFatos(sessao.respostas, sessao.externos ?? {});
  const decisao = decidir(rs, fatos);
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
  globalThis.__WOLKS_STORE__ = initialState();
}
