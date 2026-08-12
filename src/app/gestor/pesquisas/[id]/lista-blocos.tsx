"use client";

import { Badge, Button } from "@/components/ui";
import { Bloco, ehCondicional, ehConsulta, ehFeedback, ehPergunta, Hook } from "@/lib/types";
import { Problema } from "@/lib/validacao-pesquisa";
import { EditorBloco } from "./editor-bloco";

export type Destino = { condicionalId: string; ramo: "entao" | "senao" } | null;

/**
 * A pesquisa como lista aninhada — a vista que ordena.
 *
 * Ela sobreviveu à chegada do fluxo porque faz o que o canvas não faz: mover um
 * bloco de lugar. No mapa a posição é calculada a partir do caminho, então
 * arrastar lá não teria onde gravar; aqui a ordem é o próprio dado.
 */
export type Acoes = {
  adicionarPergunta: (d: Destino) => void;
  adicionarCondicional: (d: Destino) => void;
  adicionarConsulta: (d: Destino) => void;
  adicionarFeedback: (d: Destino) => void;
};

export function BarraDeAdicao({
  acoes,
  destino,
  hooks,
  compacta = false,
}: {
  acoes: Acoes;
  destino: Destino;
  hooks: Hook[];
  compacta?: boolean;
}) {
  const itens = [
    { rotulo: "Pergunta", fn: () => acoes.adicionarPergunta(destino), on: true },
    { rotulo: "Condicional", fn: () => acoes.adicionarCondicional(destino), on: true },
    { rotulo: "Consulta", fn: () => acoes.adicionarConsulta(destino), on: hooks.length > 0 },
    { rotulo: "Tela final", fn: () => acoes.adicionarFeedback(destino), on: true },
  ].filter((i) => i.on);

  if (compacta) {
    return (
      <div className="flex flex-wrap gap-3 mt-3">
        {itens.map((i) => (
          <button
            key={i.rotulo}
            type="button"
            onClick={i.fn}
            className="text-sm text-vw-deep hover:underline"
          >
            + {i.rotulo.toLowerCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 border border-dashed hairline-strong rounded-md p-4 flex flex-wrap items-center gap-3">
      <span className="text-sm text-ink-600 mr-1">Adicionar ao fim:</span>
      {itens.map((i) => (
        <Button key={i.rotulo} variant="secondary" onClick={i.fn} className="h-10 px-5 text-sm">
          + {i.rotulo}
        </Button>
      ))}
    </div>
  );
}

/** Resumo de uma linha, para o item fechado dizer o que é sem precisar abrir. */
function resumoDoBloco(b: Bloco): string {
  if (ehPergunta(b)) {
    const tipos: Record<string, string> = {
      texto: "Texto livre",
      numero: "Número",
      data: "Data",
      cpf: "CPF",
      email: "E-mail",
      telefone: "Telefone",
      opcao: "Escolha única",
      multipla: "Múltipla escolha",
      consentimento: "Consentimento",
    };
    const partes = [tipos[b.tipo] ?? b.tipo];
    if (b.opcoes?.length) partes.push(`${b.opcoes.length} opções`);
    if (!b.obrigatoria) partes.push("opcional");
    return partes.join(" · ");
  }
  if (ehCondicional(b)) {
    const v = b.condicao.valor;
    return `se ${b.condicao.fato} ${b.condicao.operador}${v !== undefined ? ` ${v}` : ""}`;
  }
  if (ehConsulta(b)) {
    const args = Object.values(b.argumentos ?? {}).filter(Boolean);
    return args.length ? `busca · ${args.join(", ")}` : "busca sem argumentos";
  }
  return `tela final · ${b.tipo}`;
}

/** Uma lista de blocos — a raiz ou o ramo de uma condicional. */
export function ListaBlocos({
  blocos,
  nivel,
  aberto,
  setAberto,
  problemas,
  arrastado,
  setArrastado,
  onSoltar,
  onPatch,
  onRemover,
  onMover,
  acoes,
  todosOsBlocos,
  hooks,
}: {
  blocos: Bloco[];
  nivel: number;
  aberto: string | null;
  setAberto: (id: string | null) => void;
  problemas: Problema[];
  arrastado: string | null;
  setArrastado: (id: string | null) => void;
  onSoltar: (alvoId: string) => void;
  onPatch: (id: string, patch: Partial<Bloco>) => void;
  onRemover: (id: string) => void;
  onMover: (id: string, delta: number) => void;
  acoes: Acoes;
  todosOsBlocos: Bloco[];
  hooks: Hook[];
}) {
  if (blocos.length === 0) {
    return (
      <div className="border border-dashed hairline-strong rounded-sm px-5 py-3.5 text-sm text-ink-600">
        Nenhum bloco aqui.
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {blocos.map((b, i) => {
        const meus = problemas.filter((p) => p.blocoId === b.id);
        const comErro = meus.some((m) => m.gravidade === "erro");
        const estaAberto = aberto === b.id;
        const titulo = (ehFeedback(b) ? b.titulo : b.rotulo) || "(sem título)";

        return (
          <li
            key={b.id}
            draggable={!estaAberto}
            onDragStart={(e) => {
              e.stopPropagation();
              setArrastado(b.id);
            }}
            onDragOver={(e) => {
              if (arrastado && arrastado !== b.id) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSoltar(b.id);
            }}
            onDragEnd={() => setArrastado(null)}
            className={
              "rounded-md border transition " +
              (arrastado === b.id ? "opacity-40 " : "") +
              (estaAberto
                ? "border-vw-deep bg-ink-0 "
                : comErro
                ? "border-signal-stop/70 bg-ink-0 hover:border-signal-stop "
                : "border-ink-300 bg-ink-0 hover:border-ink-500 ")
            }
          >
            {/* ---------- Cabeçalho: sempre visível ---------- */}
            <div
              className={
                "flex items-center gap-3 px-4 py-3 " +
                (estaAberto ? "bg-vw-deep/[0.06] rounded-t-[4px] border-b border-vw-deep/20" : "")
              }
            >
              {/* A alça some quando o item está aberto: nesse estado ele não
                  arrasta, e um ícone apagado só confundiria. */}
              {estaAberto ? (
                <span className="w-3" aria-hidden="true" />
              ) : (
                <span
                  className="select-none text-ink-600 hover:text-ink-900 cursor-grab active:cursor-grabbing"
                  title="Arraste para reordenar"
                  aria-hidden="true"
                >
                  ⠿
                </span>
              )}
              <span className="mono text-xs text-ink-600 w-6 shrink-0">{i + 1}</span>

              {ehCondicional(b) ? (
                <Badge tone="vw">se</Badge>
              ) : ehConsulta(b) ? (
                <Badge tone="warn">busca</Badge>
              ) : ehFeedback(b) ? (
                <Badge
                  tone={
                    b.tipo === "error" ? "stop"
                    : b.tipo === "warning" ? "warn"
                    : b.tipo === "sucesso" ? "go"
                    : "vw"
                  }
                >
                  fim
                </Badge>
              ) : (
                <Badge tone="neutral">pergunta</Badge>
              )}

              <button
                type="button"
                onClick={() => setAberto(estaAberto ? null : b.id)}
                className="flex-1 text-left min-w-0 flex items-baseline gap-3"
              >
                <span
                  className={
                    "truncate " + (estaAberto ? "text-base font-semibold" : "text-base")
                  }
                >
                  {titulo}
                </span>
                {/* Aqui o identificador continua à vista: é nesta tela que se
                    compara os campos de todas as perguntas, para não repetir
                    nome nem esquecer qual delas a regra referencia. */}
                {ehPergunta(b) && (
                  <span className="text-xs bg-ink-100 border hairline rounded-sm px-2 py-0.5 shrink-0">
                    {b.campo}
                  </span>
                )}
                {!estaAberto && (
                  <span className="text-sm text-ink-600 truncate hidden md:inline shrink-0">
                    {resumoDoBloco(b)}
                  </span>
                )}
              </button>

              {comErro && <Badge tone="stop">erro</Badge>}

              <span className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onMover(b.id, -1)}
                  disabled={i === 0}
                  className="w-9 h-9 rounded-full hover:bg-ink-200 disabled:opacity-25 transition"
                  aria-label="Mover para cima"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMover(b.id, 1)}
                  disabled={i === blocos.length - 1}
                  className="w-9 h-9 rounded-full hover:bg-ink-200 disabled:opacity-25 transition"
                  aria-label="Mover para baixo"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onRemover(b.id)}
                  className="w-9 h-9 rounded-full hover:bg-signal-stop/10 text-signal-stop transition"
                  aria-label="Remover bloco"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => setAberto(estaAberto ? null : b.id)}
                  className={
                    "w-9 h-9 rounded-full transition text-sm " +
                    (estaAberto
                      ? "bg-vw-deep text-ink-0 hover:opacity-90"
                      : "hover:bg-ink-200 text-ink-700")
                  }
                  aria-label={estaAberto ? "Fechar edição" : "Abrir edição"}
                  aria-expanded={estaAberto}
                >
                  {estaAberto ? "▲" : "▼"}
                </button>
              </span>
            </div>

            {/* ---------- Corpo: só quando aberto ---------- */}
            {estaAberto && (
              <div className="px-6 py-6 max-w-4xl">
                <EditorBloco
                  bloco={b}
                  todosOsBlocos={todosOsBlocos}
                  hooks={hooks}
                  problemas={meus}
                  onPatch={(patch) => onPatch(b.id, patch)}
                />
                <div className="mt-6 pt-5 border-t hairline">
                  <button
                    type="button"
                    onClick={() => setAberto(null)}
                    className="text-sm font-semibold text-vw-deep hover:underline"
                  >
                    Concluir edição ▲
                  </button>
                </div>
              </div>
            )}

            {/* ---------- Ramificações da condicional ---------- */}
            {ehCondicional(b) && (
              <div className="px-4 pb-4 pt-1 space-y-4">
                {(["entao", "senao"] as const).map((ramo) => (
                  <div
                    key={ramo}
                    className={
                      "border-l-2 pl-5 " +
                      (ramo === "entao" ? "border-signal-go/50" : "border-ink-400")
                    }
                  >
                    <div className="text-sm font-semibold text-ink-600 mb-2.5">
                      {ramo === "entao" ? "Então" : "Senão"}
                    </div>

                    <ListaBlocos
                      blocos={b[ramo]}
                      nivel={nivel + 1}
                      aberto={aberto}
                      setAberto={setAberto}
                      problemas={problemas}
                      arrastado={arrastado}
                      setArrastado={setArrastado}
                      onSoltar={onSoltar}
                      onPatch={onPatch}
                      onRemover={onRemover}
                      onMover={onMover}
                      acoes={acoes}
                      todosOsBlocos={todosOsBlocos}
                      hooks={hooks}
                    />

                    <BarraDeAdicao
                      compacta
                      acoes={acoes}
                      destino={{ condicionalId: b.id, ramo }}
                      hooks={hooks}
                    />
                  </div>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
