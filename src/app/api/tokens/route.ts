import { NextResponse } from "next/server";
import { podePropor } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";
import { obterPesquisa } from "@/lib/store";
import { TokenApi } from "@/lib/types";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Cria uma credencial de leitura para uma pesquisa.
 *
 * O valor é sorteado aqui, no servidor: um token gerado no navegador nasce com
 * a aleatoriedade que aquele navegador tiver, e é o tipo de detalhe que ninguém
 * confere depois.
 */
export async function POST(req: Request) {
  const { pesquisaId, nome } = (await req.json()) as { pesquisaId?: string; nome?: string };

  const autor = usuarioAtual();
  if (!podePropor(autor)) {
    return NextResponse.json({ erro: "sem_permissao" }, { status: 403 });
  }
  const pesquisa = pesquisaId ? obterPesquisa(pesquisaId) : undefined;
  if (!pesquisa) {
    return NextResponse.json({ erro: "pesquisa_nao_encontrada" }, { status: 404 });
  }
  if (!nome?.trim()) {
    return NextResponse.json(
      { erro: "sem_nome", detalhe: "Diga para quem é esta credencial — é o que permite revogar a certa depois." },
      { status: 400 },
    );
  }

  const token: TokenApi = {
    id: `tok_${Date.now().toString(36)}`,
    nome: nome.trim(),
    valor: `vw_${randomBytes(24).toString("hex")}`,
    criadoEm: new Date().toISOString(),
    criadoPor: autor.id,
  };
  pesquisa.tokens = [...(pesquisa.tokens ?? []), token];

  return NextResponse.json({ token });
}

/** Revoga. Sem confirmação do servidor: quem tinha o token perde o acesso agora. */
export async function DELETE(req: Request) {
  const { pesquisaId, tokenId } = (await req.json()) as { pesquisaId?: string; tokenId?: string };

  if (!podePropor(usuarioAtual())) {
    return NextResponse.json({ erro: "sem_permissao" }, { status: 403 });
  }
  const pesquisa = pesquisaId ? obterPesquisa(pesquisaId) : undefined;
  if (!pesquisa) {
    return NextResponse.json({ erro: "pesquisa_nao_encontrada" }, { status: 404 });
  }

  pesquisa.tokens = (pesquisa.tokens ?? []).filter((t) => t.id !== tokenId);
  return NextResponse.json({ ok: true });
}
