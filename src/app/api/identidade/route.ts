import { NextResponse } from "next/server";
import { areaDe, COOKIE_USUARIO, USUARIOS } from "@/lib/identidade";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { usuarioId } = await req.json();

  /*
   * `null` é sair: apaga o cookie e a próxima leitura cai no usuário padrão.
   * Não existe sessão para invalidar — o protótipo guarda só quem você é.
   */
  if (usuarioId === null) {
    const res = NextResponse.json({ ok: true, usuarioId: null });
    res.cookies.delete(COOKIE_USUARIO);
    return res;
  }

  const usuario = USUARIOS.find((u) => u.id === usuarioId);
  if (!usuario) {
    return NextResponse.json({ erro: "usuario_invalido" }, { status: 400 });
  }
  /* A área vai na resposta para a tela de entrada saber para onde mandar sem
     ter que conhecer os papéis de cada um. */
  const res = NextResponse.json({ ok: true, usuarioId, area: areaDe(usuario) });
  res.cookies.set(COOKIE_USUARIO, usuarioId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
