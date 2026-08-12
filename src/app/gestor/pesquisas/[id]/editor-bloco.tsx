"use client";

import { Input, Label, Select, Textarea } from "@/components/ui";
import { catalogoDeFatos, perguntasAntesDe } from "@/lib/engine";
import { EditorCondicao } from "@/components/EditorCondicao";
import {
  Bloco,
  COR_FEEDBACK,
  ehCondicional,
  ehConsulta,
  ehFeedback,
  Hook,
  Operador,
  TipoFeedback,
  TipoPergunta,
} from "@/lib/types";
import { Problema } from "@/lib/validacao-pesquisa";

const TIPOS: { valor: TipoPergunta; rotulo: string; opcoes: boolean }[] = [
  { valor: "texto", rotulo: "Texto livre", opcoes: false },
  { valor: "numero", rotulo: "Número", opcoes: false },
  { valor: "data", rotulo: "Data", opcoes: false },
  { valor: "cpf", rotulo: "CPF", opcoes: false },
  { valor: "email", rotulo: "E-mail", opcoes: false },
  { valor: "telefone", rotulo: "Telefone", opcoes: false },
  { valor: "opcao", rotulo: "Escolha única", opcoes: true },
  { valor: "multipla", rotulo: "Múltipla escolha", opcoes: true },
  { valor: "consentimento", rotulo: "Consentimento (sim/não)", opcoes: false },
];

