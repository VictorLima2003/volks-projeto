import { podePropor } from "@/lib/identidade";
import { exigirUsuarioNaTela } from "@/lib/identidade-server";
import { listarHooks, obterPesquisa } from "@/lib/store";
import { APRESENTACAO_PADRAO, CONSENTIMENTO_PADRAO, desfechosDa } from "@/lib/types";
import { notFound } from "next/navigation";
import { ConstrutorPesquisa } from "./construtor";

export const dynamic = "force-dynamic";

export default function PaginaPesquisa({ params }: { params: { id: string } }) {
  const pesquisa = obterPesquisa(params.id);
  if (!pesquisa) return notFound();
  const eu = exigirUsuarioNaTela("gestor");

  /*
   * Sem o cromo do gestor: aqui a janela inteira é prancheta.
   *
   * O cabeçalho do sistema saiu junto com o título de página — os dois ocupavam
   * a faixa de cima repetindo o que o cartão do canto esquerdo já diz, e numa
   * ferramenta de desenho a faixa de cima é área de trabalho.
   */
  return (
    <ConstrutorPesquisa
      pesquisaId={pesquisa.id}
      configuracao={{
        nome: pesquisa.nome,
        descricao: pesquisa.descricao ?? "",
        status: pesquisa.status,
        chamada: pesquisa.chamada ?? "",
      }}
      apresentacaoInicial={{ ...APRESENTACAO_PADRAO, ...pesquisa.apresentacao }}
      consentimentoInicial={{ ...CONSENTIMENTO_PADRAO, ...pesquisa.consentimento }}
      versoes={JSON.parse(JSON.stringify(pesquisa.versoes))}
      desfechosIniciais={desfechosDa(pesquisa)}
      versaoAtivaId={pesquisa.versaoAtivaId}
      /* O construtor abre no rascunho, quando há um. É o que se está montando —
         o que está no ar continua guardado para o "descartar" voltar a ele. */
      blocosIniciais={JSON.parse(JSON.stringify(pesquisa.blocosRascunho ?? pesquisa.blocos))}
      blocosPublicados={JSON.parse(JSON.stringify(pesquisa.blocos))}
      temRascunhoInicial={pesquisa.blocosRascunho !== undefined}
      hooks={JSON.parse(JSON.stringify(listarHooks()))}
      podeEditar={podePropor(eu)}
      nomeUsuario={eu.nome}
    />
  );
}
