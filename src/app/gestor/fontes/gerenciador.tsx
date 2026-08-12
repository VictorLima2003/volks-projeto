"use client";

import { useAviso } from "@/components/Avisos";
import { EditorCodigo } from "@/components/EditorCodigo";
import { Badge, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { AnexoHook, Hook, ParametroHook } from "@/lib/types";
import { useState } from "react";

const CODIGO_INICIAL = [
  "// Este código é o corpo de uma função assíncrona.",
  "// Disponíveis: os parâmetros que você definir, além de",
  "//   csv(nomeOuUrl) → lê um anexo ou baixa um CSV",
  "//   log(...)       → registra no painel de execução",
  "//   chave(valor)   → normaliza documentos para comparação",
  "//   fetch(...)     → chamadas HTTP",
  "",
  "return { exemplo: true };",
].join("\n");

export function GerenciadorHooks({
  hooksIniciais,
  podeEditar,
  nomeUsuario,
}: {
  hooksIniciais: Hook[];
  podeEditar: boolean;
  nomeUsuario: string;
}) {
  const [hooks, setHooks] = useState<Hook[]>(hooksIniciais);
  const [selecionado, setSelecionado] = useState<string | null>(hooksIniciais[0]?.id ?? null);
  const [salvando, setSalvando] = useState(false);
  const { avisar } = useAviso();

  const hook = hooks.find((h) => h.id === selecionado) ?? null;

  function patch(id: string, p: Partial<Hook>) {
    setHooks((hs) => hs.map((h) => (h.id === id ? { ...h, ...p } : h)));
  }

  function adicionar() {
    const id = `hook_${Date.now().toString(36)}`;
    const novo: Hook = {
      id,
      nome: "Novo hook",
      descricao: "",
      prefixo: `hook${hooks.length + 1}`,
      parametros: [{ nome: "documento", rotulo: "Documento" }],
      mensagemCarregando: "Consultando...",
      rotulos: {},
      codigo: CODIGO_INICIAL,
      anexos: [],
      ativo: false,
    };
    setHooks((hs) => [...hs, novo]);
    setSelecionado(id);
  }

  async function salvar() {
    setSalvando(true);
    const res = await fetch("/api/hooks", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hooks }),
    });
    const json = await res.json();
    setSalvando(false);
    if (!res.ok) {
      avisar(json.detalhe ?? json.erro ?? "Falha ao salvar.", "stop");
      return;
    }
    avisar(`${json.total} hook(s) salvo(s).`, "go");
  }

  return (
    <div className="grid lg:grid-cols-4 gap-6 items-start">
      {/* ---------------- Lista ---------------- */}
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Hooks</h2>
          <span className="text-sm text-ink-600">{hooks.length}</span>
        </div>

        <ul className="space-y-2">
          {hooks.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => setSelecionado(h.id)}
                className={
                  "w-full text-left border rounded-md px-4 py-3 transition " +
                  (h.id === selecionado
                    ? "border-vw-deep bg-vw-deep/[0.06]"
                    : "border-ink-300 hover:border-ink-500 bg-ink-0")
                }
              >
                <div className="flex items-center gap-2">
                  <span className="text-base truncate flex-1">{h.nome}</span>
                  {!h.ativo && <Badge tone="warn">off</Badge>}
                </div>
                <span className="mono text-xs text-ink-600">{h.prefixo}.*</span>
              </button>
            </li>
          ))}
        </ul>

        <Button variant="secondary" onClick={adicionar} className="w-full h-11 text-sm">
          + Novo hook
        </Button>

        <div className="pt-4 border-t hairline space-y-3">
          {!podeEditar && (
            <p className="text-sm text-ink-700">
              {nomeUsuario} não edita hooks. Troque para alguém de Produto ou Marketing.
            </p>
          )}
          <Button onClick={salvar} disabled={salvando || !podeEditar} className="w-full">
            {salvando ? "Salvando..." : "Salvar hooks"}
          </Button>
        </div>
      </aside>

      {/* ---------------- Edição ---------------- */}
      <div className="lg:col-span-3">
        {!hook ? (
          <Card>
            <p className="text-base text-ink-600">
              Nenhum hook selecionado. Crie um para começar.
            </p>
          </Card>
        ) : (
          <EdicaoHook
            key={hook.id}
            hook={hook}
            onPatch={(p) => patch(hook.id, p)}
            onRemover={() => {
              setHooks((hs) => hs.filter((h) => h.id !== hook.id));
              setSelecionado(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function EdicaoHook({
  hook,
  onPatch,
  onRemover,
}: {
  hook: Hook;
  onPatch: (p: Partial<Hook>) => void;
  onRemover: () => void;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input value={hook.nome} onChange={(e) => onPatch({ nome: e.target.value })} />
            </div>
            <div>
              <Label>Prefixo dos fatos</Label>
              <Input
                value={hook.prefixo}
                onChange={(e) => onPatch({ prefixo: e.target.value })}
                className="mono"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onRemover}
            className="w-11 h-11 mt-7 shrink-0 rounded-full hover:bg-signal-stop/10 text-signal-stop transition"
            aria-label="Remover hook"
          >
            ✕
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <Input
              value={hook.descricao ?? ""}
              onChange={(e) => onPatch({ descricao: e.target.value })}
              placeholder="O que este hook faz"
            />
          </div>
          <div>
            <Label>Ativo</Label>
            <Select
              value={hook.ativo ? "sim" : "nao"}
              onChange={(e) => onPatch({ ativo: e.target.value === "sim" })}
            >
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Label>Mensagem de carregamento</Label>
          <Input
            value={hook.mensagemCarregando}
            onChange={(e) => onPatch({ mensagemCarregando: e.target.value })}
            placeholder="Consultando..."
          />
          <p className="text-xs text-ink-600 mt-2">
            É o que o respondente vê enquanto o hook executa.
          </p>
        </div>
      </Card>

      <Card>
        <Parametros
          parametros={hook.parametros}
          onChange={(parametros) => onPatch({ parametros })}
        />
      </Card>

      <Card>
        <RotulosDeFatos
          rotulos={hook.rotulos ?? {}}
          onChange={(rotulos) => onPatch({ rotulos })}
        />
      </Card>

      <Card>
        <div className="flex items-baseline justify-between mb-4">
          <Label className="mb-0">Código</Label>
          <span className="text-xs text-ink-600">
            corpo de função assíncrona · retorne um objeto, ou{" "}
            <span className="mono">null</span> se não encontrar
          </span>
        </div>
        <EditorCodigo
          valor={hook.codigo}
          onChange={(codigo) => onPatch({ codigo })}
          parametros={hook.parametros.map((p) => p.nome)}
        />
      </Card>

      <Card>
        <Anexos anexos={hook.anexos} onChange={(anexos) => onPatch({ anexos })} />
      </Card>

      <Card>
        <ExecutarTeste hook={hook} />
      </Card>

      <div className="border-l-4 border-signal-warn pl-5 py-1">
        <div className="text-sm font-semibold text-signal-warn mb-2">
          Antes de ir para produção
        </div>
        <p className="text-sm text-ink-700">
          O código roda no servidor sem isolamento. Um laço infinito
          (<span className="mono">while (true)</span>) trava o processo inteiro — o limite de tempo
          só interrompe espera assíncrona, não CPU travada. Enquanto isso não for para um worker
          isolado, trate o editor como ferramenta de time interno.
        </p>
      </div>
    </div>
  );
}

function Parametros({
  parametros,
  onChange,
}: {
  parametros: ParametroHook[];
  onChange: (p: ParametroHook[]) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <Label className="mb-0">Parâmetros de entrada</Label>
        <span className="text-xs text-ink-600">viram variáveis dentro do código</span>
      </div>

      <div className="space-y-2.5">
        {parametros.map((p, i) => (
          <div key={i} className="grid grid-cols-12 gap-2.5">
            <Input
              className="col-span-3 mono"
              value={p.nome}
              onChange={(e) => {
                const novos = [...parametros];
                novos[i] = { ...p, nome: e.target.value };
                onChange(novos);
              }}
              placeholder="documento"
            />
            <Input
              className="col-span-4"
              value={p.rotulo}
              onChange={(e) => {
                const novos = [...parametros];
                novos[i] = { ...p, rotulo: e.target.value };
                onChange(novos);
              }}
              placeholder="Rótulo"
            />
            <Input
              className="col-span-4"
              value={p.descricao ?? ""}
              onChange={(e) => {
                const novos = [...parametros];
                novos[i] = { ...p, descricao: e.target.value };
                onChange(novos);
              }}
              placeholder="Descrição (opcional)"
            />
            <button
              type="button"
              onClick={() => onChange(parametros.filter((_, k) => k !== i))}
              className="col-span-1 h-12 rounded-full hover:bg-signal-stop/10 text-signal-stop transition"
              aria-label="Remover parâmetro"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...parametros, { nome: `param${parametros.length + 1}`, rotulo: "" }])}
        className="mt-3 text-sm font-semibold text-vw-deep hover:underline"
      >
        + Adicionar parâmetro
      </button>
    </div>
  );
}

function Anexos({
  anexos,
  onChange,
}: {
  anexos: AnexoHook[];
  onChange: (a: AnexoHook[]) => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  async function subir(arquivos: FileList | null) {
    if (!arquivos) return;
    const novos: AnexoHook[] = [];
    for (const f of Array.from(arquivos)) {
      novos.push({ nome: f.name, conteudo: await f.text() });
    }
    onChange([...anexos.filter((a) => !novos.some((n) => n.nome === a.nome)), ...novos]);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <Label className="mb-0">Anexos</Label>
        <span className="text-xs text-ink-600">
          leia com <span className="mono">csv(&apos;nome.csv&apos;)</span>
        </span>
      </div>

      <div className="space-y-2">
        {anexos.map((a) => (
          <div key={a.nome} className="border hairline rounded-sm">
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="mono text-sm flex-1 truncate">{a.nome}</span>
              <span className="text-xs text-ink-600">
                {a.conteudo.split(/\r?\n/).filter(Boolean).length} linhas
              </span>
              <button
                type="button"
                onClick={() => setAberto(aberto === a.nome ? null : a.nome)}
                className="text-sm text-vw-deep hover:underline"
              >
                {aberto === a.nome ? "ocultar" : "ver"}
              </button>
              <button
                type="button"
                onClick={() => onChange(anexos.filter((x) => x.nome !== a.nome))}
                className="w-8 h-8 rounded-full hover:bg-signal-stop/10 text-signal-stop transition"
                aria-label="Remover anexo"
              >
                ✕
              </button>
            </div>
            {aberto === a.nome && (
              <Textarea
                rows={8}
                className="mono text-xs rounded-none border-0 border-t-2"
                value={a.conteudo}
                onChange={(e) =>
                  onChange(anexos.map((x) => (x.nome === a.nome ? { ...x, conteudo: e.target.value } : x)))
                }
              />
            )}
          </div>
        ))}
        {anexos.length === 0 && (
          <p className="text-sm text-ink-600">Nenhum anexo. O código ainda pode buscar por URL.</p>
        )}
      </div>

      <label className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-vw-deep hover:underline cursor-pointer">
        + Subir arquivo
        <input
          type="file"
          accept=".csv,.txt,.json"
          multiple
          className="sr-only"
          onChange={(e) => subir(e.target.files)}
        />
      </label>
    </div>
  );
}

/** Roda o hook que está na tela, sem exigir salvar antes. */
function ExecutarTeste({ hook }: { hook: Hook }) {
  const [args, setArgs] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
  const [rodando, setRodando] = useState(false);

  async function testar() {
    setRodando(true);
    const res = await fetch("/api/executar-hook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hookAvulso: hook, argumentos: args }),
    });
    setResultado(await res.json());
    setRodando(false);
  }

  const logs = (resultado?.logs as string[]) ?? [];
  const fatos = (resultado?.fatos as Record<string, unknown>) ?? {};
  // `encontrado` vive dentro dos fatos, não no topo da resposta.
  const encontrou = fatos.encontrado === true;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <Label className="mb-0">Executar</Label>
        <span className="text-xs text-ink-600">roda o código desta tela, sem precisar salvar</span>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {hook.parametros.map((p) => (
          <div key={p.nome}>
            <Label>{p.rotulo || p.nome}</Label>
            <Input
              value={args[p.nome] ?? ""}
              onChange={(e) => setArgs((a) => ({ ...a, [p.nome]: e.target.value }))}
              placeholder={p.nome}
            />
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={testar} disabled={rodando} className="mt-4">
        {rodando ? "Executando..." : "Executar hook"}
      </Button>

      {resultado && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3">
            <Badge tone={resultado.ok ? (encontrou ? "go" : "warn") : "stop"}>
              {resultado.ok ? (encontrou ? "encontrou" : "não encontrou") : "erro"}
            </Badge>
            <span className="text-sm text-ink-600">{String(resultado.duracaoMs)} ms</span>
          </div>

          {resultado.erro ? (
            <div className="border border-signal-stop/45 bg-signal-stop/10 rounded-sm p-3 text-sm text-signal-stop mono">
              {String(resultado.erro)}
            </div>
          ) : null}

          <div>
            <div className="text-sm font-semibold text-ink-600 mb-1.5">
              Fatos gerados
            </div>
            <pre className="mono text-xs bg-ink-100 border hairline rounded-sm p-3 overflow-x-auto">
              {Object.entries(fatos)
                .map(([k, v]) => `${hook.prefixo}.${k} = ${JSON.stringify(v)}`)
                .join("\n") || "(nenhum)"}
            </pre>
          </div>

          {logs.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-ink-600 mb-1.5">
                Logs
              </div>
              <pre className="mono text-xs bg-ink-100 border hairline rounded-sm p-3 overflow-x-auto">
                {logs.join("\n")}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/**
 * Como cada fato deve aparecer nas telas.
 *
 * A chave é o nome que o código devolve — identificador, sem acento. O rótulo é
 * o que o vendedor e o motorista leem. Sem isto a interface só conseguia separar
 * o camelCase e subir a inicial, e `temRestricao` virava "Tem Restricao".
 *
 * O que não estiver aqui continua caindo nessa regra mecânica: preencher é
 * opcional, campo por campo.
 */
function RotulosDeFatos({
  rotulos,
  onChange,
}: {
  rotulos: Record<string, string>;
  onChange: (r: Record<string, string>) => void;
}) {
  const linhas = Object.entries(rotulos);

  function trocar(i: number, chave: string, rotulo: string) {
    const novas = linhas.map((l, j) => (j === i ? [chave, rotulo] : l));
    onChange(Object.fromEntries(novas.filter(([c]) => c.trim())));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <Label className="mb-0">Rótulos dos fatos</Label>
        <span className="text-xs text-ink-600">como cada campo aparece nas telas</span>
      </div>

      <div className="space-y-2.5">
        {linhas.map(([chave, rotulo], i) => (
          <div key={i} className="grid grid-cols-12 gap-2.5">
            <Input
              className="col-span-5 mono"
              value={chave}
              onChange={(e) => trocar(i, e.target.value, rotulo)}
              placeholder="temRestricao"
            />
            <Input
              className="col-span-6"
              value={rotulo}
              onChange={(e) => trocar(i, chave, e.target.value)}
              placeholder="Tem restrição"
            />
            <button
              type="button"
              onClick={() => onChange(Object.fromEntries(linhas.filter((_, j) => j !== i)))}
              className="col-span-1 text-sm text-ink-600 hover:text-signal-stop transition"
              aria-label={`Remover rótulo de ${chave}`}
            >
              remover
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...rotulos, "": "" })}
        className="mt-3 text-sm font-semibold text-vw-deep hover:underline"
      >
        + Rótulo
      </button>

      {linhas.length === 0 && (
        <p className="text-xs text-ink-600 mt-3">
          Nenhum rótulo definido. Os fatos aparecem com o nome da chave, separado
          por maiúsculas.
        </p>
      )}
    </div>
  );
}
