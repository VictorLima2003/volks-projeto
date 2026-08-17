import { areaDe } from "@/lib/identidade";
import { exigirUsuario } from "@/lib/identidade-server";
import { despacharDestinos } from "@/lib/destinos";
import { obterPesquisa, tratarSessao } from "@/lib/store";
import { desfechosDa } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * A decisão humana sobre um caso que o motor segurou.
 *
 * Quem trata é a área do gestor, e não só quem revisa versão de regra: são duas
 * responsabilidades diferentes. Revisar versão é dizer se a régua pode valer
 * para todo mundo; tratar exceção é resolver o caso de uma pessoa dentro da
 * régua que já vale.
 *
 * O motivo é obrigatório. Sem ele, a fila vira uma lista de decisões sem
 * explicação, e a primeira pergunta que alguém faz meses depois — "por que este
 * aqui passou?" — não tem resposta em lugar nenhum.
 */
export async function POST(req: Request) {
  const sessao = exigirUsuario();
  if ("recusa" in sessao) return sessao.recusa;
  if (areaDe(sessao.usuario) !== "gestor") {
    return NextResponse.json(
      { erro: "sem_permissao", detalhe: `${sessao.usuario.nome} não trata exceções.` },
      { status: 403 },
    );
  }

  const { sessaoId, desfechoId, motivo } = (await req.json()) as {
    sessaoId?: string;
    desfechoId?: string;
    motivo?: string;
  };

  if (!motivo?.trim()) {
    return NextResponse.json(
      { erro: "sem_motivo", detalhe: "Escreva por que está decidindo assim." },
      { status: 400 },
    );
  }

  const tratada = tratarSessao(String(sessaoId), {
    desfechoId: String(desfechoId),
    motivo: motivo.trim(),
    por: sessao.usuario.id,
  });

  if (!tratada) {
    return NextResponse.json(
      {
        erro: "nao_tratavel",
        detalhe:
          "Este caso não está mais na fila, ou o desfecho escolhido não é desta pesquisa.",
      },
      { status: 409 },
    );
  }

  /* O lead liberado na mão precisa chegar ao mesmo lugar que o liberado pelo
     motor. Sem isto, o caso que passou pela conferência humana seria justamente
     o que nunca aparece no CRM. */
  await despacharDestinos(tratada);

  const pesquisa = obterPesquisa(tratada.pesquisaId);
  const desfecho = desfechosDa(pesquisa ?? {}).find((d) => d.id === desfechoId);

  return NextResponse.json({
    ok: true,
    desfecho: desfecho?.rotulo,
    aviso: tratada.avisos?.at(-1),
  });
}
