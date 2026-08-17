import "server-only";
import { executarHook } from "./hooks-runtime";
import { listarHooks, obterPesquisa, registrarEntrega } from "./store";
import { montarFatos } from "./engine";
import { PARAMETROS_DO_DESTINO } from "./destinos-catalogo";
import {
  acharDesfecho,
  desfechosDa,
  ehDestino,
  Hook,
  SessaoMotorista,
} from "./types";

/**
 * Levar a jornada terminada para fora — o CRM, uma planilha, um webhook.
 *
 * É o hook ao contrário, e de propósito. O sistema já executa código do autor
 * para **trazer** dado; cravar aqui o formato de um CRM específico poria o nome
 * de um fornecedor dentro do motor, que é exatamente o que este projeto não faz.
 * Quem integra escreve o `fetch` no formato que o destino dele pede.
 */

/**
 * Dispara os destinos ativos para uma jornada que acabou.
 *
 * Roda **depois** de a decisão estar gravada, e o respondente espera por ela.
 * Não é o ideal: um CRM lento segura a tela de quem respondeu. A alternativa —
 * disparar sem esperar — deixaria a falha sem ninguém para registrá-la, porque
 * aqui não há fila nem repetição. Entre travar a tela por alguns segundos e
 * perder lead em silêncio, a escolha foi esperar; o limite de tempo do runtime
 * é o teto. Quando existir fila, isto sai daqui.
 */
export async function despacharDestinos(sessao: SessaoMotorista): Promise<void> {
  const destinos = listarHooks().filter((h) => ehDestino(h) && h.ativo);
  if (destinos.length === 0) return;

  const pesquisa = obterPesquisa(sessao.pesquisaId);
  const desfecho = sessao.resultado
    ? acharDesfecho(desfechosDa(pesquisa ?? {}), sessao.resultado.tipo)
    : undefined;

  const argumentos = {
    fatos: montarFatos(sessao.respostas, sessao.externos ?? {}),
    resultado: sessao.resultado
      ? {
          desfecho: sessao.resultado.tipo,
          rotulo: desfecho?.rotulo,
          efeito: sessao.resultado.efeito,
          motivo: sessao.resultado.motivo,
          decididoEm: sessao.resultado.decididoEm,
          /* Diz se uma pessoa decidiu por cima do motor. Quem recebe o lead
             costuma tratar caso liberado na mão de forma diferente. */
          manual: Boolean(sessao.tratamento),
        }
      : null,
    pesquisa: { id: sessao.pesquisaId, nome: pesquisa?.nome },
    respondente: { identificador: sessao.cpf, sessaoId: sessao.id },
  };

  for (const destino of destinos) {
    /* Os parâmetros são impostos na hora, e não lidos do que está gravado. */
    const comParametros: Hook = { ...destino, parametros: PARAMETROS_DO_DESTINO };
    const r = await executarHook(comParametros, argumentos);

    registrarEntrega(sessao.id, {
      destinoId: destino.id,
      destinoNome: destino.nome,
      ok: r.ok,
      erro: r.erro,
      duracaoMs: r.duracaoMs,
      em: new Date().toISOString(),
    });
  }
}
