import { AjudaDaTela, ItemAjuda } from "@/components/AjudaDaTela";
import { Barras, Colunas, Cruzada, LinhaTempo, Rosca } from "@/components/graficos";
import { numero, percentual } from "@/components/graficos/paleta";
import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Table, TD, TH, THead, TR } from "@/components/ui";
import {
  aplicarRecorte,
  caminhosAgregaveis,
  CAMPOS_DO_SISTEMA,
  compararComPeriodoAnterior,
  cruzar,
  distribuicao,
  funil,
  granularidadeSugerida,
  periodoDe,
  recorteDeParams,
  resumir,
  resumoNumerico,
  serieTemporal,
  TETO_DE_CATEGORIAS,
  type Comparacao,
} from "@/lib/analise";
import { mapaDeRotulos, rotularFato } from "@/lib/engine";
import { nomeDeUsuario } from "@/lib/identidade";
import { exigirUsuarioNaTela } from "@/lib/identidade-server";
import { listarHooks, listarPedidos, listarPesquisas, listarSessoes, obterPesquisa } from "@/lib/store";
import { desfechosDa } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraDeFiltros } from "./filtros";

export const dynamic = "force-dynamic";

/**
 * Indicadores de **uma** pesquisa.
 *
 * A tela geral somava tudo que existia no sistema, e a soma não respondia
 * nenhuma pergunta que alguém faça de verdade: ninguém quer saber a taxa média
 * de duas ofertas em praças diferentes.
 *
 * **A macroestrutura é Bento** (`design.md`, família Decisão). O que havia antes
 * era fileira de cartões do mesmo tamanho — exatamente o defeito que o Bento
 * entrou para resolver: com tudo pesando igual, nada na página diz o que olhar
 * primeiro. Aqui o movimento no tempo ocupa o dobro dos vizinhos porque é a
 * pergunta que se faz ao abrir; o resto se distribui por importância.
 *
 * **Nada é agregado por nome de campo.** Os eixos oferecidos saem do dado — cada
 * resposta e cada fato de consulta viram uma opção de "quebrar por". É o mesmo
 * princípio do motor: o produto não sabe o que é "modelo" nem o que é "corridas".
 */
