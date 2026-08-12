/**
 * Identidade — parte pura, segura para cliente e servidor.
 * A leitura do cookie no servidor mora em `identidade-server.ts`, que importa
 * `next/headers` e por isso não pode ser puxada por um Client Component.
 */
export type Papel = "propoe" | "revisa" | "vende";

export interface Usuario {
  id: string;
  nome: string;
  area: string;
  papeis: Papel[];
  /**
   * Loja de quem vende. Só existe para o papel `vende`, e é ela que entra no
   * pedido — a concessionária deixou de ser campo digitável na tela: quem vende
   * vende pela loja onde trabalha.
   */
  concessionaria?: string;
}

export const USUARIOS: Usuario[] = [
  { id: "ana.produto@volkswagen",       nome: "Ana Prado",   area: "Produto",    papeis: ["propoe"] },
  { id: "caio.marketing@volkswagen",    nome: "Caio Nunes",  area: "Marketing",  papeis: ["propoe"] },
  { id: "marina.compliance@volkswagen", nome: "Marina Reis", area: "Compliance", papeis: ["revisa"] },
  { id: "rui.diretoria@volkswagen",     nome: "Rui Amaral",  area: "Diretoria",  papeis: ["propoe", "revisa"] },
  // Quem atende no balcão. Entra com o próprio login, e é por isso que a
  // carteira consegue ser a carteira de alguém em vez da lista inteira.
  { id: "julia.barrafunda@volkswagen",  nome: "Júlia Moraes", area: "Vendas",    papeis: ["vende"], concessionaria: "VW Barra Funda (SP)" },
  { id: "bruno.barrarj@volkswagen",     nome: "Bruno Lisboa", area: "Vendas",    papeis: ["vende"], concessionaria: "VW Barra (RJ)" },
];

export const COOKIE_USUARIO = "volkswagen_usuario";
export const USUARIO_PADRAO = USUARIOS[0];

export function usuarioPorId(id: string | undefined): Usuario {
  return USUARIOS.find((u) => u.id === id) ?? USUARIO_PADRAO;
}

export function podeRevisar(u: Usuario): boolean {
  return u.papeis.includes("revisa");
}

export function podePropor(u: Usuario): boolean {
  return u.papeis.includes("propoe");
}

/** Rótulo curto do papel, para o seletor e as telas não repetirem a mesma conta. */
export function papelLegivel(u: Usuario): string {
  if (u.concessionaria) return u.concessionaria;
  if (podeRevisar(u)) return "revisa versões";
  return "propõe apenas";
}

/** Leitura do cookie no navegador — usada pelo seletor no header. */
export function usuarioDoDocumento(): Usuario {
  if (typeof document === "undefined") return USUARIO_PADRAO;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_USUARIO}=([^;]*)`));
  return usuarioPorId(match ? decodeURIComponent(match[1]) : undefined);
}
