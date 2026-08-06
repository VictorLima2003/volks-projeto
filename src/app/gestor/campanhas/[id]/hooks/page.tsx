import { ShellGestor } from "@/components/ShellGestor";
import { podePropor } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";
import { obterCampanha } from "@/lib/store";
import { notFound } from "next/navigation";
import { GerenciadorHooks } from "./gerenciador";

export const dynamic = "force-dynamic";

export default function PaginaHooks({ params }: { params: { id: string } }) {
  const c = obterCampanha(params.id);
  if (!c) return notFound();
  const eu = usuarioAtual();

  return (
    <ShellGestor
      secao="campanhas"
      crumbs={[
        { label: "Gestor", href: "/gestor" },
        { label: c.nome, href: `/gestor/campanhas/${c.id}` },
        { label: "Hooks" },
      ]}
      title="Hooks de código"
      largura="ampla"
    >
      <GerenciadorHooks
        campanhaId={c.id}
        hooksIniciais={JSON.parse(JSON.stringify(c.hooks ?? []))}
        podeEditar={podePropor(eu)}
        nomeUsuario={eu.nome}
      />
    </ShellGestor>
  );
}
