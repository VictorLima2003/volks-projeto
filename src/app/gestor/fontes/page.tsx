import { AjudaDaTela, ItemAjuda } from "@/components/AjudaDaTela";
import { ShellGestor } from "@/components/ShellGestor";
import { GerenciadorHooks } from "./gerenciador";
import { podePropor } from "@/lib/identidade";
import { exigirUsuarioNaTela } from "@/lib/identidade-server";
import { listarHooks } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * As fontes são da plataforma, não de uma pesquisa.
 *
 * Esta tela existia dentro de cada campanha, e cada uma delas
 * guardava a própria cópia dos hooks. O efeito estava verificado: mudar o
 * endereço de uma API num lugar não chegava no outro, e o que ficou para
 * trás seguia consultando o lugar errado sem avisar ninguém. Uma fonte é um
 * endereço no mundo — não faz sentido existir em duas versões.
 */
export default function PaginaFontes() {
  const eu = exigirUsuarioNaTela("gestor");

  return (
    <ShellGestor
      title="Fontes de dado"
      ajuda={
        <AjudaDaTela titulo="Fontes de dado">
          <p>
            Cada fonte é um trecho de código que busca dados fora daqui — uma API, uma planilha
            anexada, ou os dois combinados. O que ela devolve vira fato para as pesquisas e as
            regras.
          </p>
          <ItemAjuda termo="Prefixo">
            O nome que os fatos ganham na regra. A fonte de prefixo <em>credito</em> devolve{" "}
            <em>credito.score</em>, <em>credito.limite</em>.
          </ItemAjuda>
          <ItemAjuda termo="Rótulos">
            Como cada fato é escrito na tela do respondente e do vendedor. Sem isso, o nome do
            código aparece cru.
          </ItemAjuda>
          <ItemAjuda termo="Compartilhada">
            A fonte é uma só para todas as pesquisas. Editar aqui muda em todos os lugares que a
            usam — inclusive pesquisas no ar.
          </ItemAjuda>
        </AjudaDaTela>
      }
    >
      <GerenciadorHooks
        hooksIniciais={JSON.parse(JSON.stringify(listarHooks()))}
        podeEditar={podePropor(eu)}
        nomeUsuario={eu.nome}
      />
    </ShellGestor>
  );
}
