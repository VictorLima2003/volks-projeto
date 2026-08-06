import { NextResponse } from "next/server";
import {
  atualizarResposta,
  finalizarSessao,
  obterOuIniciarSessao,
  registrarExternos,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { campanhaId, cpf, respostas, externos } = await req.json();
  if (!campanhaId || !cpf) {
    return NextResponse.json({ erro: "parametros_invalidos" }, { status: 400 });
  }

  const sessao = obterOuIniciarSessao(campanhaId, cpf);
  for (const [campo, valor] of Object.entries(respostas ?? {})) {
    atualizarResposta(sessao.id, campo, valor);
  }
  // Os fatos externos vieram das consultas disparadas durante a jornada e
  // precisam entrar na decisão junto com as respostas.
  registrarExternos(sessao.id, externos ?? {});

  const decisao = finalizarSessao(sessao.id);
  if (!decisao) {
    return NextResponse.json({ erro: "falha_decisao" }, { status: 500 });
  }
  return NextResponse.json({ sessaoId: sessao.id, decisao });
}
