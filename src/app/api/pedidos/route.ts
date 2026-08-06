import { NextResponse } from "next/server";
import {
  criarPedido,
  listarPedidos,
  listarSessoes,
  obterCampanha,
} from "@/lib/store";
import { decidir, montarFatos, ruleSetAtivo } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listarPedidos());
}

export async function POST(req: Request) {
  const body = await req.json();
  const { cpf, campanhaId, vendedor, concessionaria, modelo } = body;

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
    vendedor: String(vendedor ?? ""),
    concessionaria: String(concessionaria ?? campanha.concessionaria),
    modelo: String(modelo ?? campanha.modelos[0] ?? ""),
    status: "liberado",
  });

  return NextResponse.json({ pedido, decisao });
}
