import { ShellFluxo } from "@/components/ShellFluxo";
import { Badge, Card, LinkButton } from "@/components/ui";
import { listarCampanhas, listarSessoes, pedidosPorCpf } from "@/lib/store";
import Link from "next/link";
import { CriarPedidoForm } from "./criar-pedido-form";

export const dynamic = "force-dynamic";

export default function Consulta({ searchParams }: { searchParams: { cpf?: string } }) {
  const cpf = searchParams.cpf ?? "";

  const sessoes = listarSessoes()
    .filter((s) => s.cpf.replace(/\D/g, "") === cpf.replace(/\D/g, ""))
    .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm));
  const ultima = sessoes[0];
  // Fatos por origem (prefixo do hook), só os que realmente acharam algo.
  const fatosColetados = Object.entries(ultima?.externos ?? {}).filter(
    ([, campos]) => campos?.encontrado === true,
  );
  const nomeDoRespondente = fatosColetados
    .map(([, campos]) => campos.nome)
    .find((n) => typeof n === "string" && n.trim());
  const pedidos = pedidosPorCpf(cpf);
  const campanhas = listarCampanhas();

  const liberado = ultima?.resultado?.tipo === "elegivel";
  const bloqueado = ultima?.resultado?.tipo === "nao_elegivel";
  const analise = ultima?.resultado?.tipo === "pendente_validacao" || ultima?.resultado?.tipo === "revalidar";

  return (
    <ShellFluxo
      area={{ label: "Vendedor", href: "/vendedor" }}
      crumbs={[{ label: "Vendedor", href: "/vendedor" }, { label: cpf }]}
      title={String(nomeDoRespondente ?? cpf)}
    >
      {/* Semáforo operacional — a cor está na faixa, não no título */}
      <div className="border hairline rounded-md overflow-hidden mb-10 shadow-card">
        <div
          className={
            "h-2 " +
            (liberado ? "bg-signal-go"
              : bloqueado ? "bg-signal-stop"
              : analise ? "bg-signal-warn"
              : "bg-ink-400")
          }
        />
        <div className="p-7 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-ink-600 mb-2.5">Situação do pedido</div>
            <div className="display text-3xl">
              {liberado ? "Pedido liberado"
                : bloqueado ? "Pedido bloqueado"
                : analise ? "Aguardando análise"
                : "Sem jornada concluída"}
            </div>
            {ultima?.resultado && (
              <p className="text-base text-ink-700 mt-3.5 max-w-xl">{ultima.resultado.motivo}</p>
            )}
            {!ultima && (
              <p className="text-base text-ink-700 mt-3.5 max-w-xl">
                Este CPF ainda não completou a pesquisa de elegibilidade.
                Envie o link da campanha para o motorista antes de montar o pedido.
              </p>
            )}
          </div>
          {ultima?.resultado?.proximaAcao && (
            <div className="max-w-xs border-l-4 border-vw-deep pl-4">
              <div className="text-xs font-bold uppercase tracking-widest text-ink-600 mb-1.5">Próxima ação</div>
              <div className="text-base">{ultima.resultado.proximaAcao}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {liberado && (
            <Card>
              <h3 className="text-lg font-semibold tracking-tight mb-4">Montar pedido</h3>
              <CriarPedidoForm
                cpf={cpf}
                campanhas={campanhas.map((c) => ({ id: c.id, nome: c.nome, modelos: c.modelos, concessionaria: c.concessionaria }))}
              />
            </Card>
          )}

          {!liberado && !ultima && (
            <Card>
              <h3 className="text-lg font-semibold tracking-tight mb-3">Enviar pesquisa ao motorista</h3>
              <div className="space-y-2">
                {campanhas.map((c) => (
                  <Link
                    key={c.id}
                    href={`/motorista/jornada?campanha=${c.id}&cpf=${encodeURIComponent(cpf)}`}
                    className="flex items-center justify-between border hairline-strong bg-ink-100 hover:bg-ink-200 px-4 py-3 transition"
                  >
                    <span>{c.nome}</span>
                    <span className="text-xs text-ink-600">{c.modelos.join(" · ")} →</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {bloqueado && (
            <Card>
              <h3 className="text-lg font-semibold tracking-tight mb-3">O que fazer agora</h3>
              <ul className="text-sm text-ink-700 space-y-2">
                <li>• Não é possível registrar pedido nesta campanha.</li>
                <li>• Explique o critério ao motorista com os números reais abaixo.</li>
                <li>• Se houver erro nos dados, encaminhe à Central para revalidação.</li>
              </ul>
              <LinkButton href="/gestor/central" variant="secondary" className="mt-5">Abrir Central</LinkButton>
            </Card>
          )}

          <Card>
            <h3 className="text-lg font-semibold tracking-tight mb-4">Histórico de pedidos</h3>
            {pedidos.length === 0 ? (
              <div className="text-sm text-ink-600">Nenhum pedido registrado para este CPF.</div>
            ) : (
              <div className="space-y-2">
                {pedidos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border hairline px-4 py-3">
                    <div>
                      <div className="text-sm">{p.modelo} · {p.concessionaria}</div>
                      <div className="text-xs text-ink-600 mono">{p.id} · {p.criadoEm.slice(0, 10)}</div>
                    </div>
                    <Badge tone={p.status === "bloqueado" ? "stop" : "go"}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* O vendedor vê os fatos que a pesquisa coletou — sejam de que
              hook forem. A tela não conhece nenhuma base por nome. */}
          <Card>
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-600">
              Dados coletados
            </h3>
            {fatosColetados.length > 0 ? (
              <div className="mt-4 space-y-4">
                {fatosColetados.map(([origem, campos]) => (
                  <div key={origem}>
                    <div className="text-xs uppercase tracking-wide text-ink-600 mb-1.5">
                      {origem}
                    </div>
                    <dl className="text-sm space-y-1.5">
                      {Object.entries(campos)
                        .filter(([k]) => k !== "encontrado" && k !== "erro")
                        .map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-3">
                            <dt className="text-ink-600 mono text-xs">{k}</dt>
                            <dd className="text-right">{String(v)}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-700 mt-3">
                Nenhuma consulta externa retornou dados para este CPF. Encaminhe à Central para
                análise manual.
              </p>
            )}
          </Card>

          {ultima?.resultado && (
            <Card>
              <h3 className="text-xs font-bold uppercase tracking-widest text-ink-600">Auditoria</h3>
              <dl className="mt-4 text-xs space-y-2 mono text-ink-700">
                <div>RuleSet v{ultima.resultado.ruleSetVersao}</div>
                <div>Regra: {ultima.resultado.regraAplicadaId}</div>
                <div>{ultima.resultado.decididoEm.slice(0, 19).replace("T", " ")}</div>
                <div>Sessão: {ultima.id}</div>
              </dl>
            </Card>
          )}
        </div>
      </div>
    </ShellFluxo>
  );
}
