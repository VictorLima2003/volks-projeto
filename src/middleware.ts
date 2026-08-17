import { NextRequest, NextResponse } from "next/server";
import { COOKIE_USUARIO } from "@/lib/identidade";

/**
 * Quem não entrou não vê área de trabalho.
 *
 * O middleware é a primeira tranca, não a única: ele só confere se **existe**
 * cookie, porque conferir se o cookie corresponde a alguém exigiria a lista de
 * usuários dentro do runtime de edge. Quem confere de verdade é a tela, com
 * `exigirUsuarioNaTela`, e a API, com `exigirUsuario` — as duas leem o cadastro.
 *
 * O ganho de tê-lo aqui é o desvio acontecer antes de a página montar, com o
 * endereço pretendido preservado: quem clicou num link de submissão volta para
 * ele depois de entrar, em vez de cair na porta e ter que procurar de novo.
 *
 * `/motorista` fica de fora de propósito. É a área de quem responde, e o link da
 * pesquisa vai para gente que não tem conta aqui e nem deveria ter.
 */
export function middleware(req: NextRequest) {
  if (req.cookies.get(COOKIE_USUARIO)) return NextResponse.next();

  const entrar = new URL("/entrar", req.url);
  entrar.searchParams.set("de", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(entrar);
}

export const config = {
  matcher: ["/gestor/:path*", "/vendedor/:path*"],
};
