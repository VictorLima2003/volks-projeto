import { NextResponse } from "next/server";
import {
  criarPedido,
  listarPedidos,
  listarSessoes,
  obterPesquisa,
  versaoAtivaDaPesquisa,
} from "@/lib/store";
import { decidir, montarFatos } from "@/lib/engine";
import { desfechosDa } from "@/lib/types";
import { exigirUsuario } from "@/lib/identidade-server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listarPedidos());
}

export async function POST(req: Request) {
  const body = await req.json();
  const { cpf, pesquisaId, modelo } = body;

  const quem = exigirUsuario();
  if ("recusa" in quem) return quem.recusa;
  const autor = quem.usuario;

  const pesquisa = obterPesquisa(pesquisaId);
  if (!pesquisa) {
    return NextResponse.json({ erro: "pesquisa_nao_encontrada" }, { status: 404 });
  }

  // Bloqueio operacional: o pedido só é liberado se o motor confirmar agora.
  const sessao = listarSessoes(pesquisaId)
    .filter((s) => s.cpf.replace(/\D/g, "") === String(cpf).replace(/\D/g, ""))
    .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm))[0];

  const fatos = montarFatos(sessao?.respostas ?? {}, sessao?.externos ?? {});
  const rs = versaoAtivaDaPesquisa(pesquisa);
  if (!rs) {
    return NextResponse.json({ erro: "sem_regras", detalhe: "Esta pesquisa não tem versão de regra publicada — não há o que liberar." }, { status: 409 });
  }
  const decisao = decidir(rs, fatos, desfechosDa(pesquisa));

  /* O que decide não é o nome do desfecho, é o efeito dele. Uma pesquisa pode
     chamar o seu "libera" de qualquer coisa. */
  if (decisao.efeito !== "libera") {
    return NextResponse.json(
      { erro: "nao_elegivel", motivo: decisao.motivo, proximaAcao: decisao.proximaAcao },
      { status: 409 },
    );
  }

  const pedido = criarPedido({
    pesquisaId,
    cpf,
    /*
     * Autoria e loja vêm da sessão, e o que o corpo mandar é ignorado.
     *
     * Cada vendedor entra com o login dele, então quem registra é sempre quem
     * está logado, e a loja é aquela onde ele trabalha. Perguntar qualquer um
     * dos dois seria oferecer a chance de lançar em nome de outra pessoa ou de
     * outra concessionária.
     */
    vendedor: autor.id,
    /* A loja é a de quem registra. Não há mais um cadastro de oferta de onde
       herdar — e herdar dali sempre foi o caso raro, não o comum. */
    concessionaria: autor.concessionaria ?? "",
    modelo: String(modelo ?? ""),
    status: "liberado",
  });

  return NextResponse.json({ pedido, decisao });
}
