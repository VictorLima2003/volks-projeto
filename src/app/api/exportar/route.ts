import { NextResponse } from "next/server";
import { aplicarRecorte, recorteDeParams } from "@/lib/analise";
import { linhasDeSubmissao, paraCsv } from "@/lib/exportacao";
import { podePropor } from "@/lib/identidade";
import { exigirUsuario } from "@/lib/identidade-server";
import { listarPesquisas, listarSessoes } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Download do CSV, com o mesmo recorte que a tela está mostrando.
 *
 * Os filtros vêm na URL justamente para isto: o que se vê é o que se baixa. Um
 * botão que exportasse sempre tudo obrigaria a filtrar de novo na planilha.
 *
 * O recorte é lido por `recorteDeParams` e aplicado por `aplicarRecorte` — as
 * mesmas funções que a tela usa. Enquanto esta rota tinha a própria filtragem,
 * ela conhecia três parâmetros enquanto a tela oferecia oito: quem baixasse
 * depois de escolher um período ou uma busca levava a base inteira achando que
 * levava o recorte. Duplicar a regra é garantir que as duas divirjam.
 */
export async function GET(req: Request) {
  const sessao = exigirUsuario();
  if ("recusa" in sessao) return sessao.recusa;
  if (!podePropor(sessao.usuario)) {
    return NextResponse.json({ erro: "sem_permissao" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const recorte = recorteDeParams(Object.fromEntries(searchParams.entries()));

  const sessoes = aplicarRecorte(listarSessoes(), recorte);
  const { colunas, linhas } = linhasDeSubmissao(sessoes, listarPesquisas());
  const nome = `submissoes${recorte.pesquisaId ? `-${recorte.pesquisaId}` : ""}.csv`;

  return new NextResponse(paraCsv(colunas, linhas), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nome}"`,
    },
  });
}
