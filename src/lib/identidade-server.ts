import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { areaDe, COOKIE_USUARIO, Usuario, usuarioPorId } from "./identidade";

/**
 * Usuário atual em Server Components e Route Handlers.
 * Fica isolado num módulo `server-only` para que um Client Component que importe
 * o Shell não arraste `next/headers` para o bundle do navegador.
 */
export function usuarioAtual(): Usuario | undefined {
  const id = cookies().get(COOKIE_USUARIO)?.value;
  return usuarioPorId(id);
}

/**
 * O usuário de uma rota de API, ou a resposta pronta de recusa.
 *
 * O `middleware` já manda para o login quem pede uma tela sem estar entrado,
 * mas ele não é a trava: uma chamada direta à API não passa por tela nenhuma.
 * Como toda rota que muda alguma coisa precisa fazer a mesma conferência, ela
 * mora aqui em vez de repetida oito vezes.
 */
export function exigirUsuario(): { usuario: Usuario } | { recusa: NextResponse } {
  const usuario = usuarioAtual();
  if (!usuario) {
    return {
      recusa: NextResponse.json(
        { erro: "sem_sessao", detalhe: "Entre para continuar." },
        { status: 401 },
      ),
    };
  }
  return { usuario };
}

/**
 * O usuário de uma tela protegida — ou o desvio para o login.
 *
 * O `middleware` já barra antes de chegar aqui. Esta é a segunda tranca, e ela
 * existe porque o middleware do Next não roda em toda situação (rota estática
 * servida do cache, por exemplo) e uma trava que depende de uma camada só é uma
 * trava que um dia falha calada.
 */
export function exigirUsuarioNaTela(area?: "gestor" | "vendedor"): Usuario {
  const usuario = usuarioAtual();
  if (!usuario) redirect("/entrar");
  /*
   * Entrou, mas na área errada: vai para a sua, e não para uma tela de "sem
   * permissão". O sistema já diz que cada perfil tem a sua área; quem clicou num
   * link antigo quer trabalhar, não ler um aviso.
   */
  if (area && areaDe(usuario) !== area) {
    redirect(areaDe(usuario) === "vendedor" ? "/vendedor" : "/gestor/pesquisas");
  }
  return usuario;
}