export default function IndicadoresDaPesquisa({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | undefined>;
}) {
  exigirUsuarioNaTela("gestor");
  const pesquisa = obterPesquisa(params.id);
  if (!pesquisa) notFound();

  const base = `/gestor/pesquisas/${pesquisa.id}/indicadores`;
  const desfechos = desfechosDa(pesquisa);
  const rotulos = mapaDeRotulos(listarHooks());

  /** O nome do hook vence o rótulo mecânico — quem nomeia o fato é quem o produz. */
  const nomear = (caminho: string) =>
    CAMPOS_DO_SISTEMA.find((c) => c.caminho === caminho)?.rotulo ?? rotularFato(caminho, rotulos);

  const todas = listarSessoes().filter((s) => s.pesquisaId === pesquisa.id);
  /* O recorte não carrega a pesquisa: a tela já é de uma só, e deixar o
     parâmetro aberto permitiria um endereço que mostra os números de outra
     pesquisa sob este título. */
  const recorte = { ...recorteDeParams(searchParams), pesquisaId: undefined };
  const sessoes = aplicarRecorte(todas, recorte);

  const agregaveis = caminhosAgregaveis(todas, desfechos).map((c) => ({
    ...c,
    rotulo: nomear(c.caminho),
  }));
  /* Serve de eixo o que é categórico e tem mais de um valor: um campo com um
     valor só desenha uma barra de 100%, e um identificador tem tantos valores
     quanto linhas. */
  const dimensoes = agregaveis.filter(
    (c) => c.tipo !== "numero" && c.distintos > 1 && c.distintos <= TETO_DE_CATEGORIAS,
  );
  /*
   * Numérico que vale histograma precisa **variar**.
   *
   * Sem o `distintos > 1`, a versão da régua ganhava a disputa: ela é número,
   * está preenchida em toda sessão decidida, e desenhava um histograma de uma
   * barra só com "mediana 1 · média 1 · de 1 a 1". Fora `sistema.*`, porque
   * campo de controle do produto não é medida do negócio.
   */
  const numericos = agregaveis
    .filter(
      (c) =>
        c.tipo === "numero" &&
        c.preenchidos > 5 &&
        c.distintos > 1 &&
        c.origem !== "sistema",
    )
    .sort((a, b) => b.preenchidos - a.preenchidos);

  const dimensao =
    dimensoes.find((d) => d.caminho === searchParams.dim)?.caminho ??
    dimensoes.find((d) => d.origem === "resposta")?.caminho ??
    dimensoes[0]?.caminho ??
    "sistema.desfecho";

  if (todas.length === 0) {
    return (
      <ShellGestor title={pesquisa.nome}>
        <Cabecalho pesquisa={pesquisa.id} status={pesquisa.status} />
        <div className="bg-ink-0 border hairline rounded-md p-7 shadow-card text-base text-ink-700">
          Ninguém respondeu esta pesquisa ainda. Assim que a primeira jornada começar, os números
          aparecem aqui.
        </div>
      </ShellGestor>
    );
  }

  // --- números do recorte ---------------------------------------------------
  const comparacao = compararComPeriodoAnterior(todas, recorte);
  const resumo = resumir(sessoes, comparacao?.anterior ?? []);

  /*
   * Os pedidos entram pelas pessoas do recorte, não pela data do pedido.
   *
   * Um pedido nasce dias depois da jornada; filtrando por data dele, um recorte
   * de sete dias mostraria pedidos de gente que respondeu antes da janela — e o
   * funil poderia ter mais pedidos do que jornadas liberadas.
   */
  const documentos = new Set(sessoes.map((s) => s.cpf));
  const pedidos = listarPedidos().filter(
    (p) => p.pesquisaId === pesquisa.id && documentos.has(p.cpf),
  );
  const vendas = pedidos.filter((p) => p.status === "concluido");

  const granularidade = granularidadeSugerida(sessoes);
  const serie = serieTemporal(sessoes, granularidade, {
    agruparPor: "sistema.efeito",
    desfechos,
  });

  const porDesfecho = distribuicao(sessoes, "sistema.desfecho", { desfechos, teto: 8 });
  const porDimensao = distribuicao(sessoes, dimensao, { desfechos, teto: 8, incluirVazio: true });
  const etapas = funil(sessoes, pedidos.length, vendas.length);

  const motivos = distribuicao(
    sessoes.filter((s) => s.resultado?.efeito === "recusa"),
    "sistema.motivo",
    { teto: 6 },
  );

  const numerico = numericos[0];
  const histograma = numerico ? resumoNumerico(sessoes, numerico.caminho) : null;

  const cruzamento = cruzar(sessoes, dimensao, "sistema.desfecho", { desfechos, teto: 6 });

  const porVendedor = new Map<string, { pedidos: number; concluidos: number }>();
  for (const p of pedidos) {
    const atual = porVendedor.get(p.vendedor) ?? { pedidos: 0, concluidos: 0 };
    atual.pedidos++;
    if (p.status === "concluido") atual.concluidos++;
    porVendedor.set(p.vendedor, atual);
  }

  const janela = periodoDe(sessoes);
  const exportar = (() => {
    const p = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => v) as [string, string][],
    );
    p.set("pesquisa", pesquisa.id);
    return `/api/exportar?${p.toString()}`;
  })();

  return (
    <ShellGestor
      title={pesquisa.nome}
      ajuda={
        <AjudaDaTela titulo="Indicadores">
          <p>
            Os números desta pesquisa, sobre o recorte que a barra de cima define. O mesmo recorte
            vale para o CSV e para a API.
          </p>
          <ItemAjuda termo="Quebrar por">
            O eixo dos gráficos de composição. A lista sai do que a pesquisa coletou — respostas e
            fatos das consultas —, não de uma lista fixa do produto.
          </ItemAjuda>
          <ItemAjuda termo="Comparação com o período anterior">
            Só aparece com um período escolhido. A janela anterior tem a mesma duração e termina no
            dia antes do início — comparar sempre com &ldquo;mês passado&rdquo; daria a conta errada
            para quem olha sete dias.
          </ItemAjuda>
          <ItemAjuda termo="Pedidos">
            Contados pelas pessoas do recorte, não pela data do pedido: ele nasce dias depois da
            jornada, e por data o funil teria mais pedidos do que jornadas liberadas.
          </ItemAjuda>
        </AjudaDaTela>
      }
      action={
        <a
          href={exportar}
          className="h-10 px-5 inline-flex items-center rounded-full border hairline-strong
                     text-sm font-semibold transition hover:border-vw-deep hover:text-vw-deep"
        >
          Baixar CSV deste recorte
        </a>
      }
    >
      <Cabecalho pesquisa={pesquisa.id} status={pesquisa.status} />

      <BarraDeFiltros
        base={base}
        recorte={recorte}
        desfechos={desfechos}
        dimensoes={dimensoes}
        dimensaoAtual={dimensao}
        totalNoRecorte={sessoes.length}
        totalGeral={todas.length}
      />

      {sessoes.length === 0 ? (
        <div className="bg-ink-0 border hairline rounded-md p-7 shadow-card text-base text-ink-700">
          Nenhuma submissão neste recorte. Afrouxe um filtro ou volte para{" "}
          <Link href={base} className="underline decoration-ink-300 hover:text-vw-deep">
            o período inteiro
          </Link>
          .
        </div>
      ) : (
        <>
          {/* Tira densa de KPI — `gap-3`, como manda o design.md. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Tile rotulo="Submissões" valor={numero(resumo.submissoes.agora)} comparacao={resumo.submissoes} />
            <Tile rotulo="Concluíram" valor={numero(resumo.concluidas.agora)} comparacao={resumo.concluidas} />
            <Tile
              rotulo="Taxa de conclusão"
              valor={`${resumo.taxaConclusao.agora}%`}
              comparacao={resumo.taxaConclusao}
              emPontos
            />
            <Tile rotulo="Saíram liberadas" valor={numero(resumo.liberadas.agora)} comparacao={resumo.liberadas} />
          </div>

          {/*
           * O Bento. Seis colunas, blocos de larguras diferentes: o movimento no
           * tempo é a pergunta de chegada e ocupa dois terços; a composição do
           * desfecho responde "e no que deu", ao lado.
           */}
          <div className="grid lg:grid-cols-6 gap-5">
            <Bloco
              className="lg:col-span-4"
              titulo="Movimento no tempo"
              legenda={
                janela
                  ? `Por ${granularidade}, de ${formatarDia(janela.de)} a ${formatarDia(janela.ate)}`
                  : undefined
              }
            >
              <LinhaTempo pontos={serie.pontos} series={serie.series} desfechos={desfechos} />
            </Bloco>

            <Bloco
              className="lg:col-span-2"
              titulo="Por desfecho"
              legenda="Com o nome que esta pesquisa deu a cada fim"
            >
              <Rosca
                fatias={porDesfecho.fatias}
                total={porDesfecho.total}
                desfechos={desfechos}
                rotuloDoCentro="decididas"
              />
            </Bloco>

            <Bloco className="lg:col-span-2" titulo="Funil da jornada" legenda="Sobre quem iniciou">
              <ul className="space-y-3.5">
                {etapas.map((e) => (
                  <li key={e.etapa}>
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <span className="text-sm text-ink-700">{e.etapa}</span>
                      <span className="shrink-0 flex items-baseline gap-2">
                        <span className="mono text-sm text-ink-900">{numero(e.n)}</span>
                        <span className="mono text-xs text-ink-600 w-12 text-right">
                          {percentual(e.fracao)}
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 bg-ink-200 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-vw-deep rounded-r-[4px]"
                        style={{ width: `${e.n > 0 ? Math.max(e.fracao * 100, 2) : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Bloco>

            <Bloco
              className="lg:col-span-2"
              titulo={nomear(dimensao)}
              legenda={`Composição por ${nomear(dimensao).toLowerCase()}`}
            >
              <Barras
                fatias={porDimensao.fatias}
                desfechos={desfechos}
                rotuloDaCategoria={nomear(dimensao)}
              />
            </Bloco>

            {histograma && numerico && (
              <Bloco
                className="lg:col-span-2"
                titulo={numerico.rotulo}
                legenda={`Mediana ${numero(Math.round(histograma.mediana))} · média ${numero(Math.round(histograma.media))} · de ${numero(histograma.minimo)} a ${numero(histograma.maximo)}`}
              >
                <Colunas faixas={histograma.faixas} rotuloDaFaixa={numerico.rotulo} />
              </Bloco>
            )}

            <Bloco
              className={histograma ? "lg:col-span-4" : "lg:col-span-6"}
              titulo={`${nomear(dimensao)} × desfecho`}
              legenda="Onde cada grupo termina"
            >
              <Cruzada
                dados={cruzamento}
                rotuloLinha={nomear(dimensao)}
                rotuloColuna="Desfecho"
                base="linha"
              />
            </Bloco>

            {motivos.fatias.length > 0 && (
              <Bloco
                className="lg:col-span-3"
                titulo="Motivos de recusa"
                legenda="A frase que a régua devolveu"
              >
                <Barras fatias={motivos.fatias} rotuloDaCategoria="Motivo" />
              </Bloco>
            )}

            {porVendedor.size > 0 && (
              <Bloco
                className={motivos.fatias.length > 0 ? "lg:col-span-3" : "lg:col-span-6"}
                titulo="Pedidos por vendedor"
                legenda="Das pessoas que estão neste recorte"
              >
                <Table>
                  <THead>
                    <tr>
                      <TH>Vendedor</TH>
                      <TH className="text-right">Pedidos</TH>
                      <TH className="text-right">Vendas</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {[...porVendedor.entries()]
                      .sort((a, b) => b[1].pedidos - a[1].pedidos)
                      .map(([id, v]) => {
                        const u = nomeDeUsuario(id);
                        return (
                          <TR key={id}>
                            <TD>
                              <div className="text-sm">{u.nome}</div>
                              <div className="text-xs text-ink-600">{u.onde}</div>
                            </TD>
                            <TD className="text-right mono">{numero(v.pedidos)}</TD>
                            <TD className="text-right mono">{numero(v.concluidos)}</TD>
                          </TR>
                        );
                      })}
                  </tbody>
                </Table>
              </Bloco>
            )}
          </div>
        </>
      )}
    </ShellGestor>
  );
}

// --------------------------------------------------------------------------
// Peças da tela
// --------------------------------------------------------------------------

/**
 * O estado e os atalhos, abaixo do título.
 *
 * Não usa margem negativa para encostar no h1: o `Corpo` já dá o respiro, e
 * puxar o bloco para cima com `-mt-4` quebra assim que o título quebrar linha.
 */
function Cabecalho({ pesquisa, status }: { pesquisa: string; status: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
      <Badge tone={status === "ativa" ? "go" : "neutral"}>{status}</Badge>
      <Atalho href={`/gestor/pesquisas/${pesquisa}`}>Abrir construtor</Atalho>
      <Atalho href={`/gestor/submissoes?pesquisa=${pesquisa}`}>Ver submissões</Atalho>
      <Atalho href="/gestor/pesquisas">Todas as pesquisas</Atalho>
    </div>
  );
}

function Atalho({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-ink-700 underline decoration-ink-300 hover:text-vw-deep hover:decoration-vw-deep transition"
    >
      {children}
    </Link>
  );
}

/** Um bloco do Bento. Título, legenda opcional e o desenho. */
function Bloco({
  titulo,
  legenda,
  className,
  children,
}: {
  titulo: string;
  legenda?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    /*
     * `min-w-0` não é enfeite de layout: item de grid nasce com
     * `min-width: auto`, que é o tamanho do conteúdo, e um `<svg>` com `viewBox`
     * tem largura intrínseca igual à do viewBox — 720px, aqui. No celular o
     * bloco recusava encolher, esticava a grade inteira para 687px dentro de uma
     * coluna de 327, e o `overflow-x: clip` do `body` cortava o excesso **sem
     * barra de rolagem**: o gráfico simplesmente sumia pela direita.
     *
     * É o mesmo defeito que o `design.md` já registra na barra lateral, lá em
     * item de flex. Vale para todo contêiner que segure desenho.
     */
    <section
      className={`bg-ink-0 border hairline rounded-md p-6 shadow-card min-w-0 ${className ?? ""}`}
    >
      <h3 className="text-lg font-semibold tracking-tight">{titulo}</h3>
      {legenda && <p className="text-sm text-ink-600 mt-1 mb-5">{legenda}</p>}
      {!legenda && <div className="mb-5" />}
      {children}
    </section>
  );
}

function Tile({
  rotulo,
  valor,
  comparacao,
  emPontos,
}: {
  rotulo: string;
  valor: string;
  comparacao: Comparacao;
  emPontos?: boolean;
}) {
  return (
    <div className="bg-ink-0 border hairline rounded-md p-5 shadow-card">
      <div className="text-sm font-semibold text-ink-600">{rotulo}</div>
      {/* Algarismo proporcional, não tabular: `tabular-nums` dá a cada dígito a
          largura do zero, e num corpo grande "121" sai frouxo. Tabular fica
          para coluna de número que precisa alinhar na vertical. */}
      <div className="display text-2xl mt-2">{valor}</div>
      <Variacao comparacao={comparacao} emPontos={emPontos} />
    </div>
  );
}

/**
 * A variação contra o período anterior.
 *
 * A seta carrega a direção **junto** com a cor: quem não distingue verde de
 * vermelho lê a seta, e quem lê rápido reconhece a cor. Cor sozinha não informa
 * — é a mesma regra dos avisos.
 *
 * Verde para cima vale porque nestas quatro medidas subir é o objetivo. Num
 * indicador em que crescer fosse ruim, esta peça não serviria.
 *
 * **Taxa se compara em ponto percentual, não em percentual de percentual.**
 * De 85% para 81% a queda é de 4 p.p.; dizer "−5%" é verdade aritmética sobre o
 * número e mentira sobre a medida — e as duas leituras convivendo na mesma
 * fileira de tiles é exatamente como se lê errado um painel.
 */
function Variacao({ comparacao, emPontos }: { comparacao: Comparacao; emPontos?: boolean }) {
  const delta = emPontos ? comparacao.agora - comparacao.antes : comparacao.variacao;

  if (delta === null) {
    return (
      <div className="text-xs text-ink-600 mt-2">
        {comparacao.antes === 0 && comparacao.agora === 0
          ? "sem movimento"
          : "sem período anterior para comparar"}
      </div>
    );
  }

  const subiu = delta > 0;
  const parado = emPontos ? Math.round(delta) === 0 : Math.abs(delta) < 0.005;
  const cor = parado ? "text-ink-600" : subiu ? "text-signal-go" : "text-signal-stop";

  const escrito = parado
    ? "estável"
    : emPontos
      ? `${subiu ? "+" : "−"}${Math.abs(Math.round(delta))} p.p.`
      : `${subiu ? "+" : "−"}${Math.abs(Math.round(delta * 100))}%`;

  return (
    <div className={`text-xs mt-2 flex items-center gap-1.5 ${cor}`}>
      <span aria-hidden>{parado ? "→" : subiu ? "↑" : "↓"}</span>
      <span className="mono">{escrito}</span>
      <span className="text-ink-600">
        vs. {numero(comparacao.antes)}
        {emPontos ? "%" : ""} antes
      </span>
    </div>
  );
}

function formatarDia(dia: string): string {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}
