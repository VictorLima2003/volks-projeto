import { NextResponse } from "next/server";
import { obterCampanha } from "@/lib/store";
import { executarHook } from "@/lib/hooks-runtime";
import { Hook } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Executa um hook. Chamado pelo bloco de consulta durante a jornada e pelo
 * botão de teste na tela de hooks.
 *
 * `hookAvulso` permite testar o código que está na tela sem salvar antes —
 * sem isso, iterar no editor exigiria salvar a cada tentativa.
 */
export async function POST(req: Request) {
  const { campanhaId, hookId, argumentos, hookAvulso } = (await req.json()) as {
    campanhaId: string;
    hookId?: string;
    argumentos?: Record<string, unknown>;
    hookAvulso?: Hook;
  };

  const campanha = obterCampanha(campanhaId);
  if (!campanha) {
    return NextResponse.json({ erro: "campanha_nao_encontrada" }, { status: 404 });
  }

  const hook = hookAvulso ?? (campanha.hooks ?? []).find((h) => h.id === hookId);
  if (!hook) {
    return NextResponse.json({ erro: "hook_nao_encontrado" }, { status: 404 });
  }
  if (!hookAvulso && !hook.ativo) {
    return NextResponse.json(
      { erro: "hook_inativo", detalhe: `O hook "${hook.nome}" está desativado.` },
      { status: 409 },
    );
  }

  const resultado = await executarHook(hook, argumentos ?? {});

  return NextResponse.json({
    prefixo: hook.prefixo,
    nome: hook.nome,
    ...resultado,
  });
}
