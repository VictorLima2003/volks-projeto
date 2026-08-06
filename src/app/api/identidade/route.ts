import { NextResponse } from "next/server";
import { COOKIE_USUARIO, USUARIOS } from "@/lib/identidade";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { usuarioId } = await req.json();
  if (!USUARIOS.some((u) => u.id === usuarioId)) {
    return NextResponse.json({ erro: "usuario_invalido" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, usuarioId });
  res.cookies.set(COOKIE_USUARIO, usuarioId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
