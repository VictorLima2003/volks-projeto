"use client";

import { TelaDeDesfecho } from "@/components/ResultadoDecisao";
import { Badge, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { preencherTexto } from "@/lib/engine";
import { Desfecho, EfeitoDoDesfecho, RuleSet } from "@/lib/types";
import { useState } from "react";

/**
 * Os fins possíveis da pesquisa — nomeados e escritos por quem a monta.
 *
 * Eram cinco telas em código, uma por tipo fixo de resultado, todas falando de
 * concessionária e elegibilidade. Aqui elas viram conteúdo: o rótulo é como o
 * time chama aquele fim, o título e o texto são o que a pessoa lê no fim do
 * percurso.
 *
 * O que **não** é livre é o efeito. Ele é a única parte que o resto do sistema
 * consome — o vendedor libera pedido, a central pega o que ficou parado — e por
 * isso continua sendo uma lista fechada de três.
 */
const EFEITOS: { valor: EfeitoDoDesfecho; rotulo: string; explica: string }[] = [
  { valor: "libera", rotulo: "Libera", explica: "O vendedor consegue montar o pedido." },
  { valor: "segura", rotulo: "Segura", explica: "Vai para a fila da central." },
  { valor: "recusa", rotulo: "Recusa", explica: "Não avança, e não é exceção." },
];

const TONS: { valor: Desfecho["tom"]; rotulo: string }[] = [
  { valor: "go", rotulo: "Positivo (verde)" },
  { valor: "stop", rotulo: "Negativo (vermelho)" },
  { valor: "espera", rotulo: "Em espera (relógio)" },
  { valor: "neutro", rotulo: "Neutro" },
];

/** Id a partir do rótulo — legível no dado e nas regras que apontam para ele. */
function idDoRotulo(rotulo: string, usados: string[]) {
  const base =
    rotulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "desfecho";
  let id = base;
  let n = 2;
  while (usados.includes(id)) id = `${base}_${n++}`;
  return id;
}

export function PainelDesfechos({
  desfechos,
  versoes,
  podeEditar,
  onMudar,
}: {
  desfechos: Desfecho[];
  /** Todas as versões de regra — para saber qual desfecho está em uso. */
  versoes: RuleSet[];
  podeEditar: boolean;
  onMudar: (novos: Desfecho[]) => void;
}) {
  const [abertoId, setAbertoId] = useState<string | null>(desfechos[0]?.id ?? null);

  /*
   * Um desfecho citado por qualquer versão não pode ser removido.
   *
   * Inclusive versões arquivadas: elas explicam decisões já tomadas, e apagar o
   * desfecho transformaria o histórico em "Resultado indisponível". O que dá
   * para fazer com ele é renomear — o id continua o mesmo e as regras seguem
   * apontando para o lugar certo.
   */
  const emUso = new Set(versoes.flatMap((v) => v.regras.map((r) => r.resultado)));

  function trocar(id: string, patch: Partial<Desfecho>) {
    onMudar(desfechos.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function adicionar() {
    const id = idDoRotulo("Novo desfecho", desfechos.map((d) => d.id));
    onMudar([
      ...desfechos,
      {
        id,
        rotulo: "Novo desfecho",
        efeito: "segura",
        tom: "neutro",
        titulo: "{nome}chegamos ao fim.",
        texto: "",
      },
    ]);
    setAbertoId(id);
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-4">
        <Button variant="secondary" onClick={adicionar} disabled={!podeEditar}>
          + Novo desfecho
        </Button>
        <p className="text-sm text-ink-600 flex-1 min-w-64">
          Cada regra aponta para um destes fins. O <strong>efeito</strong> é o que o resto do
          sistema lê; o resto é o que quem responde vê.
        </p>
      </Card>

      {desfechos.map((d) => {
        const aberto = abertoId === d.id;
        const usado = emUso.has(d.id);
        return (
          <Card key={d.id} className="p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setAbertoId(aberto ? null : d.id)}
              className="w-full flex items-center gap-3 px-5 py-3 bg-ink-100 border-b hairline text-left"
            >
              <Badge
                tone={
                  d.tom === "go" ? "go" : d.tom === "stop" ? "stop" : d.tom === "espera" ? "warn" : "neutral"
                }
              >
                {d.rotulo || "(sem nome)"}
              </Badge>
              <span className="text-sm text-ink-600">
                {EFEITOS.find((e) => e.valor === d.efeito)?.rotulo}
              </span>
              {usado && <span className="text-xs text-ink-600">· em uso por uma regra</span>}
              <span className="ml-auto text-sm text-ink-600">{aberto ? "fechar" : "editar"}</span>
            </button>

            {aberto && (
              <div className="p-5 grid lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div>
                    <Label>Nome (para o time)</Label>
                    <Input
                      value={d.rotulo}
                      disabled={!podeEditar}
                      onChange={(e) => trocar(d.id, { rotulo: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Efeito</Label>
                      <Select
                        value={d.efeito}
                        disabled={!podeEditar}
                        onChange={(e) =>
                          trocar(d.id, { efeito: e.target.value as EfeitoDoDesfecho })
                        }
                      >
                        {EFEITOS.map((e) => (
                          <option key={e.valor} value={e.valor}>{e.rotulo}</option>
                        ))}
                      </Select>
                      <p className="text-sm text-ink-600 mt-1.5 leading-snug">
                        {EFEITOS.find((e) => e.valor === d.efeito)?.explica}
                      </p>
                    </div>
                    <div>
                      <Label>Cor e selo</Label>
                      <Select
                        value={d.tom}
                        disabled={!podeEditar}
                        onChange={(e) => trocar(d.id, { tom: e.target.value as Desfecho["tom"] })}
                      >
                        {TONS.map((t) => (
                          <option key={t.valor} value={t.valor}>{t.rotulo}</option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Título</Label>
                    <Input
                      value={d.titulo}
                      disabled={!podeEditar}
                      onChange={(e) => trocar(d.id, { titulo: e.target.value })}
                    />
                    {/* As duas trocas são fechadas: uma lista aberta de variáveis
                        deixaria chave crua na tela de quem responde. */}
                    <p className="text-sm text-ink-600 mt-1.5 leading-snug">
                      <code className="mono">{"{nome}"}</code> vira &ldquo;Marcos, &rdquo; quando
                      algum hook trouxer um nome — e some, com maiúscula, quando não trouxer.
                    </p>
                  </div>

                  <div>
                    <Label>Texto</Label>
                    <Textarea
                      rows={3}
                      value={d.texto ?? ""}
                      disabled={!podeEditar}
                      onChange={(e) => trocar(d.id, { texto: e.target.value })}
                    />
                  </div>

                  <div className="border-t hairline pt-4">
                    <Label>Próximo passo (opcional)</Label>
                    <Input
                      value={d.proximoPasso?.titulo ?? ""}
                      placeholder="Próximo passo"
                      disabled={!podeEditar}
                      onChange={(e) =>
                        trocar(d.id, {
                          proximoPasso: {
                            titulo: e.target.value,
                            texto: d.proximoPasso?.texto ?? "",
                          },
                        })
                      }
                    />
                    <Textarea
                      rows={2}
                      className="mt-2"
                      value={d.proximoPasso?.texto ?? ""}
                      placeholder="O que a pessoa faz agora."
                      disabled={!podeEditar}
                      onChange={(e) =>
                        trocar(d.id, {
                          proximoPasso: {
                            titulo: d.proximoPasso?.titulo ?? "",
                            texto: e.target.value,
                          },
                        })
                      }
                    />
                    <p className="text-sm text-ink-600 mt-1.5 leading-snug">
                      <code className="mono">{"{identificador}"}</code> vira o dado que a capa
                      colheu, mascarado.
                    </p>
                  </div>

                  <div className="border-t hairline pt-4">
                    <button
                      type="button"
                      disabled={!podeEditar || usado}
                      onClick={() => onMudar(desfechos.filter((x) => x.id !== d.id))}
                      className="h-9 px-3.5 rounded-full border border-signal-stop/45 text-signal-stop
                                 text-sm font-semibold hover:bg-signal-stop/[0.07] transition
                                 disabled:opacity-40"
                    >
                      Remover
                    </button>
                    {usado && (
                      <p className="text-sm text-ink-600 mt-2 leading-snug">
                        Alguma regra aponta para este desfecho. Renomear pode; remover deixaria a
                        regra sem destino.
                      </p>
                    )}
                  </div>
                </div>

                {/*
                 * A prévia é a tela de verdade, com o mesmo componente do fim da
                 * jornada. Escrever título e texto sem ver como caem na página é
                 * o que produzia frases que só funcionavam na cabeça de quem
                 * escreveu.
                 */}
                <div className="lg:sticky lg:top-4">
                  <div className="text-sm font-semibold text-ink-600 mb-3">Como fica</div>
                  <div className="border hairline rounded-md p-6 bg-ink-0">
                    <TelaDeDesfecho
                      nomeDaPesquisa="Sua pesquisa"
                      tom={d.tom}
                      titulo={preencherTexto(d.titulo, { nome: "Marcos" })}
                      texto={d.texto ? preencherTexto(d.texto, { nome: "Marcos" }) : undefined}
                      motivo="O motivo escrito na regra que decidiu aparece aqui."
                      proximoPasso={
                        d.proximoPasso?.texto?.trim()
                          ? {
                              titulo: d.proximoPasso.titulo.trim() || "Próximo passo",
                              texto: preencherTexto(d.proximoPasso.texto, {
                                identificador: "•••.222.333-••",
                              }),
                            }
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
