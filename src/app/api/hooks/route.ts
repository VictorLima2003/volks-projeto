import { NextResponse } from "next/server";
import { obterCampanha, salvarCampanha } from "@/lib/store";
import { Hook } from "@/lib/types";
import { podePropor } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";

export const dynamic = "force-dynamic";

const IDENTIFICADOR = /^[a-z][a-zA-Z0-9]*$/;
const PREFIXOS_RESERVADOS = ["resposta"];

export async function PUT(req: Request) {
  const { campanhaId, hooks } = (await req.json()) as { campanhaId: string; hooks: Hook[] };

  const autor = usuarioAtual();
  if (!podePropor(autor)) {
    return NextResponse.json(
      { erro: "sem_permissao", detalhe: `${autor.nome} não pode editar hooks.` },
      { status: 403 },
    );
  }

  const campanha = obterCampanha(campanhaId);
  if (!campanha) {
    return NextResponse.json({ erro: "campanha_nao_encontrada" }, { status: 404 });
  }
  if (!Array.isArray(hooks)) {
    return NextResponse.json({ erro: "payload_invalido" }, { status: 400 });
  }

  for (const h of hooks) {
    if (!h.nome?.trim()) {
      return NextResponse.json(
        { erro: "invalido", detalhe: "Todo hook precisa de um nome." },
        { status: 400 },
      );
    }
    if (!IDENTIFICADOR.test(h.prefixo ?? "")) {
      return NextResponse.json(
        {
          erro: "prefixo_invalido",
          detalhe: `O prefixo "${h.prefixo}" deve começar com letra minúscula e usar só letras e números.`,
        },
        { status: 400 },
      );
    }
    if (PREFIXOS_RESERVADOS.includes(h.prefixo)) {
      return NextResponse.json(
        { erro: "prefixo_reservado", detalhe: `"${h.prefixo}" é reservado pelo motor.` },
        { status: 400 },
      );
    }
    for (const p of h.parametros ?? []) {
      if (!IDENTIFICADOR.test(p.nome ?? "")) {
        return NextResponse.json(
          {
            erro: "parametro_invalido",
            detalhe: `Em "${h.nome}", o parâmetro "${p.nome}" precisa ser um identificador válido — ele vira uma variável no código.`,
          },
          { status: 400 },
        );
      }
    }
    const nomes = (h.parametros ?? []).map((p) => p.nome);
    const repetido = nomes.find((n, i) => nomes.indexOf(n) !== i);
    if (repetido) {
      return NextResponse.json(
        { erro: "parametro_duplicado", detalhe: `Em "${h.nome}", o parâmetro "${repetido}" está repetido.` },
        { status: 400 },
      );
    }
  }

  // Dois prefixos iguais fariam um hook apagar os fatos do outro.
  const prefixos = hooks.map((h) => h.prefixo);
  const prefixoRepetido = prefixos.find((p, i) => prefixos.indexOf(p) !== i);
  if (prefixoRepetido) {
    return NextResponse.json(
      {
        erro: "prefixo_duplicado",
        detalhe: `Mais de um hook usa o prefixo "${prefixoRepetido}". Um sobrescreveria os fatos do outro.`,
      },
      { status: 400 },
    );
  }

  campanha.hooks = hooks;
  salvarCampanha(campanha);
  return NextResponse.json({ ok: true, total: hooks.length });
}
