import { ParametroHook } from "./types";

/**
 * O que um destino recebe e com que código ele nasce.
 *
 * Separado de `destinos.ts` porque aquele arquivo importa o runtime, que é
 * `server-only`. A tela de fontes é Client Component: puxar de lá arrastaria
 * `next/headers` e o executor para o bundle do navegador.
 */

/**
 * As variáveis que todo destino recebe, sempre com estes nomes.
 *
 * Fixas, e não editáveis como as de uma fonte: o autor de um destino não escolhe
 * o que a jornada tem para entregar. Se dependessem do que estivesse gravado,
 * apagar um parâmetro sem querer deixaria o código com uma variável indefinida e
 * o erro apareceria só na primeira entrega real.
 */
export const PARAMETROS_DO_DESTINO: ParametroHook[] = [
  { nome: "fatos", rotulo: "Fatos", descricao: "Respostas e retornos das fontes, como nas regras" },
  { nome: "resultado", rotulo: "Resultado", descricao: "Desfecho, efeito e motivo" },
  { nome: "pesquisa", rotulo: "Pesquisa", descricao: "id e nome da pesquisa" },
  { nome: "respondente", rotulo: "Respondente", descricao: "Identificador e id da sessão" },
];

export const CODIGO_INICIAL_DESTINO = [
  "// Este destino roda quando a jornada termina.",
  "// Disponíveis: fatos, resultado, pesquisa, respondente, além de log() e fetch.",
  "",
  "if (resultado.efeito !== 'libera') return { enviado: false };",
  "",
  "// await fetch('https://crm.exemplo/leads', {",
  "//   method: 'POST',",
  "//   headers: { 'content-type': 'application/json' },",
  "//   body: JSON.stringify({",
  "//     documento: respondente.identificador,",
  "//     modelo: fatos.resposta.modelo,",
  "//     origem: pesquisa.nome,",
  "//   }),",
  "// });",
  "",
  "return { enviado: true };",
].join("\n");
