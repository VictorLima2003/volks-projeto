/**
 * Identidade — parte pura, segura para cliente e servidor.
 * A leitura do cookie no servidor mora em `identidade-server.ts`, que importa
 * `next/headers` e por isso não pode ser puxada por um Client Component.
 */
export type Papel = "propoe" | "aprova";

export interface Usuario {
  id: string;
  nome: string;
  area: string;
  papeis: Papel[];
}

export const USUARIOS: Usuario[] = [
  { id: "ana.produto@wolks",       nome: "Ana Prado",   area: "Produto",    papeis: ["propoe"] },
  { id: "caio.marketing@wolks",    nome: "Caio Nunes",  area: "Marketing",  papeis: ["propoe"] },
  { id: "marina.compliance@wolks", nome: "Marina Reis", area: "Compliance", papeis: ["aprova"] },
  { id: "rui.diretoria@wolks",     nome: "Rui Amaral",  area: "Diretoria",  papeis: ["propoe", "aprova"] },
];

export const COOKIE_USUARIO = "wolks_usuario";
export const USUARIO_PADRAO = USUARIOS[0];

export function usuarioPorId(id: string | undefined): Usuario {
  return USUARIOS.find((u) => u.id === id) ?? USUARIO_PADRAO;
}

export function podeAprovar(u: Usuario): boolean {
  return u.papeis.includes("aprova");
}

export function podePropor(u: Usuario): boolean {
  return u.papeis.includes("propoe");
}

/** Leitura do cookie no navegador — usada pelo seletor no header. */
export function usuarioDoDocumento(): Usuario {
  if (typeof document === "undefined") return USUARIO_PADRAO;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_USUARIO}=([^;]*)`));
  return usuarioPorId(match ? decodeURIComponent(match[1]) : undefined);
}
