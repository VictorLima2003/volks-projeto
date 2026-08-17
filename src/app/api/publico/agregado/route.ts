import { NextResponse } from "next/server";
import {
  aplicarRecorte,
  caminhosAgregaveis,
  compararComPeriodoAnterior,
  distribuicao,
  funil,
  granularidadeSugerida,
  Granularidade,
  recorteDeParams,
  resumir,
  resumoNumerico,
  serieTemporal,
} from "@/lib/analise";
import { autenticarPorToken } from "@/lib/credencial";
import { listarPedidos, listarSessoes } from "@/lib/store";
import { desfechosDa } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Os números **já somados** de uma pesquisa.
 *
 * Existe porque a rota de submissões resolve um problema diferente: ela entrega
 * a linha crua, e quem quer só a série por semana teria que baixar milhares de
 * registros para contá-los do outro lado. Pior que o tráfego é a divergência —
 * cada consumidor reimplementando "o que conta como concluída" produz três
 * respostas diferentes para a mesma pergunta, e a do painel vira só mais uma.
 *
 * Aqui a agregação sai das mesmas funções que desenham a tela. O painel, o CSV e
 * esta resposta não podem discordar porque são o mesmo código.
 *
 * `GET /api/publico/agregado?pesquisa=<id>&por=<caminho>&granularidade=semana`
 * `Authorization: Bearer <token>`
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pesquisaId = searchParams.get("pesquisa") ?? "";

  const acesso = autenticarPorToken(req, pesquisaId);
  if ("recusa" in acesso) return acesso.recusa;

  const pesquisa = acesso.pesquisa;
  const desfechos = desfechosDa(pesquisa);

  const todas = listarSessoes(pesquisa.id);
  const recorte = {
    ...recorteDeParams(Object.fromEntries(searchParams.entries())),
    pesquisaId: undefined,
  };
  const sessoes = aplicarRecorte(todas, recorte);

  const agregaveis = caminhosAgregaveis(todas, desfechos);
  const pedido = searchParams.get("por");
  /* Caminho desconhecido é erro explícito, não silêncio: quem escreveu
     `resposta.modelo_` de madrugada precisa ver o engano na resposta, não um
     objeto vazio que parece "nenhum dado neste período". */
  if (pedido && !agregaveis.some((c) => c.caminho === pedido)) {
    return NextResponse.json(
      {
        erro: "caminho_desconhecido",
        detalhe: `"${pedido}" não é um campo desta pesquisa.`,
        disponiveis: agregaveis.map((c) => c.caminho),
      },
      { status: 400 },
    );
  }

  const granularidadePedida = searchParams.get("granularidade") as Granularidade | null;
  const granularidade: Granularidade = ["dia", "semana", "mes"].includes(granularidadePedida ?? "")
    ? (granularidadePedida as Granularidade)
    : granularidadeSugerida(sessoes);

  const comparacao = compararComPeriodoAnterior(todas, recorte);
  const documentos = new Set(sessoes.map((s) => s.cpf));
  const pedidos = listarPedidos().filter(
    (p) => p.pesquisaId === pesquisa.id && documentos.has(p.cpf),
  );

  const serie = serieTemporal(sessoes, granularidade, {
    agruparPor: pedido ?? "sistema.efeito",
    desfechos,
  });

  const alvo = pedido ?? "sistema.desfecho";
  const numerico = agregaveis.find((c) => c.caminho === alvo)?.tipo === "numero";

  return NextResponse.json({
    pesquisa: { id: pesquisa.id, nome: pesquisa.nome },
    recorte,
    granularidade,
    total: sessoes.length,
    resumo: resumir(sessoes, comparacao?.anterior ?? []),
    funil: funil(sessoes, pedidos.length, pedidos.filter((p) => p.status === "concluido").length),
    /* Distribuição e histograma são excludentes: um campo é categoria ou é
       quantidade, e devolver os dois obrigaria quem consome a adivinhar qual
       está preenchido. */
    distribuicao: numerico ? null : distribuicao(sessoes, alvo, { desfechos, teto: 12 }),
    numerico: numerico ? resumoNumerico(sessoes, alvo) : null,
    serie: { agrupadaPor: pedido ?? "sistema.efeito", pontos: serie.pontos, series: serie.series },
    /* O catálogo vai junto para quem integra não precisar adivinhar o que
       existe — é a documentação que não envelhece, porque sai do próprio dado. */
    campos: agregaveis.map((c) => ({
      caminho: c.caminho,
      rotulo: c.rotulo,
      origem: c.origem,
      tipo: c.tipo,
      distintos: c.distintos,
    })),
  });
}