export function EditorBloco({
  bloco,
  todosOsBlocos,
  hooks,
  problemas,
  onPatch,
}: {
  bloco: Bloco;
  todosOsBlocos: Bloco[];
  hooks: Hook[];
  problemas: Problema[];
  onPatch: (patch: Partial<Bloco>) => void;
}) {
  return (
    <div className="space-y-5">
      {ehCondicional(bloco) ? (
        <CamposCondicional
          bloco={bloco}
          todosOsBlocos={todosOsBlocos}
          hooks={hooks}
          onPatch={onPatch}
        />
      ) : ehConsulta(bloco) ? (
        <CamposConsulta
          bloco={bloco}
          todosOsBlocos={todosOsBlocos}
          hooks={hooks}
          onPatch={onPatch}
        />
      ) : ehFeedback(bloco) ? (
        <CamposFeedback bloco={bloco} onPatch={onPatch} />
      ) : (
        <CamposPergunta bloco={bloco} onPatch={onPatch} />
      )}

      {problemas.length > 0 && (
        <div className="space-y-2">
          {problemas.map((m, i) => (
            <div
              key={i}
              className={
                "rounded-sm p-3 text-sm border " +
                (m.gravidade === "erro"
                  ? "border-signal-stop/45 bg-signal-stop/10"
                  : "border-signal-warn/45 bg-signal-warn/10")
              }
            >
              <strong className={m.gravidade === "erro" ? "text-signal-stop" : "text-signal-warn"}>
                {m.gravidade === "erro" ? "Erro: " : "Atenção: "}
              </strong>
              <span className="text-ink-800">{m.mensagem}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CamposPergunta({
  bloco,
  onPatch,
}: {
  bloco: Extract<Bloco, { bloco: "pergunta" }>;
  onPatch: (patch: Partial<Bloco>) => void;
}) {
  const tipoDef = TIPOS.find((t) => t.valor === bloco.tipo);

  return (
    <>
      <div>
        <Label>Enunciado</Label>
        <Input value={bloco.rotulo} onChange={(e) => onPatch({ rotulo: e.target.value })} />
      </div>

      <div>
        <Label>Texto de apoio (opcional)</Label>
        <Input
          value={bloco.ajuda ?? ""}
          onChange={(e) => onPatch({ ajuda: e.target.value })}
          placeholder="Explique por que está pedindo isso."
        />
      </div>

      {/* Uma coluna, não três: no inspetor de 300px os três campos lado a lado
          cortavam "Texto livre" e "novaPergunta" no meio da palavra. */}
      <div className="grid gap-4">
        <div>
          <Label>Tipo</Label>
          <Select
            value={bloco.tipo}
            onChange={(e) => {
              const novo = e.target.value as TipoPergunta;
              const precisa = TIPOS.find((t) => t.valor === novo)?.opcoes;
              onPatch({
                tipo: novo,
                opcoes: precisa ? bloco.opcoes ?? ["Opção 1", "Opção 2"] : undefined,
              });
            }}
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>{t.rotulo}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Identificador</Label>
          <Input
            value={bloco.campo}
            onChange={(e) => onPatch({ campo: e.target.value })}
            className="mono"
          />
        </div>
        {/* Sim/não é uma escolha binária — caixa de marcar, não lista de duas
            opções que obriga a abrir para descobrir o que tem dentro. */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={bloco.obrigatoria}
            onChange={(e) => onPatch({ obrigatoria: e.target.checked })}
            className="mt-0.5 w-4 h-4 shrink-0 accent-vw-deep cursor-pointer"
          />
          <span>
            <span className="block text-sm font-medium text-ink-900">Resposta obrigatória</span>
            <span className="block text-xs text-ink-600 mt-0.5">
              Sem ela, o percurso não avança.
            </span>
          </span>
        </label>
      </div>
      <p className="text-xs text-ink-600 -mt-2">
        As regras e as condições referenciam esta resposta como{" "}
        <span className="mono text-vw-deep">resposta.{bloco.campo || "identificador"}</span>.
      </p>

      {tipoDef?.opcoes && (
        <div>
          <Label>Opções</Label>
          <div className="space-y-2">
            {(bloco.opcoes ?? []).map((o, oi) => (
              <div key={oi} className="flex gap-2">
                <Input
                  value={o}
                  onChange={(e) => {
                    const novas = [...(bloco.opcoes ?? [])];
                    novas[oi] = e.target.value;
                    onPatch({ opcoes: novas });
                  }}
                />
                <button
                  type="button"
                  onClick={() => onPatch({ opcoes: (bloco.opcoes ?? []).filter((_, k) => k !== oi) })}
                  className="w-12 h-12 shrink-0 rounded-full hover:bg-signal-stop/10 text-signal-stop transition"
                  aria-label="Remover opção"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onPatch({ opcoes: [...(bloco.opcoes ?? []), ""] })}
            className="mt-3 text-sm font-semibold text-vw-deep underline hover:no-underline"
          >
            + Adicionar opção
          </button>
        </div>
      )}
    </>
  );
}

const TIPOS_FEEDBACK: { valor: TipoFeedback; rotulo: string }[] = [
  { valor: "sucesso", rotulo: "Sucesso — final feliz" },
  { valor: "info", rotulo: "Info — pesquisa resolvida" },
  { valor: "warning", rotulo: "Warning — atenção" },
  { valor: "error", rotulo: "Error — bloqueio" },
];

function CamposFeedback({
  bloco,
  onPatch,
}: {
  bloco: Extract<Bloco, { bloco: "feedback" }>;
  onPatch: (patch: Partial<Bloco>) => void;
}) {
  const cor = bloco.cor || COR_FEEDBACK[bloco.tipo];

  return (
    <>
      {/* Coluna única, como o resto do inspetor: meia largura num painel de
          300px não cabe um seletor com rótulo legível. */}
      <div className="grid gap-4">
        <div>
          <Label>Tipo</Label>
          <Select
            value={bloco.tipo}
            onChange={(e) => onPatch({ tipo: e.target.value as TipoFeedback, cor: undefined })}
          >
            {TIPOS_FEEDBACK.map((t) => (
              <option key={t.valor} value={t.valor}>{t.rotulo}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Cor de destaque</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={cor}
              onChange={(e) => onPatch({ cor: e.target.value })}
              className="w-14 h-12 rounded-sm border hairline-strong bg-ink-0 cursor-pointer"
              aria-label="Escolher cor"
            />
            <Input
              value={cor}
              onChange={(e) => onPatch({ cor: e.target.value })}
              className="mono"
            />
            {bloco.cor && (
              <button
                type="button"
                onClick={() => onPatch({ cor: undefined })}
                className="text-sm text-ink-600 underline hover:text-ink-900 whitespace-nowrap px-2"
              >
                usar padrão
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <Label>Título</Label>
        <Input value={bloco.titulo} onChange={(e) => onPatch({ titulo: e.target.value })} />
      </div>

      <div>
        <Label>Mensagem</Label>
        <Textarea
          rows={3}
          value={bloco.mensagem ?? ""}
          onChange={(e) => onPatch({ mensagem: e.target.value })}
        />
      </div>

      <div>
        <Label>Imagem (URL, opcional)</Label>
        <Input
          className="mono text-sm"
          value={bloco.imagemUrl ?? ""}
          onChange={(e) => onPatch({ imagemUrl: e.target.value })}
          placeholder="https://.../parabens.png"
        />
      </div>

      {/*
       * As duas peças que faltavam para esta tela ser a mesma do veredito.
       *
       * O desenho do fim da jornada — selo, título, motivo, números e o quadro
       * do próximo passo — já existia, mas só quem chegava pelas regras via a
       * tela inteira. Um bloco de fim mostrava título e mensagem e parava aí.
       */}
      <div className="border-t hairline pt-5 space-y-4">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={bloco.mostrarNumeros ?? false}
            onChange={(e) => onPatch({ mostrarNumeros: e.target.checked })}
            className="mt-0.5 w-4 h-4 accent-vw-deep"
          />
          <span>
            <span className="text-sm font-semibold">Mostrar os números das consultas</span>
            <span className="block text-sm text-ink-600 leading-snug">
              Em cartões, como na tela de resultado. Quais números são, quem diz são os hooks —
              num caminho que corta antes da consulta, a seção não aparece.
            </span>
          </span>
        </label>

        <div>
          <Label>Próximo passo (opcional)</Label>
          <p className="text-sm text-ink-600 -mt-1 mb-2 leading-snug">
            O quadro destacado no fim, com o que a pessoa faz agora.
          </p>
          <Input
            value={bloco.proximoPasso?.titulo ?? ""}
            placeholder="Próximo passo"
            onChange={(e) =>
              onPatch({
                proximoPasso: {
                  titulo: e.target.value,
                  texto: bloco.proximoPasso?.texto ?? "",
                },
              })
            }
          />
          <Textarea
            rows={2}
            className="mt-2"
            value={bloco.proximoPasso?.texto ?? ""}
            placeholder="Leve seu documento à loja e apresente este resultado."
            onChange={(e) =>
              onPatch({
                proximoPasso: {
                  titulo: bloco.proximoPasso?.titulo ?? "",
                  texto: e.target.value,
                },
              })
            }
          />
        </div>
      </div>

      {/* Prévia do que o motorista vê */}
      <div className="border-t hairline pt-5">
        <div className="text-sm font-semibold text-ink-600 mb-3">
          Prévia
        </div>
        <div className="border hairline rounded-md overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: cor }} />
          <div className="p-6">
            {bloco.imagemUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bloco.imagemUrl}
                alt=""
                className="max-h-24 mb-4 object-contain"
              />
            )}
            <div className="display text-2xl">{bloco.titulo || "(sem título)"}</div>
            {bloco.mensagem && <p className="text-base text-ink-700 mt-2.5">{bloco.mensagem}</p>}
            {bloco.proximoPasso?.texto?.trim() && (
              <div className="mt-4 rounded-md border hairline bg-ink-100 px-4 py-3">
                <div className="text-sm font-semibold">
                  {bloco.proximoPasso.titulo.trim() || "Próximo passo"}
                </div>
                <p className="text-base text-ink-800 mt-1">{bloco.proximoPasso.texto}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-ink-600">
        Este bloco encerra o caminho. Nada depois dele é alcançável — por isso ele costuma viver
        dentro de um ramo de condicional.
      </p>
    </>
  );
}

function CamposConsulta({
  bloco,
  todosOsBlocos,
  hooks,
  onPatch,
}: {
  bloco: Extract<Bloco, { bloco: "consulta" }>;
  todosOsBlocos: Bloco[];
  hooks: Hook[];
  onPatch: (patch: Partial<Bloco>) => void;
}) {
  // Os argumentos só podem vir de respostas já coletadas antes deste ponto.
  const anteriores = perguntasAntesDe(todosOsBlocos, bloco.id);
  const hook = hooks.find((h) => h.id === bloco.hookId);

  function trocarHook(id: string) {
    const novo = hooks.find((h) => h.id === id);
    onPatch({
      hookId: id,
      // Parâmetros mudam junto com o hook; manter o mapa antigo deixaria
      // argumentos órfãos apontando para nomes que não existem mais.
      argumentos: Object.fromEntries((novo?.parametros ?? []).map((p) => [p.nome, ""])),
    });
  }

  return (
    <>
      <div>
        <Label>Nome do passo</Label>
        <Input value={bloco.rotulo} onChange={(e) => onPatch({ rotulo: e.target.value })} />
      </div>

      <div>
        <Label>Hook a executar</Label>
        <Select value={bloco.hookId} onChange={(e) => trocarHook(e.target.value)}>
          {hooks.map((h) => (
            <option key={h.id} value={h.id}>
              {h.nome} {h.ativo ? "" : "(inativo)"}
            </option>
          ))}
        </Select>
      </div>

      {hook && hook.parametros.length > 0 && (
        <div>
          <Label>Parâmetros</Label>
          <div className="space-y-2.5">
            {hook.parametros.map((p) => (
              <div key={p.nome}>
                <div className="mb-1">
                  <span className="text-sm font-medium">{p.nome}</span>
                  {p.descricao && (
                    <span className="block text-xs text-ink-600">{p.descricao}</span>
                  )}
                </div>
                <Select
                  value={bloco.argumentos?.[p.nome] ?? ""}
                  onChange={(e) =>
                    onPatch({
                      argumentos: { ...(bloco.argumentos ?? {}), [p.nome]: e.target.value },
                    })
                  }
                >
                  <option value="">(não informado)</option>
                  {anteriores.map((q) => (
                    <option key={q.campo} value={q.campo}>
                      {q.rotulo || q.campo}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {hook && (
        <div className="border-l-2 border-vw-deep pl-4">
          <div className="text-sm font-semibold text-ink-600 mb-1.5">
            O que esta consulta traz
          </div>
          <p className="text-sm text-ink-700">
            Fatos sob o prefixo <span className="mono text-vw-deep">{hook.prefixo}.*</span> — use
            em condicionais abaixo deste ponto e nas regras.
          </p>
          {!hook.ativo && (
            <p className="text-sm text-signal-warn mt-2">
              Este hook está inativo. A consulta vai falhar até você ativá-lo.
            </p>
          )}
        </div>
      )}

      {anteriores.length === 0 && (
        <p className="text-sm text-signal-warn">
          Nenhuma pergunta vem antes desta consulta — não há resposta para alimentá-la.
        </p>
      )}
    </>
  );
}

function CamposCondicional({
  bloco,
  todosOsBlocos,
  hooks,
  onPatch,
}: {
  bloco: Extract<Bloco, { bloco: "condicional" }>;
  todosOsBlocos: Bloco[];
  hooks: Hook[];
  onPatch: (patch: Partial<Bloco>) => void;
}) {
  // Só oferece o que já foi coletado antes deste ponto da árvore.
  const grupos = catalogoDeFatos(todosOsBlocos, hooks, bloco.id);

  return (
    <>
      <div>
        <Label>Nome da condição</Label>
        <Input
          value={bloco.rotulo}
          onChange={(e) => onPatch({ rotulo: e.target.value })}
          placeholder="Ex.: respondente já é cliente"
        />
      </div>

      <div>
        <Label>Entra no ramo &ldquo;então&rdquo; quando</Label>
        <EditorCondicao
          condicao={bloco.condicao}
          grupos={grupos}
          onChange={(condicao) => onPatch({ condicao })}
        />
        <p className="text-xs text-ink-600 mt-3">
          Só aparecem respostas de perguntas que vêm antes desta condicional — depender de algo
          ainda não perguntado deixaria o ramo fechado para sempre.
        </p>
      </div>
    </>
  );
}
