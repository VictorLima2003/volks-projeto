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

/**
 * Quem é o dono deste cookie — ou ninguém.
 *
 * Devolvia o primeiro usuário da lista quando não achava, e isso era um buraco:
 * quem chegasse sem cookie virava a Ana, de Produto, e passava por toda trava de
 * papel do sistema. A prévia de uma pesquisa fora do ar, por exemplo, abria para
 * qualquer um que soubesse pôr `previa=1` na URL.
 *
 * Sem ninguém é `undefined`, e quem chama decide o que fazer: tela manda para o
 * login, API responde 401.
 */
export function usuarioPorId(id: string | undefined): Usuario | undefined {
  return USUARIOS.find((u) => u.id === id);
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
export function usuarioDoDocumento(): Usuario | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_USUARIO}=([^;]*)`));
  return usuarioPorId(match ? decodeURIComponent(match[1]) : undefined);
}

/**
 * Como escrever um id de usuário na tela, inclusive o de quem saiu.
 *
 * A trilha de auditoria guarda ids, e id de gente que deixou a empresa continua
 * lá — é o ponto de guardar. A tela precisa mostrar alguma coisa em vez de
 * quebrar, e mostrar o próprio id é mais honesto que inventar um nome.
 */
export function nomeDeUsuario(id: string): { nome: string; onde: string } {
  const u = usuarioPorId(id);
  return u
    ? { nome: u.nome, onde: u.concessionaria ?? u.area }
    : { nome: id, onde: "fora do quadro" };
}

/** A área de trabalho de quem entra: é para onde o login manda. */
export function areaDe(u: Usuario): "gestor" | "vendedor" {
  return u.papeis.includes("vende") && !podePropor(u) && !podeRevisar(u)
    ? "vendedor"
    : "gestor";
}
