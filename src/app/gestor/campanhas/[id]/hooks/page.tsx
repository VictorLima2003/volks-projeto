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
      title="Hooks de código"
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
