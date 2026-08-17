import { NextResponse } from "next/server";
import { aplicarRecorte, recorteDeParams } from "@/lib/analise";
import { autenticarPorToken } from "@/lib/credencial";
import { linhasDeSubmissao, paraCsv } from "@/lib/exportacao";
import { listarPesquisas, listarSessoes } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * As submissões de uma pesquisa, para quem consome de fora.
 *
 * Autenticação por token da própria pesquisa, no cabeçalho `Authorization` — é
 * o que permite entregar acesso a uma analista sem dar login no sistema, e
 * revogar depois sem mexer no resto. O token vai no cabeçalho, e não na URL:
 * endereço com segredo dentro vaza no histórico do navegador, no log do servidor
 * e no print que a pessoa manda.
 *
 * Aceita **os mesmos parâmetros de recorte da tela**. Sem isso, quem integra por
 * API só conseguia puxar a base inteira e refiltrar do outro lado — e a conta do
 * painel nunca batia com a do notebook.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pesquisaId = searchParams.get("pesquisa") ?? "";

  const acesso = autenticarPorToken(req, pesquisaId);
  if ("recusa" in acesso) return acesso.recusa;

  /* O recorte não pode trocar de pesquisa: a credencial é de uma só, e um
     `?pesquisa=` no meio do recorte abriria a base das outras. */
  const recorte = { ...recorteDeParams(Object.fromEntries(searchParams.entries())), pesquisaId: undefined };
  const sessoes = aplicarRecorte(listarSessoes(acesso.pesquisa.id), recorte);
  const { colunas, linhas } = linhasDeSubmissao(sessoes, listarPesquisas());

  if (searchParams.get("formato") === "csv") {
    return new NextResponse(paraCsv(colunas, linhas), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="submissoes-${acesso.pesquisa.id}.csv"`,
      },
    });
  }

  return NextResponse.json({
    pesquisa: { id: acesso.pesquisa.id, nome: acesso.pesquisa.nome },
    recorte,
    colunas,
    total: linhas.length,
    submissoes: linhas,
  });
}
