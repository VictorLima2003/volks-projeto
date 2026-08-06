"use client";

import { Abas } from "@/components/Abas";
import { Badge, Button } from "@/components/ui";
import { contarBlocos } from "@/lib/engine";
import { Bloco, ehCondicional, ehConsulta, ehFeedback, ehPergunta, Hook } from "@/lib/types";
import {
  atualizarBloco,
  identificadoresEmUso,
  inserirEm,
  moverNaLista,
  Problema,
  removerBloco,
  reordenarPara,
  sugerirIdentificador,
  temErro,
  validarPesquisa,
} from "@/lib/validacao-pesquisa";
import { useMemo, useState } from "react";
import { EditorBloco } from "./editor-bloco";
import { SimuladorFluxo } from "./simulador-fluxo";

type Destino = { condicionalId: string; ramo: "entao" | "senao" } | null;

export function ConstrutorPesquisa({
  campanhaId,
  blocosIniciais,
  podeEditar,
  nomeUsuario,
  hooks,
}: {
  campanhaId: string;
  blocosIniciais: Bloco[];
  podeEditar: boolean;
  nomeUsuario: string;
  hooks: Hook[];
}) {
  const [blocos, setBlocos] = useState<Bloco[]>(blocosIniciais);
  const [aba, setAba] = useState("definicao");
  const [aberto, setAberto] = useState<string | null>(null);
  const [arrastado, setArrastado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const problemas = useMemo(() => validarPesquisa(blocos), [blocos]);
  const bloqueado = temErro(problemas);
  const erros = problemas.filter((p) => p.gravidade === "erro");
  const contagem = useMemo(() => contarBlocos(blocos), [blocos]);

  function mudar(novos: Bloco[]) {
    setBlocos(novos);
    setMsg(null);
  }

  function adicionarPergunta(destino: Destino) {
    const id = `q_${Date.now().toString(36)}`;
    const campo = sugerirIdentificador("nova pergunta", identificadoresEmUso(blocos));
    mudar(
      inserirEm(blocos, destino, {
        id,
        bloco: "pergunta",
        campo,
        rotulo: "Nova pergunta",
        tipo: "texto",
        obrigatoria: true,
      }),
    );
    setAberto(id);
  }

  function adicionarCondicional(destino: Destino) {
    const id = `cond_${Date.now().toString(36)}`;
    mudar(
      inserirEm(blocos, destino, {
        id,
        bloco: "condicional",
        rotulo: "Nova condição",
        condicao: { fato: "uber.encontrado", operador: "truthy" },
        entao: [],
        senao: [],
      }),
    );
    setAberto(id);
  }

  function adicionarConsulta(destino: Destino) {
    const hook = hooks.find((h) => h.ativo) ?? hooks[0];
    if (!hook) return;
    const id = `consulta_${Date.now().toString(36)}`;
    mudar(
      inserirEm(blocos, destino, {
        id,
        bloco: "consulta",
        rotulo: `Consultar ${hook.nome}`,
        hookId: hook.id,
        argumentos: Object.fromEntries(hook.parametros.map((p) => [p.nome, ""])),
        obrigatoria: false,
      }),
    );
    setAberto(id);
  }

  function adicionarFeedback(destino: Destino) {
    const id = `fim_${Date.now().toString(36)}`;
    mudar(
      inserirEm(blocos, destino, {
        id,
        bloco: "feedback",
        tipo: "info",
        titulo: "Obrigado!",
        mensagem: "Sua resposta foi registrada.",
      }),
    );
    setAberto(id);
  }

  function soltarSobre(alvoId: string) {
    if (!arrastado || arrastado === alvoId) return;
    mudar(reordenarPara(blocos, arrastado, alvoId));
    setArrastado(null);
  }

  async function salvar() {
    setSalvando(true);
    setErroApi(null);
    setMsg(null);
    const res = await fetch("/api/pesquisa", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campanhaId, blocos }),
    });
    const json = await res.json();
    setSalvando(false);
    if (!res.ok) {
      setErroApi(json.detalhe ?? json.problemas?.[0]?.mensagem ?? json.erro ?? "Falha ao salvar.");
      return;
    }
    setMsg("Pesquisa salva.");
  }

  const acoes = { adicionarPergunta, adicionarCondicional, adicionarConsulta, adicionarFeedback };

  return (
    <div>
      <Abas
        abas={[
          { id: "definicao", rotulo: "Definição", contagem: contagem.perguntas },
          { id: "simulacao", rotulo: "Simulação" },
        ]}
        ativa={aba}
        onMudar={setAba}
        acessorio={
          aba === "definicao" ? (
            <div className="flex items-center gap-4">
              {erros.length > 0 && (
                <span className="text-sm text-signal-stop font-medium">
                  {erros.length} erro(s) a corrigir
                </span>
              )}
              {msg && <span className="text-sm text-signal-go font-medium">{msg}</span>}
              <Button onClick={salvar} disabled={salvando || bloqueado || !podeEditar}>
                {salvando ? "Salvando..." : "Salvar pesquisa"}
              </Button>
            </div>
          ) : null
        }
      />

      {aba === "definicao" ? (
        <>
          {!podeEditar && (
            <div className="border border-signal-warn/45 bg-signal-warn/10 rounded-md p-5 mb-6">
              <p className="text-base text-ink-800">
                <strong>Somente leitura.</strong> {nomeUsuario} não edita pesquisas — troque para
                alguém de Produto ou Marketing no canto superior direito.
              </p>
            </div>
          )}
          {erroApi && (
            <div className="border border-signal-stop/45 bg-signal-stop/10 rounded-md p-5 mb-6 text-base text-signal-stop">
              {erroApi}
            </div>
          )}
          {problemas
            .filter((p) => p.blocoId === null)
            .map((p, i) => (
              <div
                key={i}
                className="border border-signal-stop/45 bg-signal-stop/10 rounded-md p-5 mb-6 text-base"
              >
                {p.mensagem}
              </div>
            ))}

          <ListaBlocos
            blocos={blocos}
            nivel={0}
            aberto={aberto}
            setAberto={setAberto}
            problemas={problemas}
            arrastado={arrastado}
            setArrastado={setArrastado}
            onSoltar={soltarSobre}
            onPatch={(id, patch) => mudar(atualizarBloco(blocos, id, patch))}
            onRemover={(id) => mudar(removerBloco(blocos, id))}
            onMover={(id, d) => mudar(moverNaLista(blocos, id, d))}
            acoes={acoes}
            todosOsBlocos={blocos}
            hooks={hooks}
          />

          <BarraDeAdicao acoes={acoes} destino={null} hooks={hooks} />
        </>
      ) : (
        <SimuladorFluxo campanhaId={campanhaId} blocos={blocos} salvo={msg !== null} />
      )}
    </div>
  );
}

