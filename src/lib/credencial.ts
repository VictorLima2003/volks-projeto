import { NextResponse } from "next/server";
import { obterPesquisa } from "./store";
import { Pesquisa } from "./types";

/**
 * Autenticação das rotas públicas, num lugar só.
 *
 * Duas rotas já consomem a mesma credencial, e a regra do "mesma resposta para
 * pesquisa inexistente e token errado" é do tipo que se perde na cópia: bastaria
 * uma delas responder 404 para a pesquisa que não existe, e quem tenta
 * descobriria quais ids são reais comparando as duas respostas.
 *
 * Limitações registradas, iguais às do README: o token é comparado em texto
 * (protótipo, sem hash), não há limite de requisições e não há escopo — a
 * credencial lê tudo daquela pesquisa. Antes de isto sair de demonstração, entra
 * hash, expiração e limite por minuto.
 */
export function autenticarPorToken(
  req: Request,
  pesquisaId: string,
): { pesquisa: Pesquisa } | { recusa: NextResponse } {
  const cabecalho = req.headers.get("authorization") ?? "";
  const token = cabecalho.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      recusa: NextResponse.json(
        { erro: "sem_credencial", detalhe: "Mande o token em Authorization: Bearer <token>." },
        { status: 401 },
      ),
    };
  }

  const pesquisa = obterPesquisa(pesquisaId);
  const credencial = pesquisa?.tokens?.find((t) => t.valor === token);

  /*
   * Uma resposta só para os dois casos.
   *
   * Distinguir "pesquisa não existe" de "token errado" contaria a quem tenta
   * que aquele id é real — é a forma mais barata de mapear o sistema de fora.
   */
  if (!pesquisa || !credencial) {
    return { recusa: NextResponse.json({ erro: "credencial_invalida" }, { status: 401 }) };
  }

  credencial.ultimoUsoEm = new Date().toISOString();
  return { pesquisa };
}
