import { redirect } from "next/navigation";

/**
 * A porta do gestor é a lista de pesquisas.
 *
 * Redireciona em vez de duplicar a tela: enquanto a home listava ofertas e
 * "Pesquisas" listava questionários, eram duas listas do mesmo assunto — e a
 * pessoa tinha que descobrir em qual das duas estava o que procurava.
 */
export default function GestorHome() {
  redirect("/gestor/pesquisas");
}
