import { NextResponse } from "next/server";
import { linhasDeSubmissao, paraCsv } from "@/lib/exportacao";
import { listarPesquisas, listarSessoes, obterPesquisa } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * As submissões de uma pesquisa, para quem consome de fora.
 *
 * Autenticação por token da própria pesquisa, no cabeçalho `Authorization`. É o
 * que permite entregar acesso a uma analista sem dar login no sistema, e
 * revogar depois sem mexer no resto.
 *
 * O token vai no cabeçalho, e não na URL: endereço com segredo dentro vaza no
 * histórico do navegador, no log do servidor e no print que a pessoa manda.
 *
 * Limitações registradas: o token é comparado em texto (protótipo, sem hash) e
 * não há limite de requisições. Ver README.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pesquisaId = searchParams.get("pesquisa") ?? "";
  const formato = searchParams.get("formato") ?? "json";

  const cabecalho = req.headers.get("authorization") ?? "";
  const token = cabecalho.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json(
      { erro: "sem_credencial", detalhe: "Mande o token em Authorization: Bearer <token>." },
      { status: 401 },
    );
  }

  const pesquisa = obterPesquisa(pesquisaId);
  /*
   * Mesma resposta para pesquisa inexistente e token errado.
   *
   * Distinguir as duas contaria a quem tenta que aquele id existe — é a forma
   * mais barata de mapear o sistema de fora.
   */
  const credencial = pesquisa?.tokens?.find((t) => t.valor === token);
  if (!pesquisa || !credencial) {
    return NextResponse.json({ erro: "credencial_invalida" }, { status: 401 });
  }

  credencial.ultimoUsoEm = new Date().toISOString();

  const sessoes = listarSessoes(pesquisa.id);
  const { colunas, linhas } = linhasDeSubmissao(sessoes, listarPesquisas());

  if (formato === "csv") {
    return new NextResponse(paraCsv(colunas, linhas), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="submissoes-${pesquisa.id}.csv"`,
      },
    });
  }

  return NextResponse.json({
    pesquisa: { id: pesquisa.id, nome: pesquisa.nome },
    colunas,
    total: linhas.length,
    submissoes: linhas,
  });
}
