"use client";

import { useAviso } from "@/components/Avisos";
import { EditorCodigo } from "@/components/EditorCodigo";
import { Badge, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { baixarTexto, fonteDeArquivo, fonteParaArquivo } from "@/lib/portabilidade";
import { CODIGO_INICIAL_DESTINO, PARAMETROS_DO_DESTINO } from "@/lib/destinos-catalogo";
import { AnexoHook, ehDestino, Hook, ParametroHook, TipoDeHook } from "@/lib/types";
import { useRef, useState } from "react";

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
  const arquivoRef = useRef<HTMLInputElement>(null);
  const { avisar } = useAviso();

  const hook = hooks.find((h) => h.id === selecionado) ?? null;

  /* Duas famílias na mesma tela, separadas por título. São a mesma máquina —
     editor, execução, anexos — e o que muda é o sentido: uma traz dado, a outra
     leva. Misturadas na lista, escolher a errada era questão de tempo. */
  const fontes = hooks.filter((h) => !ehDestino(h));
  const destinos = hooks.filter(ehDestino);

  function patch(id: string, p: Partial<Hook>) {
    setHooks((hs) => hs.map((h) => (h.id === id ? { ...h, ...p } : h)));
  }

  function adicionar(tipo: TipoDeHook = "fonte") {
    const id = `hook_${Date.now().toString(36)}`;
    const destino = tipo === "destino";
    const novo: Hook = {
      id,
      tipo,
      nome: destino ? "Novo destino" : "Novo hook",
      descricao: "",
      /* O destino não devolve fato para ninguém, mas o prefixo é obrigatório no
         tipo e serve de identificador na tela. */
      prefixo: destino ? `destino${destinos.length + 1}` : `hook${fontes.length + 1}`,
      parametros: destino ? PARAMETROS_DO_DESTINO : [{ nome: "documento", rotulo: "Documento" }],
      mensagemCarregando: destino ? "" : "Consultando...",
      rotulos: {},
      codigo: destino ? CODIGO_INICIAL_DESTINO : CODIGO_INICIAL,
      anexos: [],
      ativo: false,
    };
    setHooks((hs) => [...hs, novo]);
    setSelecionado(id);
  }

  /**
   * Importar não salva — só põe na mesa.
   *
   * Quem recebe uma fonte de fora precisa ler o código antes de ele existir
   * para valer; salvar direto pularia essa leitura. A fonte entra selecionada e
   * desligada, e o "Salvar hooks" continua sendo o ato deliberado de sempre.
   *
   * As travas de prefixo — inválido, reservado, repetido — não são refeitas
   * aqui: elas moram na API e é lá que valem. O que a tela faz é adiantar o
   * aviso do repetido, porque o servidor recusaria o lote inteiro e a pessoa
   * ficaria sem saber qual dos hooks derrubou o salvamento.
   */
  function importar(arquivo: File) {
    const leitor = new FileReader();
    leitor.onload = () => {
      const lido = fonteDeArquivo(String(leitor.result));
      if (!lido.ok) {
        avisar(lido.erro, "stop");
        return;
      }
      const id = `hook_${Date.now().toString(36)}`;
      setHooks((hs) => [...hs, { ...lido.valor, id }]);
      setSelecionado(id);

      const conflito = hooks.some((h) => h.prefixo === lido.valor.prefixo);
      avisar(
        conflito
          ? `"${lido.valor.nome}" entrou, mas o prefixo "${lido.valor.prefixo}" já é de outro hook. Troque antes de salvar.`
          : `"${lido.valor.nome}" entrou desligada. Confira o código e salve.`,
        conflito ? "stop" : "go",
      );
    };
    leitor.onerror = () => avisar("Não deu para ler o arquivo.", "stop");
    leitor.readAsText(arquivo);
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
        <Familia
          titulo="Fontes"
          vazio="Nenhuma fonte ainda."
          itens={fontes}
          selecionado={selecionado}
          onEscolher={setSelecionado}
        />
        <Button variant="secondary" onClick={() => adicionar("fonte")} className="w-full h-11 text-sm">
          + Nova fonte
        </Button>

        <div className="pt-4">
          <Familia
            titulo="Destinos"
            vazio="Nenhum destino ainda. É por aqui que o lead sai para o CRM."
            itens={destinos}
            selecionado={selecionado}
            onEscolher={setSelecionado}
          />
          <Button
            variant="secondary"
            onClick={() => adicionar("destino")}
            className="w-full h-11 text-sm mt-3"
          >
            + Novo destino
          </Button>
        </div>

        {/* O input de arquivo fica escondido e é o botão que o aciona: o
            controle nativo não aceita o desenho do sistema e ainda escreve
            "Nenhum arquivo selecionado" ao lado, que aqui não informa nada. */}
        <input
          ref={arquivoRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importar(f);
            /* Zerar o valor faz o mesmo arquivo poder ser escolhido de novo —
               sem isso, reimportar depois de corrigir não dispara `change`. */
            e.target.value = "";
          }}
        />
        <Button
          variant="secondary"
          onClick={() => arquivoRef.current?.click()}
          disabled={!podeEditar}
          className="w-full h-11 text-sm"
        >
          Importar JSON
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
  const destino = ehDestino(hook);

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input value={hook.nome} onChange={(e) => onPatch({ nome: e.target.value })} />
            </div>
            {/* O prefixo nomeia os fatos que a fonte devolve. Um destino não
                devolve fato para ninguém, então o campo não teria o que nomear. */}
            {!destino && (
              <div>
                <Label>Prefixo dos fatos</Label>
                <Input
                  value={hook.prefixo}
                  onChange={(e) => onPatch({ prefixo: e.target.value })}
                  className="mono"
                />
              </div>
            )}
          </div>
          <div className="mt-7 flex shrink-0 items-center gap-2">
            {/* Exportar mora junto do hook, e não numa barra da tela: o que se
                leva embora é esta fonte, e um botão longe dela obrigaria a
                conferir qual estava selecionada antes de clicar. */}
            <button
              type="button"
              onClick={() =>
                baixarTexto(`fonte-${hook.prefixo || "sem-prefixo"}.json`, fonteParaArquivo(hook))
              }
              className="inline-flex h-11 items-center rounded-full border hairline px-4
                         text-sm font-semibold text-ink-800 transition
                         hover:border-vw-deep hover:text-vw-deep"
            >
              Exportar
            </button>
            <button
              type="button"
              onClick={onRemover}
              className="w-11 h-11 shrink-0 rounded-full hover:bg-signal-stop/10 text-signal-stop transition"
              aria-label="Remover hook"
            >
              ✕
            </button>
          </div>
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

        {/* Ninguém está esperando na tela quando um destino roda: a jornada já
            acabou e o resultado já apareceu. */}
        {!destino && (
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
        )}
      </Card>

      {destino ? (
        <Card>
          <Label className="mb-3">O que o código recebe</Label>
          <ul className="space-y-2">
            {PARAMETROS_DO_DESTINO.map((p) => (
              <li key={p.nome} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                <span className="font-semibold">{p.nome}</span>
                <span className="text-ink-600">{p.descricao}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-600 mt-4 leading-snug">
            Estas quatro chegam sempre, com estes nomes. Não são editáveis porque quem escreve o
            destino não escolhe o que a jornada tem para entregar.
          </p>
        </Card>
      ) : (
        <>
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
        </>
      )}

      {/*
       * Anexos acima do código, e não depois dele.
       *
       * O código lê o anexo pelo nome — `csv('parceiros.csv')` —, então o nome
       * do arquivo é entrada para quem vai escrever, e não resultado do que
       * escreveu. Embaixo, era preciso rolar o editor inteiro para conferir como
       * o arquivo se chama e voltar para digitar.
       */}
      <Card>
        <Anexos anexos={hook.anexos} onChange={(anexos) => onPatch({ anexos })} />
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

      {/* O teste avulso monta um formulário com os parâmetros da fonte e os
          preenche com texto. Os quatro de um destino são objetos montados a
          partir de uma jornada inteira, e não há como digitá-los aqui: o teste
          de um destino é rodar uma jornada de verdade e olhar a entrega. */}
      {!destino && (
        <Card>
          <ExecutarTeste hook={hook} />
        </Card>
      )}

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

/**
 * Uma das duas listas da lateral.
 *
 * O rótulo abaixo do nome muda com a família: a fonte se identifica pelo
 * prefixo dos fatos que devolve, e o destino não devolve fato nenhum — dizer
 * "destino1.*" ali seria prometer um caminho que nenhuma condição pode ler.
 */
function Familia({
  titulo,
  vazio,
  itens,
  selecionado,
  onEscolher,
}: {
  titulo: string;
  vazio: string;
  itens: Hook[];
  selecionado: string | null;
  onEscolher: (id: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <span className="text-sm text-ink-600">{itens.length}</span>
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-ink-600 my-3 leading-snug">{vazio}</p>
      ) : (
        <ul className="space-y-2 my-3">
          {itens.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => onEscolher(h.id)}
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
                <span className="text-xs text-ink-600">
                  {ehDestino(h) ? "roda no fim da jornada" : `${h.prefixo}.*`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
