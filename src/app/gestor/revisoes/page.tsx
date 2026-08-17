import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, Stat } from "@/components/ui";
import { diffRuleSets } from "@/lib/engine";
import { podeRevisar, nomeDeUsuario } from "@/lib/identidade";
import { exigirUsuarioNaTela } from "@/lib/identidade-server";
import { listarPesquisas } from "@/lib/store";
import { PainelRevisao } from "./painel-revisao";

export const dynamic = "force-dynamic";

export default function Revisoes() {
  const eu = exigirUsuarioNaTela("gestor");
  const pesquisas = listarPesquisas();

  // Cada pesquisa guarda as próprias versões de regra; a fila junta as
  // propostas de todas elas, que é o que quem revisa precisa ver de uma vez.
  const pendentes = pesquisas.flatMap((g) =>
    g.versoes
      .filter((rs) => rs.status === "em_revisao")
      .map((rs) => {
        // Comparar com a versão EM PRODUÇÃO, não com a de número anterior:
        // uma versão recusada nunca valeu e não é referência para quem revisa.
        const anterior = g.versoes.find((r) => r.id === g.versaoAtivaId);
        return {
          pesquisaId: g.id,
          pesquisaNome: g.nome,
          ruleSetId: rs.id,
          versao: rs.versao,
          descricao: rs.descricao,
          propostoPor: nomeDeUsuario(rs.propostoPor).nome,
          propostoPorId: rs.propostoPor,
          propostaEm: rs.propostaEm,
          regras: rs.regras.length,
          mudancas: diffRuleSets(rs, anterior),
          versaoAnterior: anterior?.versao,
          anteriorEmProducao: true,
        };
      }),
  );

  const decididas = pesquisas
    .flatMap((g) =>
      g.versoes
        .filter((rs) => rs.publicadoEm || rs.recusadoEm)
        .map((rs) => ({
          pesquisaNome: g.nome,
          versao: rs.versao,
          publicada: Boolean(rs.publicadoEm),
          quem: nomeDeUsuario(rs.publicadoPor ?? rs.recusadoPor ?? "").nome,
          quando: rs.publicadoEm ?? rs.recusadoEm ?? "",
          propositor: nomeDeUsuario(rs.propostoPor).nome,
          motivoRecusa: rs.motivoRecusa,
        })),
    )
    .sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <ShellGestor
      title="Revisões"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        <Stat label="Aguardando revisão" value={pendentes.length} tone={pendentes.length ? "warn" : "neutral"} />
        <Stat label="Já decididas" value={decididas.length} tone="vw" />
        <Stat
          label="Seu papel"
          value={podeRevisar(eu) ? "Revisa" : "Propõe"}
          hint={`${eu.nome} · ${eu.area}`}
        />
      </div>

      {!podeRevisar(eu) && pendentes.length > 0 && (
        <div className="border border-signal-warn/45 bg-signal-warn/10 rounded-md p-6 mb-8">
          <div className="text-sm font-semibold text-signal-warn mb-2">
            Você não revisa versões
          </div>
          <p className="text-base text-ink-800">
            {eu.nome} pode propor mudanças, mas quem publica para produção é alguém de Compliance ou
            Diretoria. Troque de pessoa no canto superior direito para ver o outro lado.
          </p>
        </div>
      )}

      <h2 className="text-xl font-semibold tracking-tight mb-4">Na fila</h2>
      {pendentes.length === 0 ? (
        <Card>
          <div className="text-base text-ink-600">
            Nenhuma proposta aguardando. Edite as regras de uma pesquisa para criar uma.
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendentes.map((p) => (
            <PainelRevisao
              key={p.ruleSetId}
              proposta={p}
              podeRevisar={podeRevisar(eu)}
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
              <Badge tone={d.publicada ? "go" : "stop"}>{d.publicada ? "publicada" : "recusada"}</Badge>
              <span className="text-base font-semibold">v{d.versao}</span>
              <span className="text-sm text-ink-600">{d.pesquisaNome}</span>
              <span className="text-sm text-ink-700 ml-auto">
                {d.propositor} propôs · <strong>{d.quem}</strong> {d.publicada ? "publicou" : "recusou"}
              </span>
              <span className="mono text-xs text-ink-600">{d.quando.slice(0, 10)}</span>
              {d.motivoRecusa && (
                <div className="w-full text-sm text-ink-700 border-l-4 border-signal-stop pl-4 mt-1">
                  {d.motivoRecusa}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ShellGestor>
  );
}
