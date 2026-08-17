import { NextResponse } from "next/server";
import { despacharDestinos } from "@/lib/destinos";
import {
  abrirSessao,
  atualizarResposta,
  finalizarSessao,
  obterOuIniciarSessao,
  obterSessao,
  registrarExternos,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { pesquisaId, cpf, sessaoId, respostas, externos } = await req.json();
  if (!pesquisaId || !cpf) {
    return NextResponse.json({ erro: "parametros_invalidos" }, { status: 400 });
  }

  /* A jornada manda o id da sessão que ela abriu ao começar; sem ele — uma
     chamada antiga, ou de fora — cai na sessão em andamento daquele CPF. */
  const sessao = sessaoId
    ? abrirSessao(pesquisaId, sessaoId, cpf)
    : obterOuIniciarSessao(pesquisaId, cpf);
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

  /* Depois de a decisão estar gravada, e não antes: destino que falha não pode
     impedir a pessoa de ver o próprio resultado. */
  const encerrada = obterSessao(sessao.id);
  if (encerrada) await despacharDestinos(encerrada);

  return NextResponse.json({ sessaoId: sessao.id, decisao });
}
