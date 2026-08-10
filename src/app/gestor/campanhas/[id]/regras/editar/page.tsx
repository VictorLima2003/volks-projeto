import { ShellGestor } from "@/components/ShellGestor";
import { catalogoDeFatos, ruleSetAtivo } from "@/lib/engine";
import { obterCampanha } from "@/lib/store";
import { notFound } from "next/navigation";
import { EditorRegras } from "./editor-client";

export const dynamic = "force-dynamic";

export default function EditarRegras({ params }: { params: { id: string } }) {
  const c = obterCampanha(params.id);
  if (!c) return notFound();
  const rs = ruleSetAtivo(c);

  return (
    <ShellGestor
      secao="campanhas"
      title="Editar regras"
    >
      <p className="text-base text-ink-600 max-w-3xl mb-8">
        Edite os critérios e publique como uma <strong>nova versão</strong>. A versão atual
        (v{rs.versao}) fica no histórico e continua explicando as decisões já tomadas —
        nada é sobrescrito.
      </p>

      <EditorRegras
        campanhaId={c.id}
        versaoAtual={rs.versao}
        regrasIniciais={JSON.parse(JSON.stringify(rs.regras))}
        grupos={catalogoDeFatos(c.blocos, (c.hooks ?? []).filter((h) => h.ativo))}
      />
    </ShellGestor>
  );
}
