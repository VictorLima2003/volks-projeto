import { NextResponse } from "next/server";
import { obterCampanha } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf") ?? "";
  const campanhaId = searchParams.get("campanha") ?? "";

  const campanha = obterCampanha(campanhaId);
  if (!campanha) {
    return NextResponse.json({ erro: "campanha_nao_encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    campanha: {
      id: campanha.id,
      nome: campanha.nome,
      modelos: campanha.modelos,
      concessionaria: campanha.concessionaria,
      blocos: campanha.blocos,
    }
  });
}
