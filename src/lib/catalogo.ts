import type { PedidoStatus } from "./types";

/**
 * Catálogos do domínio comercial. Ficam num arquivo só para que a tela de
 * criação de campanha e as validações leiam da mesma fonte.
 */

export const MODELOS_VW = [
  "Polo Track",
  "Polo",
  "Virtus",
  "Nivus",
  "T-Cross",
  "Taos",
  "Tera",
  "Saveiro",
  "Amarok",
  "ID.Buzz",
] as const;

export const UFS = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
] as const;

/** Regiões, para selecionar vários estados de uma vez. */
export const REGIOES: Record<string, string[]> = {
  Norte: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
  Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  "Centro-Oeste": ["DF", "GO", "MT", "MS"],
  Sudeste: ["ES", "MG", "RJ", "SP"],
  Sul: ["PR", "RS", "SC"],
};

export const FAIXAS_ETARIAS = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;

export const CONCESSIONARIAS = [
  "VW Barra Funda (SP)",
  "VW Ipiranga (SP)",
  "VW Anhanguera (SP)",
  "VW Barra (RJ)",
  "VW Tijuca (RJ)",
  "VW Savassi (BH)",
  "VW Batel (PR)",
  "VW Moinhos (RS)",
] as const;

/**
 * Rótulos legíveis dos status da esteira comercial.
 *
 * Existe porque o selo deixou de ser caixa alta (regra 4 do design system): em
 * versalete o `aguardando_elegibilidade` passava por token de código, agora
 * passaria por descuido. O mapa mora aqui, junto do resto do vocabulário do
 * caso — o motor não precisa saber ler status para decidir nada.
 */
export const ROTULO_PEDIDO_STATUS: Record<PedidoStatus, string> = {
  aguardando_elegibilidade: "aguardando elegibilidade",
  liberado: "liberado",
  bloqueado: "bloqueado",
  em_analise: "em análise",
  concluido: "concluído",
};
