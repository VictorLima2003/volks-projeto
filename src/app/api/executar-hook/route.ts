import { NextResponse } from "next/server";
import { listarHooks } from "@/lib/store";
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
  const { hookId, argumentos, hookAvulso } = (await req.json()) as {
    hookId?: string;
    argumentos?: Record<string, unknown>;
    hookAvulso?: Hook;
  };


  const hook = hookAvulso ?? listarHooks().find((h) => h.id === hookId);
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
