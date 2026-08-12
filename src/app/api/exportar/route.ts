import { NextResponse } from "next/server";
import { linhasDeSubmissao, paraCsv } from "@/lib/exportacao";
import { podePropor } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";
import { listarPesquisas, listarSessoes } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Download do CSV, com o mesmo recorte que a tela está mostrando.
 *
 * Os filtros vêm na URL justamente para isto: o que se vê é o que se baixa. Um
 * botão que exportasse sempre tudo obrigaria a filtrar de novo na planilha.
 */
export async function GET(req: Request) {
  if (!podePropor(usuarioAtual())) {
    return NextResponse.json({ erro: "sem_permissao" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const pesquisaId = searchParams.get("pesquisa");
  const estado = searchParams.get("estado");
  const falha = searchParams.get("falha") === "1";

  const sessoes = listarSessoes().filter((s) => {
    if (pesquisaId && s.pesquisaId !== pesquisaId) return false;
    if (estado && s.status !== estado) return false;
    if (falha && !Object.values(s.externos ?? {}).some((f) => f?.erro === true)) return false;
    return true;
  });

  const { colunas, linhas } = linhasDeSubmissao(sessoes, listarPesquisas());
  const nome = `submissoes${pesquisaId ? `-${pesquisaId}` : ""}.csv`;

  return new NextResponse(paraCsv(colunas, linhas), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nome}"`,
    },
  });
}
