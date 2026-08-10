import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, Stat } from "@/components/ui";
import { dataPorExtenso } from "@/lib/painel";
import { diffRuleSets } from "@/lib/engine";
import { podeAprovar, usuarioPorId } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";
import { listarCampanhas } from "@/lib/store";
import { PainelAprovacao } from "./painel-aprovacao";

export const dynamic = "force-dynamic";

export default function Aprovacoes() {
  const eu = usuarioAtual();
  const campanhas = listarCampanhas();

  const pendentes = campanhas.flatMap((c) =>
    c.ruleSets
      .filter((rs) => rs.status === "em_aprovacao")
      .map((rs) => {
        // Comparar com a versão EM PRODUÇÃO, não com a de número anterior:
        // uma versão rejeitada nunca valeu e não é referência para o aprovador.
        const anterior = c.ruleSets.find((r) => r.id === c.ruleSetAtivoId);
        return {
          campanhaId: c.id,
          campanhaNome: c.nome,
          ruleSetId: rs.id,
          versao: rs.versao,
          descricao: rs.descricao,
          propostoPor: usuarioPorId(rs.propostoPor).nome,
          propostoPorId: rs.propostoPor,
          propostaEm: rs.propostaEm,
          regras: rs.regras.length,
          mudancas: diffRuleSets(rs, anterior),
          versaoAnterior: anterior?.versao,
          anteriorEmProducao: true,
        };
      }),
  );

  const decididas = campanhas
    .flatMap((c) =>
      c.ruleSets
        .filter((rs) => rs.aprovadoEm || rs.rejeitadoEm)
        .map((rs) => ({
          campanhaNome: c.nome,
          versao: rs.versao,
          aprovado: Boolean(rs.aprovadoEm),
          quem: usuarioPorId(rs.aprovadoPor ?? rs.rejeitadoPor).nome,
          quando: rs.aprovadoEm ?? rs.rejeitadoEm ?? "",
          propositor: usuarioPorId(rs.propostoPor).nome,
          motivoRejeicao: rs.motivoRejeicao,
        })),
    )
    .sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <ShellGestor
      title="Aprovações"
      data={dataPorExtenso()}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        <Stat label="Aguardando aprovação" value={pendentes.length} tone={pendentes.length ? "warn" : "neutral"} />
        <Stat label="Já decididas" value={decididas.length} tone="vw" />
        <Stat
          label="Seu papel"
          value={podeAprovar(eu) ? "Aprovador" : "Propositor"}
          hint={`${eu.nome} · ${eu.area}`}
        />
      </div>

      {!podeAprovar(eu) && pendentes.length > 0 && (
        <div className="border border-signal-warn/45 bg-signal-warn/10 rounded-md p-6 mb-8">
          <div className="text-sm font-semibold text-signal-warn mb-2">
            Você não aprova regras
          </div>
          <p className="text-base text-ink-800">
            {eu.nome} pode propor mudanças, mas quem libera para produção é alguém de Compliance ou
            Diretoria. Troque de pessoa no canto superior direito para ver o outro lado.
          </p>
        </div>
      )}

      <h2 className="text-xl font-semibold tracking-tight mb-4">Na fila</h2>
      {pendentes.length === 0 ? (
        <Card>
          <div className="text-base text-ink-600">
            Nenhuma proposta aguardando. Edite as regras de uma campanha para criar uma.
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendentes.map((p) => (
            <PainelAprovacao
              key={p.ruleSetId}
              proposta={p}
              podeAprovar={podeAprovar(eu)}
              souOPropositor={p.propostoPorId === eu.id}
              meuNome={eu.nome}
            />
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold tracking-tight mt-12 mb-4">Trilha de decisões</h2>
      {decididas.length === 0 ? (
        <Card><div className="text-base text-ink-600">Nada decidido ainda.</div></Card>
      ) : (
        <div className="space-y-2">
          {decididas.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-4 border hairline rounded-sm px-5 py-4">
              <Badge tone={d.aprovado ? "go" : "stop"}>{d.aprovado ? "aprovada" : "rejeitada"}</Badge>
              <span className="text-base font-semibold">v{d.versao}</span>
              <span className="text-sm text-ink-600">{d.campanhaNome}</span>
              <span className="text-sm text-ink-700 ml-auto">
                {d.propositor} propôs · <strong>{d.quem}</strong> {d.aprovado ? "aprovou" : "rejeitou"}
              </span>
              <span className="mono text-xs text-ink-600">{d.quando.slice(0, 10)}</span>
              {d.motivoRejeicao && (
                <div className="w-full text-sm text-ink-700 border-l-4 border-signal-stop pl-4 mt-1">
                  {d.motivoRejeicao}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ShellGestor>
  );
}
