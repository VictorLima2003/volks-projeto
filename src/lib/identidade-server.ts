import "server-only";
import { cookies } from "next/headers";
import { COOKIE_USUARIO, Usuario, usuarioPorId } from "./identidade";

/**
 * Usuário atual em Server Components e Route Handlers.
 * Fica isolado num módulo `server-only` para que um Client Component que importe
 * o Shell não arraste `next/headers` para o bundle do navegador.
 */
export function usuarioAtual(): Usuario {
  const id = cookies().get(COOKIE_USUARIO)?.value;
  return usuarioPorId(id);
}
