import { NextResponse } from "next/server";
import { mapaDeRotulos } from "@/lib/engine";
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
      /**
       * Só a mensagem de carregamento de cada hook, indexada pelo id. O hook
       * inteiro não vai: dentro dele estão o código-fonte e os anexos, e o CSV
       * da base de parceiros tem documento de gente de verdade. Nada disso tem
       * o que fazer no navegador de quem responde.
       */
      carregamentos: Object.fromEntries(
        campanha.hooks.map((h) => [h.id, h.mensagemCarregando]),
      ),
      /**
       * E os rótulos de exibição dos fatos, pelo mesmo critério: é texto que a
       * tela precisa escrever, e não revela nada além do que ela já mostra.
       */
      rotulos: mapaDeRotulos(campanha.hooks),
    },
  });
}
