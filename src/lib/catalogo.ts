import type { PedidoStatus } from "./types";

/**
 * O vocabulário do caso de uso que a interface precisa escrever.
 *
 * Já foi maior: guardava modelos, UFs, regiões e faixas etárias para o
 * formulário de criação de campanha. Com a campanha fora do modelo, esses
 * dados passaram a viver onde são usados — os modelos, por exemplo, são as
 * opções da pergunta que os oferece ao respondente.
 */

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
