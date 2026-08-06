import { NextResponse } from "next/server";
import { obterCampanha, salvarCampanha } from "@/lib/store";
import { Bloco, ehCondicional, ehFeedback, ehPergunta } from "@/lib/types";
import { temErro, validarPesquisa } from "@/lib/validacao-pesquisa";
import { podePropor } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";

export const dynamic = "force-dynamic";

/** Limpa campos que não fazem sentido para o tipo, antes de gravar. */
function normalizar(blocos: Bloco[]): Bloco[] {
  return blocos.map((b) => {
    if (ehPergunta(b)) {
      const usaOpcoes = b.tipo === "opcao" || b.tipo === "multipla";
      return {
        ...b,
        campo: b.campo.trim(),
        rotulo: b.rotulo.trim(),
        ajuda: b.ajuda?.trim() || undefined,
        opcoes: usaOpcoes ? (b.opcoes ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
      };
    }
    if (ehCondicional(b)) {
      return {
        ...b,
        rotulo: b.rotulo.trim(),
        entao: normalizar(b.entao),
        senao: normalizar(b.senao),
      };
    }
    if (ehFeedback(b)) {
      return {
        ...b,
        titulo: b.titulo.trim(),
        mensagem: b.mensagem?.trim() || undefined,
        imagemUrl: b.imagemUrl?.trim() || undefined,
        cor: b.cor?.trim() || undefined,
      };
    }
    return { ...b, rotulo: b.rotulo.trim() };
  });
}

/**
 * Salva a pesquisa da campanha.
 * Diferente das regras, a pesquisa não passa por aprovação: ela muda o que se
 * pergunta, não quem é elegível. A decisão continua vindo do RuleSet aprovado.
 */
export async function PUT(req: Request) {
  const { campanhaId, blocos } = (await req.json()) as {
    campanhaId: string;
    blocos: Bloco[];
  };

  const autor = usuarioAtual();
  if (!podePropor(autor)) {
    return NextResponse.json(
      { erro: "sem_permissao", detalhe: `${autor.nome} não pode editar pesquisas.` },
      { status: 403 },
    );
  }

  const campanha = obterCampanha(campanhaId);
  if (!campanha) {
    return NextResponse.json({ erro: "campanha_nao_encontrada" }, { status: 404 });
  }
  if (!Array.isArray(blocos)) {
    return NextResponse.json({ erro: "payload_invalido" }, { status: 400 });
  }

  const problemas = validarPesquisa(blocos);
  if (temErro(problemas)) {
    return NextResponse.json(
      { erro: "pesquisa_invalida", problemas: problemas.filter((p) => p.gravidade === "erro") },
      { status: 400 },
    );
  }

  campanha.blocos = normalizar(blocos);
  salvarCampanha(campanha);

  return NextResponse.json({
    ok: true,
    avisos: problemas.filter((p) => p.gravidade === "aviso"),
  });
}
