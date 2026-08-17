import { NextResponse } from "next/server";
import { despacharDestinos } from "@/lib/destinos";
import { CAMPO_DO_CONSENTIMENTO, consentimentoDe } from "@/lib/types";
import {
  abrirSessao,
  atualizarResposta,
  finalizarSessao,
  obterOuIniciarSessao,
  obterPesquisa,
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

  const pesquisa = obterPesquisa(pesquisaId);
  if (!pesquisa) {
    return NextResponse.json({ erro: "pesquisa_nao_encontrada" }, { status: 404 });
  }

  /*
   * A trava real da autorização. A tela encerra a jornada de quem recusa, mas
   * tela não é trava: um POST aqui, sem passar pelo formulário, decidiria com
   * dados que ninguém autorizou consultar.
   */
  const consentimento = consentimentoDe(pesquisa);
  if (consentimento.ativo && !(respostas ?? {})[CAMPO_DO_CONSENTIMENTO]) {
    return NextResponse.json(
      {
        erro: "sem_consentimento",
        detalhe: "Esta pesquisa exige autorização para consultar os dados, e ela não foi dada.",
      },
      { status: 403 },
    );
  }

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
