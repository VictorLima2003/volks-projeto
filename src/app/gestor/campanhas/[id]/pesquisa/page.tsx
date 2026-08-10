import { ShellGestor } from "@/components/ShellGestor";
import { podePropor } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";
import { obterCampanha } from "@/lib/store";
import { notFound } from "next/navigation";
import { ConstrutorPesquisa } from "./construtor";

export const dynamic = "force-dynamic";

export default function PaginaPesquisa({ params }: { params: { id: string } }) {
  const c = obterCampanha(params.id);
  if (!c) return notFound();
  const eu = usuarioAtual();

  return (
    <ShellGestor
      secao="campanhas"
      title="Construtor de pesquisa"
    >
      <ConstrutorPesquisa
        campanhaId={c.id}
        blocosIniciais={JSON.parse(JSON.stringify(c.blocos))}
        hooks={JSON.parse(JSON.stringify(c.hooks ?? []))}
        podeEditar={podePropor(eu)}
        nomeUsuario={eu.nome}
      />
    </ShellGestor>
  );
}
