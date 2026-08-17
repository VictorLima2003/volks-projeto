import { CaminhoAgregavel, paramsDoRecorte, Recorte } from "@/lib/analise";
import { Desfecho } from "@/lib/types";
import Link from "next/link";

/**
 * A barra de recorte.
 *
 * É um `<form method="get">` — Server Component, sem uma linha de JavaScript.
 * Não é economia: o recorte **precisa** morar na URL, porque é o que faz o
 * endereço ser compartilhável, o botão de voltar funcionar e o CSV baixar
 * exatamente o que está na tela. Um estado em React daria as três coisas de
 * graça só se fosse sincronizado com a URL de novo, à mão.
 *
 * Os atalhos de período são links, e não botões do formulário, pelo mesmo
 * motivo: cada um é um endereço com nome.
 */

const ESTADOS = [
  { valor: "", rotulo: "Qualquer estado" },
  { valor: "concluida", rotulo: "Percorreu até o fim" },
  { valor: "em_andamento", rotulo: "Em andamento" },
] as const;

const EFEITOS = [
  { valor: "", rotulo: "Qualquer efeito" },
  { valor: "libera", rotulo: "Liberou" },
  { valor: "segura", rotulo: "Segurou" },
  { valor: "recusa", rotulo: "Recusou" },
] as const;

/** Um `de`/`ate` a partir de "últimos N dias", com hoje incluso. */
export function ultimosDias(n: number, hoje = new Date()): { de: string; ate: string } {
  const comoDia = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - (n - 1));
  return { de: comoDia(inicio), ate: comoDia(hoje) };
}

export function BarraDeFiltros({
  base,
  recorte,
  desfechos,
  dimensoes,
  dimensaoAtual,
  totalNoRecorte,
  totalGeral,
}: {
  /** A rota da tela, sem parâmetros. */
  base: string;
  recorte: Recorte;
  desfechos: Desfecho[];
  dimensoes: CaminhoAgregavel[];
  dimensaoAtual: string;
  totalNoRecorte: number;
  totalGeral: number;
}) {
  const comParams = (extra: Record<string, string | undefined>) => {
    const p = paramsDoRecorte(recorte);
    if (dimensaoAtual) p.set("dim", dimensaoAtual);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };

  const filtrando = totalNoRecorte !== totalGeral;

  return (
    <section className="border hairline rounded-md bg-ink-0 shadow-card mb-6">
      <form method="get" action={base} className="p-5 flex flex-wrap items-end gap-x-4 gap-y-4">
        {/* A dimensão viaja junto com o recorte: trocar o período não pode
            devolver a pessoa para o eixo padrão. */}
        {dimensaoAtual && <input type="hidden" name="dim" value={dimensaoAtual} />}

        <Campo rotulo="Busca livre" className="min-w-[15rem] flex-1">
          <input
            type="search"
            name="busca"
            defaultValue={recorte.busca ?? ""}
            placeholder="Identificador, resposta, fato ou motivo"
            className="block w-full h-10 bg-ink-0 border hairline-strong rounded-sm px-3 text-sm
                       text-ink-900 transition focus:border-vw-deep
                       outline outline-2 outline-offset-1 outline-transparent focus-visible:outline-vw-blue"
          />
        </Campo>

        <Campo rotulo="De">
          <input
            type="date"
            name="de"
            defaultValue={recorte.de ?? ""}
            className={ENTRADA}
          />
        </Campo>

        <Campo rotulo="Até">
          <input
            type="date"
            name="ate"
            defaultValue={recorte.ate ?? ""}
            className={ENTRADA}
          />
        </Campo>

        <Campo rotulo="Desfecho">
          <select name="desfecho" defaultValue={recorte.desfecho ?? ""} className={ENTRADA}>
            <option value="">Qualquer desfecho</option>
            {desfechos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.rotulo}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Efeito">
          <select name="efeito" defaultValue={recorte.efeito ?? ""} className={ENTRADA}>
            {EFEITOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.rotulo}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Estado">
          <select name="estado" defaultValue={recorte.estado ?? ""} className={ENTRADA}>
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.rotulo}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Quebrar por">
          <select name="dim" defaultValue={dimensaoAtual} className={ENTRADA}>
            {/*
             * A origem entra com o **prefixo da fonte**, não com a palavra
             * "consulta": duas fontes podem devolver um fato de mesmo nome — a
             * base de parceiros e o bureau de crédito devolvem os dois um
             * `encontrado` —, e a lista mostrava "Encontrado · consulta" duas
             * vezes, sem nada que dissesse qual era qual.
             */}
            {dimensoes.map((d) => (
              <option key={d.caminho} value={d.caminho}>
                {d.rotulo}
                {d.origem === "sistema" ? "" : ` · ${d.caminho.split(".")[0]}`}
              </option>
            ))}
          </select>
        </Campo>

        <button
          type="submit"
          className="h-10 px-5 rounded-full bg-vw-deep text-ink-0 text-sm font-semibold transition
                     hover:bg-ink-800 outline outline-2 outline-offset-2 outline-transparent
                     focus-visible:outline-vw-blue"
        >
          Aplicar
        </button>
      </form>

      <div className="px-5 pb-4 -mt-1 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-600 mr-1">Período:</span>
        {[
          { n: 7, rotulo: "7 dias" },
          { n: 30, rotulo: "30 dias" },
          { n: 90, rotulo: "90 dias" },
        ].map(({ n, rotulo }) => {
          const janela = ultimosDias(n);
          const ativo = recorte.de === janela.de && recorte.ate === janela.ate;
          return (
            <Atalho key={n} href={comParams(janela)} ativo={ativo}>
              {rotulo}
            </Atalho>
          );
        })}
        <Atalho
          href={comParams({ de: undefined, ate: undefined })}
          ativo={!recorte.de && !recorte.ate}
        >
          Tudo
        </Atalho>

        <span className="w-px h-5 bg-ink-300 mx-1.5" aria-hidden />

        <Atalho href={comParams({ falha: recorte.falha ? undefined : "1" })} ativo={!!recorte.falha}>
          Consulta falhou
        </Atalho>

        {filtrando && (
          <span className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-ink-700">
              <strong className="mono text-ink-900">{totalNoRecorte.toLocaleString("pt-BR")}</strong>{" "}
              de {totalGeral.toLocaleString("pt-BR")} submissões
            </span>
            <Link
              href={base}
              className="text-ink-700 underline decoration-ink-300 hover:text-vw-deep hover:decoration-vw-deep transition"
            >
              Limpar
            </Link>
          </span>
        )}
      </div>
    </section>
  );
}

const ENTRADA =
  "block h-10 bg-ink-0 border hairline-strong rounded-sm px-3 text-sm text-ink-900 transition " +
  "focus:border-vw-deep outline outline-2 outline-offset-1 outline-transparent focus-visible:outline-vw-blue";

function Campo({
  rotulo,
  className,
  children,
}: {
  rotulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs font-semibold text-ink-700 mb-1.5">{rotulo}</span>
      {children}
    </label>
  );
}

function Atalho({
  href,
  ativo,
  children,
}: {
  href: string;
  ativo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "px-3 h-7 inline-flex items-center rounded-full border text-xs transition " +
        (ativo
          ? "bg-vw-deep text-ink-0 border-vw-deep font-semibold"
          : "border-ink-300 text-ink-700 hover:border-vw-deep")
      }
    >
      {children}
    </Link>
  );
}
