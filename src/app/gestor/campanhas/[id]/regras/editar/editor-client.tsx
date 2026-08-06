"use client";

import { Badge, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { GrupoDeFatos, resultadoLabel } from "@/lib/engine";
import { EditorCondicao } from "@/components/EditorCondicao";
import { Condicao, Operador, Regra, ResultadoTipo } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

const RESULTADOS: ResultadoTipo[] = [
  "elegivel",
  "nao_elegivel",
  "pendente_validacao",
  "revalidar",
  "erro",
];

function tomDoResultado(r: ResultadoTipo): "go" | "stop" | "warn" | "neutral" {
  if (r === "elegivel") return "go";
  if (r === "nao_elegivel") return "stop";
  if (r === "erro") return "neutral";
  return "warn";
}

/** Uma regra ou tem um termo único, ou um grupo E/OU. O editor trata os dois. */
function termosDe(c: Condicao): Condicao[] {
  if (c.todas?.length) return c.todas;
  if (c.qualquer?.length) return c.qualquer;
  return [c];
}
function grupoDe(c: Condicao): "unico" | "todas" | "qualquer" {
  if (c.todas?.length) return "todas";
  if (c.qualquer?.length) return "qualquer";
  return "unico";
}
function montarCondicao(grupo: string, termos: Condicao[]): Condicao {
  if (grupo === "unico") return termos[0];
  if (grupo === "todas") return { fato: "", operador: "truthy", todas: termos };
  return { fato: "", operador: "truthy", qualquer: termos };
}

/**
 * A mensagem ao motorista é texto livre e não acompanha o limiar automaticamente.
 * Se o número citado no texto não existe mais na condição, avisa — senão o motorista
 * recebe uma explicação que não corresponde à regra aplicada.
 */
function limiaresInconsistentes(r: Regra): number[] {
  const numerosNaCondicao = new Set<number>();
  for (const t of termosDe(r.condicao)) {
    if (typeof t.valor === "number") numerosNaCondicao.add(t.valor);
  }
  if (numerosNaCondicao.size === 0) return [];

  const texto = `${r.motivo} ${r.proximaAcao ?? ""}`;
  const citados = (texto.match(/\d+/g) ?? [])
    .map(Number)
    // Ignora números pequenos que costumam ser ordinais ou datas soltas
    .filter((n) => n >= 2);

  return Array.from(new Set(citados.filter((n) => !numerosNaCondicao.has(n))));
}

export function EditorRegras({
  campanhaId,
  versaoAtual,
  regrasIniciais,
  grupos,
}: {
  campanhaId: string;
  versaoAtual: number;
  regrasIniciais: Regra[];
  grupos: GrupoDeFatos[];
}) {
  const router = useRouter();
  const [regras, setRegras] = useState<Regra[]>(
    [...regrasIniciais].sort((a, b) => a.prioridade - b.prioridade),
  );
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function patch(id: string, campo: keyof Regra, valor: unknown) {
    setRegras((rs) => rs.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  }

  function trocarTermo(regraId: string, idx: number, nova: Condicao) {
    setRegras((rs) =>
      rs.map((r) => {
        if (r.id !== regraId) return r;
        const grupo = grupoDe(r.condicao);
        const termos = termosDe(r.condicao).map((t, i) => (i === idx ? nova : t));
        return { ...r, condicao: montarCondicao(grupo, termos) };
      }),
    );
  }

  function mover(id: string, delta: number) {
    setRegras((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const copia = [...rs];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      // Reatribui prioridades em passos de 10, preservando a nova ordem
      return copia.map((r, k) => ({ ...r, prioridade: (k + 1) * 10 }));
    });
  }

  function remover(id: string) {
    setRegras((rs) => rs.filter((r) => r.id !== id));
  }

  function adicionar() {
    const prox = regras.length ? Math.max(...regras.map((r) => r.prioridade)) + 10 : 10;
    setRegras((rs) => [
      ...rs,
      {
        id: `r_nova_${Date.now().toString(36)}`,
        nome: "Nova regra",
        condicao: { fato: "uber.mesesUber", operador: ">=", valor: 6 },
        resultado: "nao_elegivel",
        motivo: "Descreva o motivo mostrado ao motorista.",
        proximaAcao: "",
        prioridade: prox,
      },
    ]);
  }

  async function publicar() {
    setSalvando(true);
    setErro(null);
    const res = await fetch("/api/rulesets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campanhaId, regras, descricao }),
    });
    const json = await res.json();
    setSalvando(false);
    if (!res.ok) {
      setErro(json.detalhe ?? json.erro ?? "Falha ao publicar.");
      return;
    }
    router.push("/gestor/aprovacoes");
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-4 gap-6 items-start">
      <div className="lg:col-span-3 space-y-4">
        {regras.map((r, idx) => {
          const grupo = grupoDe(r.condicao);
          const termos = termosDe(r.condicao);
          return (
            <Card key={r.id} className="p-0 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-ink-100 border-b hairline">
                <span className="mono text-xs text-ink-600">P{String(r.prioridade).padStart(3, "0")}</span>
                <Badge tone={tomDoResultado(r.resultado)}>{resultadoLabel(r.resultado)}</Badge>
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => mover(r.id, -1)}
                    disabled={idx === 0}
                    className="w-9 h-9 rounded-full hover:bg-ink-200 disabled:opacity-30 transition"
                    aria-label="Subir prioridade"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(r.id, 1)}
                    disabled={idx === regras.length - 1}
                    className="w-9 h-9 rounded-full hover:bg-ink-200 disabled:opacity-30 transition"
                    aria-label="Descer prioridade"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remover(r.id)}
                    className="w-9 h-9 rounded-full hover:bg-signal-stop/10 text-signal-stop transition"
                    aria-label="Remover regra"
                  >
                    ✕
                  </button>
                </span>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da regra</Label>
                    <Input value={r.nome} onChange={(e) => patch(r.id, "nome", e.target.value)} />
                  </div>
                  <div>
                    <Label>Resultado gerado</Label>
                    <Select
                      value={r.resultado}
                      onChange={(e) => patch(r.id, "resultado", e.target.value as ResultadoTipo)}
                    >
                      {RESULTADOS.map((res) => (
                        <option key={res} value={res}>{resultadoLabel(res)}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>
                    Condição{" "}
                    {grupo === "todas"
                      ? "(todos os termos)"
                      : grupo === "qualquer"
                      ? "(qualquer termo)"
                      : ""}
                  </Label>
                  <div className="space-y-4">
                    {termos.map((t, i) => (
                      <EditorCondicao
                        key={i}
                        condicao={t}
                        grupos={grupos}
                        onChange={(nova) => trocarTermo(r.id, i, nova)}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Motivo (motorista e vendedor veem)</Label>
                    <Textarea
                      rows={2}
                      value={r.motivo}
                      onChange={(e) => patch(r.id, "motivo", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Próxima ação (operação)</Label>
                    <Textarea
                      rows={2}
                      value={r.proximaAcao ?? ""}
                      onChange={(e) => patch(r.id, "proximaAcao", e.target.value)}
                    />
                  </div>
                </div>

                {(() => {
                  const orfaos = limiaresInconsistentes(r);
                  if (orfaos.length === 0) return null;
                  return (
                    <div className="border border-signal-warn/45 bg-signal-warn/10 rounded-sm p-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-signal-warn mb-1.5">
                        Texto fora de sincronia
                      </div>
                      <p className="text-sm text-ink-800">
                        As mensagens citam <strong>{orfaos.join(", ")}</strong>, mas esse número não
                        aparece mais na condição. O motorista veria uma explicação que não bate com a
                        regra aplicada.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </Card>
          );
        })}

        <Button variant="secondary" onClick={adicionar} className="w-full">
          + Adicionar regra
        </Button>
      </div>

      {/* ------------- Publicação ------------- */}
      <aside className="space-y-5 lg:sticky lg:top-28">
        <Card>
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-600">Enviar para aprovação</h3>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-ink-600">v{versaoAtual}</span>
              <span className="text-ink-600">→</span>
              <span className="display text-2xl text-vw-deep">v{versaoAtual + 1}</span>
            </div>
            <p className="text-sm text-ink-700 mt-3">
              {regras.length} regra(s). A v{versaoAtual} continua valendo até alguém aprovar esta.
            </p>
          </div>

          <div className="mt-5">
            <Label htmlFor="desc">O que mudou e por quê</Label>
            <Textarea
              id="desc"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: reduzido para 400 corridas na campanha de fim de ano"
            />
            <p className="text-sm text-ink-600 mt-2">
              Quem for aprovar lê este texto junto com o diff.
            </p>
          </div>

          {erro && (
            <div className="mt-4 border border-signal-stop/45 bg-signal-stop/10 rounded-sm p-3 text-sm text-signal-stop">
              {erro}
            </div>
          )}

          <Button onClick={publicar} disabled={salvando || regras.length === 0} className="w-full mt-5">
            {salvando ? "Enviando..." : `Propor v${versaoAtual + 1}`}
          </Button>
          <p className="text-xs text-ink-600 mt-3">
            Você não poderá aprovar a própria proposta.
          </p>
        </Card>

        <Card>
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-600">Ordem importa</h3>
          <p className="text-sm text-ink-700 mt-3">
            As regras são avaliadas de cima para baixo e a <strong>primeira que casar vence</strong>.
            Coloque as exceções acima das regras gerais.
          </p>
          <p className="text-sm text-ink-600 mt-3">
            Use o simulador depois de publicar para conferir o comportamento.
          </p>
        </Card>
      </aside>
    </div>
  );
}
