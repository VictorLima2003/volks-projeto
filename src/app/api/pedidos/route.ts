import { NextResponse } from "next/server";
import {
  criarPedido,
  listarPedidos,
  listarSessoes,
  obterCampanha,
} from "@/lib/store";
import { decidir, montarFatos, ruleSetAtivo } from "@/lib/engine";
import { usuarioAtual } from "@/lib/identidade-server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listarPedidos());
}

export async function POST(req: Request) {
  const body = await req.json();
  const { cpf, campanhaId, modelo } = body;

  const autor = usuarioAtual();

  const campanha = obterCampanha(campanhaId);
  if (!campanha) {
    return NextResponse.json({ erro: "campanha_nao_encontrada" }, { status: 404 });
  }

  // Bloqueio operacional: o pedido só é liberado se o motor confirmar agora.
  const sessao = listarSessoes(campanhaId)
    .filter((s) => s.cpf.replace(/\D/g, "") === String(cpf).replace(/\D/g, ""))
    .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm))[0];

  const fatos = montarFatos(sessao?.respostas ?? {}, sessao?.externos ?? {});
  const decisao = decidir(ruleSetAtivo(campanha), fatos);

  if (decisao.tipo !== "elegivel") {
    return NextResponse.json(
      { erro: "nao_elegivel", motivo: decisao.motivo, proximaAcao: decisao.proximaAcao },
      { status: 409 },
    );
  }

  const pedido = criarPedido({
    campanhaId,
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
    concessionaria: autor.concessionaria ?? campanha.concessionaria,
    modelo: String(modelo ?? campanha.modelos[0] ?? ""),
    status: "liberado",
  });

  return NextResponse.json({ pedido, decisao });
}
