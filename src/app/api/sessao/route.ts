import { NextResponse } from "next/server";
import { abrirSessao, atualizarResposta, obterPesquisa, registrarExternos } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Registra o percurso enquanto ele acontece.
 *
 * A jornada chama isto ao abrir e a cada resposta. É o que faz existir a
 * submissão de quem parou no meio — antes, só quem chegava ao fim virava
 * registro, e a tela de submissões mostrava uma amostra enviesada: a das
 * pessoas que terminaram.
 *
 * Sem trava de identidade: quem responde não tem login. A trava aqui é o
 * próprio `sessaoId`, que o navegador gera e mantém durante o percurso.
 */
export async function POST(req: Request) {
  const { pesquisaId, sessaoId, identificador, respostas, externos } = (await req.json()) as {
    pesquisaId?: string;
    sessaoId?: string;
    identificador?: string;
    respostas?: Record<string, unknown>;
    externos?: Record<string, Record<string, unknown>>;
  };

  if (!pesquisaId || !sessaoId) {
    return NextResponse.json({ erro: "parametros_invalidos" }, { status: 400 });
  }
  if (!obterPesquisa(pesquisaId)) {
    return NextResponse.json({ erro: "pesquisa_nao_encontrada" }, { status: 404 });
  }

  const sessao = abrirSessao(pesquisaId, sessaoId, identificador?.trim() || "");
  for (const [campo, valor] of Object.entries(respostas ?? {})) {
    atualizarResposta(sessao.id, campo, valor);
  }
  if (externos && Object.keys(externos).length > 0) registrarExternos(sessao.id, externos);

  return NextResponse.json({ ok: true, sessaoId: sessao.id });
}