type Acoes = {
  adicionarPergunta: (d: Destino) => void;
  adicionarCondicional: (d: Destino) => void;
  adicionarConsulta: (d: Destino) => void;
  adicionarFeedback: (d: Destino) => void;
};

function BarraDeAdicao({
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
    <div className="mt-4 border-2 border-dashed hairline-strong rounded-md p-4 flex flex-wrap items-center gap-3">
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
function ListaBlocos({
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
              "rounded-md border-2 transition-all " +
              (arrastado === b.id ? "opacity-40 " : "") +
              (estaAberto
                ? "border-vw-deep shadow-lift bg-ink-0 "
                : comErro
                ? "border-signal-stop/70 bg-ink-0 hover:border-signal-stop "
                : "border-ink-300 bg-ink-0 hover:border-ink-500 ")
            }
          >
            {/* ---------- Cabeçalho: sempre visível ---------- */}
            <div
              className={
                "flex items-center gap-3 px-4 py-3 " +
                (estaAberto ? "bg-vw-deep/[0.06] rounded-t-[4px] border-b-2 border-vw-deep/20" : "")
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
                <span className="mono text-xs bg-ink-100 border hairline rounded-sm px-2 py-0.5 shrink-0">
                  {b.campo}
                </span>
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
                    <div className="text-xs font-bold uppercase tracking-widest text-ink-600 mb-2.5">
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
