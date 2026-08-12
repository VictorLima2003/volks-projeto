import { ShellGestor } from "@/components/ShellGestor";
import { catalogoDeFatos, versaoQueDecide } from "@/lib/engine";
import { listarHooks, obterPesquisa } from "@/lib/store";
import { desfechosDa } from "@/lib/types";
import { notFound } from "next/navigation";
import { EditorRegras } from "./editor-client";

export const dynamic = "force-dynamic";

export default function EditarRegras({ params }: { params: { id: string } }) {
  const pesquisa = obterPesquisa(params.id);
  if (!pesquisa) return notFound();
  const rs = versaoQueDecide(pesquisa.versoes, pesquisa.versaoAtivaId);

  return (
    <ShellGestor title={`Regras · ${pesquisa.nome}`}>
      <p className="text-base text-ink-600 max-w-3xl mb-8">
        {rs ? (
          <>
            Edite os critérios e publique como uma <strong>nova versão</strong>. A versão atual
            (v{rs.versao}) fica no histórico e continua explicando as decisões já tomadas — nada é
            sobrescrito.
          </>
        ) : (
          <>
            Esta pesquisa ainda não decide nada. Escreva os critérios e proponha a{" "}
            <strong>primeira versão</strong> — ela só passa a valer depois de publicada por outra
            pessoa.
          </>
        )}
      </p>

      <EditorRegras
        pesquisaId={pesquisa.id}
        versaoAtual={rs?.versao ?? 0}
        regrasIniciais={JSON.parse(JSON.stringify(rs?.regras ?? []))}
        desfechos={desfechosDa(pesquisa)}
        /*
         * Os fatos são os desta pesquisa: as respostas que ela coleta, mais o
         * retorno das fontes. Enquanto as regras viviam numa coleção do sistema,
         * o catálogo tinha que juntar os campos de todas as pesquisas — e
         * oferecia condição sobre pergunta que esta aqui nunca faz.
         */
        grupos={catalogoDeFatos(
          /* O catálogo sai do rascunho, quando há um: quem acabou de criar uma
             pergunta vem escrever a regra dela em seguida, e as duas coisas
             sobem juntas. Se o rascunho for descartado, a regra fica apontando
             para um fato que não existe — e o editor já marca isso como
             "(não encontrado)". */
          pesquisa.blocosRascunho ?? pesquisa.blocos,
          listarHooks().filter((h) => h.ativo),
        )}
      />
    </ShellGestor>
  );
}
