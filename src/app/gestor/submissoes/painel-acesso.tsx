"use client";

import { useAviso } from "@/components/Avisos";
import { BotaoCopiar } from "@/components/BotaoCopiar";
import { Button, Card, Input, Label } from "@/components/ui";
import { TokenApi } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Exportar e integrar — o que sai desta pesquisa para fora do sistema.
 *
 * Fica na tela de submissões, e não no construtor, porque é operação e não
 * construção: quem vem aqui quer os dados que já entraram, não mudar o que se
 * pergunta.
 */
export function PainelAcesso({
  pesquisaId,
  pesquisaNome,
  tokens,
  linkCsv,
  podeEditar,
}: {
  pesquisaId: string;
  pesquisaNome: string;
  tokens: TokenApi[];
  /** O CSV do recorte que a tela está mostrando. */
  linkCsv: string;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [aberto, setAberto] = useState(false);

  /* O endereço absoluto só existe no navegador — e é ele que a pessoa cola no
     Power BI, não o caminho relativo. */
  const [origem, setOrigem] = useState("");
  useEffect(() => setOrigem(window.location.origin), []);

  const endpoint = `${origem}/api/publico/submissoes?pesquisa=${pesquisaId}`;
  const agregado = `${origem}/api/publico/agregado?pesquisa=${pesquisaId}`;

  async function criar() {
    setCriando(true);
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pesquisaId, nome }),
    });
    const json = await res.json();
    setCriando(false);
    if (!res.ok) {
      avisar(json.detalhe ?? json.erro ?? "Não deu para criar a credencial.", "stop");
      return;
    }
    setNome("");
    avisar("Credencial criada.", "go");
    router.refresh();
  }

  async function revogar(tokenId: string, comoSeChama: string) {
    const res = await fetch("/api/tokens", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pesquisaId, tokenId }),
    });
    if (!res.ok) {
      avisar("Não deu para revogar.", "stop");
      return;
    }
    avisar(`Credencial "${comoSeChama}" revogada.`, "go");
    router.refresh();
  }

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-64 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">Exportar e integrar</h2>
          <p className="text-sm text-ink-600 mt-1">
            {pesquisaNome} · o CSV sai com o mesmo recorte que está na tela.
          </p>
        </div>
        {/* Link, não botão com fetch: download é navegação, e o navegador já
            sabe fazer isso — inclusive quando a lista é grande. */}
        <a
          href={linkCsv}
          className="h-11 px-5 inline-flex items-center rounded-full bg-vw-deep text-ink-0
                     text-sm font-semibold hover:opacity-90 transition"
        >
          Baixar CSV
        </a>
        <Button variant="secondary" onClick={() => setAberto((v) => !v)}>
          {aberto ? "Fechar acesso por API" : "Acesso por API"}
        </Button>
      </div>

      {aberto && (
        <div className="mt-6 pt-6 border-t hairline space-y-6">
          {/*
           * Duas rotas, e a diferença entre elas é a pergunta que respondem.
           *
           * Só a de linha cruas existia, e quem queria a série por semana tinha
           * que baixar milhares de registros para contá-los do outro lado — e aí
           * cada consumidor reimplementava "o que conta como concluída", com o
           * painel virando só mais uma opinião entre três.
           */}
          <div className="grid md:grid-cols-2 gap-4">
            <Rota
              id="endpoint-submissoes"
              titulo="Linha por submissão"
              descricao="O dado cru, uma linha por pessoa. Aceita &formato=csv."
              url={endpoint}
            />
            <Rota
              id="endpoint-agregado"
              titulo="Números já somados"
              descricao="Resumo, funil, distribuição e série no tempo — as mesmas contas da tela."
              url={agregado}
            />
          </div>

          <p className="text-sm text-ink-600 -mt-2">
            As duas aceitam <span className="mono">de</span>, <span className="mono">ate</span>,{" "}
            <span className="mono">desfecho</span>, <span className="mono">efeito</span>,{" "}
            <span className="mono">estado</span> e <span className="mono">busca</span> — o mesmo
            recorte da tela. O token vai no cabeçalho{" "}
            <span className="mono">Authorization: Bearer …</span>, nunca na URL: endereço com
            segredo dentro vaza no histórico, no log e no print.
          </p>

          <div>
            <h3 className="text-sm font-semibold mb-3">Pronto para colar</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Exemplo
                id="exemplo-python"
                linguagem="Python · pandas"
                codigo={`import io, requests
import pandas as pd

TOKEN = "<cole a credencial>"
r = requests.get(
    "${endpoint}",
    params={"de": "2026-01-01", "formato": "csv"},
    headers={"Authorization": f"Bearer {TOKEN}"},
)
df = pd.read_csv(io.StringIO(r.text), sep=";")`}
              />
              <Exemplo
                id="exemplo-r"
                linguagem="R"
                codigo={`library(httr); library(readr)

r <- GET("${endpoint}",
         query = list(formato = "csv"),
         add_headers(Authorization = paste("Bearer", Sys.getenv("VW_TOKEN"))))
df <- read_delim(content(r, "text"), delim = ";")`}
              />
            </div>
            <p className="text-sm text-ink-600 mt-3 leading-snug">
              O CSV sai com <span className="mono">;</span> e BOM porque o Excel em português lê{" "}
              <span className="mono">,</span> como separador decimal e joga a linha inteira numa
              célula só. No Power BI, use <em>Obter dados › Web › Avançado</em> para pôr o
              cabeçalho — o campo simples não aceita cabeçalho e o token não vai na URL.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Credenciais</h3>
            {tokens.length === 0 ? (
              <p className="text-sm text-ink-600 mb-4">
                Nenhuma ainda. Crie uma por destino — é o que permite revogar só o que precisa.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {tokens.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center gap-3 border hairline rounded-sm px-4 py-3"
                  >
                    <span className="text-sm font-semibold">{t.nome}</span>
                    <span id={`tok-${t.id}`} className="mono text-xs text-ink-600 break-all">
                      {t.valor}
                    </span>
                    <span className="text-xs text-ink-600 ml-auto">
                      {t.ultimoUsoEm
                        ? `último uso ${t.ultimoUsoEm.slice(0, 16).replace("T", " ")}`
                        : "nunca usada"}
                    </span>
                    <BotaoCopiar valor={t.valor} alvoId={`tok-${t.id}`} compacto />
                    <button
                      type="button"
                      disabled={!podeEditar}
                      onClick={() => revogar(t.id, t.nome)}
                      className="h-9 px-3.5 rounded-full border border-signal-stop/45 text-signal-stop
                                 text-sm font-semibold hover:bg-signal-stop/[0.07] transition
                                 disabled:opacity-40"
                    >
                      Revogar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-64 flex-1">
                <Label htmlFor="nome-token">Para quem é esta credencial</Label>
                <Input
                  id="nome-token"
                  value={nome}
                  disabled={!podeEditar}
                  placeholder="Ex.: Power BI · time de dados"
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <Button onClick={criar} disabled={criando || !podeEditar || !nome.trim()}>
                {criando ? "Criando..." : "Criar credencial"}
              </Button>
            </div>

            {/* A limitação dita em voz alta, na tela onde a decisão é tomada —
                e não só no README, que quem entrega o token não vai ler. */}
            <p className="text-sm text-ink-600 mt-4 leading-snug">
              A credencial dá leitura de <strong>todas as submissões desta pesquisa</strong>,
              inclusive as respostas. Neste protótipo ela fica guardada em texto e não há limite de
              requisições — trate como senha e revogue quando o destino mudar.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Uma rota, com o endereço copiável e o que ela responde. */
function Rota({
  id,
  titulo,
  descricao,
  url,
}: {
  id: string;
  titulo: string;
  descricao: string;
  url: string;
}) {
  return (
    <div className="border hairline rounded-md p-4">
      <div className="text-sm font-semibold">{titulo}</div>
      <p className="text-sm text-ink-600 mt-1 mb-3">{descricao}</p>
      <div id={id} className="text-xs break-all border hairline rounded-sm bg-ink-100 px-3 py-2 mono">
        {url}
      </div>
      <div className="mt-2">
        <BotaoCopiar valor={url} alvoId={id} compacto />
      </div>
    </div>
  );
}

/**
 * Um trecho pronto para colar.
 *
 * `<pre>` com rolagem própria: código quebrado em linha automática deixa de ser
 * colável, e uma linha longa que empurra a largura do cartão estraga o resto da
 * tela — daí o `overflow-x-auto` aqui dentro e não na página.
 */
function Exemplo({ id, linguagem, codigo }: { id: string; linguagem: string; codigo: string }) {
  return (
    <div className="border hairline rounded-md overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-ink-100 border-b hairline">
        <span className="text-xs font-semibold text-ink-700">{linguagem}</span>
        <BotaoCopiar valor={codigo} alvoId={id} compacto />
      </div>
      <pre id={id} className="text-xs leading-relaxed p-4 overflow-x-auto mono">
        {codigo}
      </pre>
    </div>
  );
}
