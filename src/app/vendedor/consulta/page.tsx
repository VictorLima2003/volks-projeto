import {
  CartaoPesquisa,
  CartoesNumericos,
  Veredito,
  type Tom,
} from "@/components/ResultadoDecisao";
import { ShellFluxo } from "@/components/ShellFluxo";
import { exigirUsuarioNaTela } from "@/lib/identidade-server";
import { Badge, Card, LinkButton } from "@/components/ui";
import { ROTULO_PEDIDO_STATUS } from "@/lib/catalogo";
import { criteriosLegiveis, mapaDeRotulos, rotularFato, todasAsPerguntas } from "@/lib/engine";
import { nomeDeUsuario } from "@/lib/identidade";
import { Bloco , desfechosDa } from "@/lib/types";
import { listarHooks, listarPesquisas, listarSessoes, pedidosPorCpf, versaoAtivaDaPesquisa } from "@/lib/store";
import Link from "next/link";
import { CriarPedidoForm } from "./criar-pedido-form";
import { EsperaDaConsulta } from "./espera";

export const dynamic = "force-dynamic";

/**
 * Os modelos que a pesquisa oferece, lidos da pergunta que os oferece.
 *
 * "modelo" é vocabulário do balcão, e é aqui que ele pode aparecer — o motor
 * segue sem conhecer o campo por nome. Lista vazia quando a pesquisa não
 * pergunta modelo nenhum: aí o vendedor digita.
 */
function modelosOferecidos(blocos: Bloco[]): string[] {
  return todasAsPerguntas(blocos).find((q) => q.campo === "modelo")?.opcoes ?? [];
}

/** `true`/`false` viram sim/não: no balcão ninguém lê booleano. */
function legivel(v: unknown) {
  if (typeof v === "boolean") return v ? "sim" : "não";
  return String(v);
}

export default function Consulta({ searchParams }: { searchParams: { cpf?: string } }) {
  const cpf = searchParams.cpf ?? "";

  const sessoes = listarSessoes()
    .filter((s) => s.cpf.replace(/\D/g, "") === cpf.replace(/\D/g, ""))
    .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm));
  const ultima = sessoes[0];
  // Fatos por origem (prefixo do hook), só os que realmente acharam algo.
  const fatosColetados = Object.entries(ultima?.externos ?? {}).filter(
    ([, campos]) => campos?.encontrado === true,
  );
  const nomeDoRespondente = fatosColetados
    .map(([, campos]) => campos.nome)
    .find((n) => typeof n === "string" && n.trim());
  const eu = exigirUsuarioNaTela("vendedor");
  const pedidos = pedidosPorCpf(cpf);
  const pesquisas = listarPesquisas();
  const hooksPorPrefixo = new Map(
    listarHooks().map((h) => [h.prefixo, h.nome] as const),
  );

  const liberado = ultima?.resultado?.efeito === "libera";
  const bloqueado = ultima?.resultado?.efeito === "recusa";
  const analise = ultima?.resultado?.tipo === "pendente_validacao" || ultima?.resultado?.tipo === "revalidar";

  // Mesmo selo do motorista, vocabulário do balcão: quem está aqui decide se
  // monta o pedido, não se "está elegível".
  const tom: Tom = liberado ? "go" : bloqueado ? "stop" : analise ? "espera" : "neutro";
  const veredito = liberado
    ? { titulo: "Pedido liberado", texto: "Pode montar agora, no modelo que o motorista escolher." }
    : bloqueado
      ? { titulo: "Pedido bloqueado", texto: "Não dá para registrar este pedido. O motivo abaixo é o que explicar ao motorista." }
      : analise
        ? { titulo: "Aguardando análise", texto: "A central está conferindo o cadastro. Nada a fazer até ela responder." }
        : {
            titulo: "Sem jornada concluída",
            texto:
              "Este CPF ainda não respondeu à pesquisa. Envie o link antes de montar o pedido.",
          };

  /*
   * Critérios da pesquisa, tirados da regra que concede elegibilidade no
   * versão ativa. Não há texto escrito à mão: mudou a regra, muda a frase.
   */
  const pesquisaDaSessao = pesquisas.find((p) => p.id === ultima?.pesquisaId) ?? pesquisas[0];
  // Rótulos que os hooks declararam; o que não estiver lá cai na regra mecânica.
  const rotulos = mapaDeRotulos(listarHooks());
  const versaoQueDecide = pesquisaDaSessao ? versaoAtivaDaPesquisa(pesquisaDaSessao) : undefined;
  const criterios = versaoQueDecide ? criteriosLegiveis(versaoQueDecide, rotulos, desfechosDa(pesquisaDaSessao!)) : [];

  // Os mesmos números que o motorista viu no fim da jornada.
  const numeros = fatosColetados
    // Com o prefixo: é ele que casa com o rótulo declarado pelo hook.
    .flatMap(([prefixo, campos]) =>
      Object.entries(campos).map(([k, v]) => [`${prefixo}.${k}`, v] as [string, unknown]),
    )
    .filter(([k, v]) => !k.endsWith(".encontrado") && !k.endsWith(".erro") && typeof v === "number")
    .slice(0, 3);

  /*
   * O que sobra depois do que a tela já mostra: fora os campos de controle, os
   * números que viraram cartão grande e o nome que virou título. O corte é por
   * chave, e não por posição, porque os cartões pegam os três primeiros
   * numéricos quaisquer que sejam — um quarto número novo cai aqui sozinho.
   */
  const jaNaTela = new Set(numeros.map(([k]) => k));
  const controle = new Set(["encontrado", "erro", "nome"]);
  const restantes = fatosColetados
    .map(([prefixo, campos]) => ({
      prefixo,
      // O grupo leva o nome que o gestor deu ao hook, não o prefixo técnico.
      titulo: hooksPorPrefixo.get(prefixo) ?? prefixo,
      campos: Object.entries(campos).filter(
        ([k]) => !controle.has(k) && !jaNaTela.has(`${prefixo}.${k}`),
      ),
    }))
    .filter((g) => g.campos.length > 0);

  return (
    <ShellFluxo
      area={{ label: "Vendedor", href: "/vendedor" }}
      seletorDeUsuario
      /* Sem migalha e sem `title`: o cartão do motorista é o h1 da tela, e a
         migalha repetia o CPF que já está nele e na barra de endereço. A volta
         para `/vendedor` é o clique na marca, que todo o produto já usa. */
    >
      <EsperaDaConsulta nome={typeof nomeDoRespondente === "string" ? nomeDoRespondente : undefined} />

      {/*
       * O veredito é apresentado com as mesmas peças da tela do motorista:
       * cartão do assunto, selo, título colorido, motivo e os números que
       * pesaram. Antes era uma faixa de semáforo — o mesmo fato numa segunda
       * linguagem, e nenhuma conversa possível entre quem responde e quem
       * atende. O que muda aqui é só o vocabulário: o motorista lê sobre a
       * condição dele, o vendedor lê sobre o pedido que pode ou não montar.
       */}
      <div className="mb-10">
        <CartaoPesquisa
          rotulo="Motorista"
          nome={String(nomeDoRespondente ?? cpf)}
          /* Só repete o CPF embaixo quando o nome está no lugar do nome —
             senão o cartão mostraria o mesmo número duas vezes. */
          sub={nomeDoRespondente ? cpf : undefined}
        />
        <Veredito tom={tom} titulo={veredito.titulo} texto={liberado ? undefined : veredito.texto} />

        {/*
         * No caminho liberado, uma frase só: os critérios da pesquisa, vindos da
         * regra. Antes eram duas — uma dizendo ao vendedor o que ele podia
         * fazer, outra sendo o `motivo` do motor, escrito na segunda pessoa
         * para quem responde ("Você atende aos critérios"). No balcão, essa
         * segunda pessoa é a errada.
         */}
        {/*
         * Liberado na análise manual não é liberado pelos critérios.
         *
         * A frase dos critérios estava sendo escrita para todo caso liberado, e
         * num caso que a Central liberou na mão ela afirma no balcão uma coisa
         * que não aconteceu: o motor tinha segurado justamente por não conseguir
         * confirmar esses critérios. Aqui vale o motivo de quem decidiu.
         */}
        {liberado ? (
          ultima?.tratamento ? (
            <p className="text-base text-ink-800 mt-8">
              Liberado na análise manual por {nomeDeUsuario(ultima.tratamento.por).nome}:{" "}
              <strong className="font-semibold">{ultima.tratamento.motivo}</strong>
            </p>
          ) : (
            criterios.length > 0 && (
              <p className="text-base text-ink-800 mt-8">
                O motorista atende aos critérios necessários:{" "}
                <strong className="font-semibold">{criterios.join(" · ")}</strong>.
              </p>
            )
          )
        ) : (
          ultima?.resultado && (
            <p className="text-base text-ink-800 mt-8">{ultima.resultado.motivo}</p>
          )
        )}

        <CartoesNumericos numeros={numeros} rotulos={rotulos} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {liberado && (
            <Card>
              <h3 className="text-lg font-semibold tracking-tight mb-4">Montar pedido</h3>
              <CriarPedidoForm
                cpf={cpf}
                vendedor={eu.nome}
                concessionaria={eu.concessionaria ?? ""}
                /*
                 * Os modelos saem das opções da própria pergunta de modelo.
                 *
                 * Já foram um campo de texto paralelo, escrito à mão na
                 * configuração da pesquisa — duas listas para manter iguais, e
                 * um erro de grafia na chave esvaziava este seletor sem avisar
                 * ninguém. O que a pessoa escolhe na jornada é o que o balcão
                 * oferece: um dado, uma origem.
                 */
                pesquisas={pesquisas.map((p) => ({
                  id: p.id,
                  nome: p.nome,
                  modelos: modelosOferecidos(p.blocos),
                }))}
              />
            </Card>
          )}


          {!liberado && !ultima && (
            <Card>
              <h3 className="text-lg font-semibold tracking-tight mb-3">Enviar pesquisa ao motorista</h3>
              <div className="space-y-2">
                {pesquisas.map((p) => (
                  <Link
                    key={p.id}
                    href={`/motorista/jornada?pesquisa=${p.id}&cpf=${encodeURIComponent(cpf)}`}
                    /* Papel branco com realce cinza no hover, igual às linhas de
                       tabela. O `bg-ink-100` de antes era a mesma faixa bege
                       que saiu do cabeçalho das tabelas. */
                    className="flex items-center justify-between border hairline-strong bg-ink-0 hover:bg-ink-200/40 px-4 py-3 transition"
                  >
                    <span>{p.nome}</span>
                    <span className="text-xs text-ink-600">
                      {modelosOferecidos(p.blocos).join(" · ") || "abrir"} →
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {bloqueado && (
            <Card>
              <h3 className="text-lg font-semibold tracking-tight mb-3">O que fazer agora</h3>
              <ul className="text-sm text-ink-700 space-y-2">
                <li>• Não é possível registrar este pedido.</li>
                <li>• Explique o critério ao motorista com os números reais abaixo.</li>
                <li>• Se houver erro nos dados, encaminhe à Central para revalidação.</li>
              </ul>
              <LinkButton href="/gestor/central" variant="secondary" className="mt-5">Abrir Central</LinkButton>
            </Card>
          )}

          <Card>
            <h3 className="text-lg font-semibold tracking-tight mb-4">Histórico de pedidos</h3>
            {pedidos.length === 0 ? (
              <div className="text-sm text-ink-600">Nenhum pedido registrado para este CPF.</div>
            ) : (
              <div className="space-y-2">
                {pedidos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border hairline px-4 py-3">
                    <div>
                      <div className="text-sm">{p.modelo} · {p.concessionaria}</div>
                      <div className="text-xs text-ink-600 mono">{p.id} · {p.criadoEm.slice(0, 10)}</div>
                    </div>
                    <Badge tone={p.status === "bloqueado" ? "stop" : "go"}>
                      {ROTULO_PEDIDO_STATUS[p.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/*
           * O que a consulta trouxe e ainda não está na tela.
           *
           * Os três números que viraram cartão grande e o nome que virou título
           * do cartão azul saem daqui — repetidos, eles enchiam a coluna de eco
           * e empurravam para baixo o que só existe aqui: cidade, status,
           * restrição. O nome do campo passa pela mesma regra de rótulo que a
           * frase dos critérios usa, então `mesesUber` nunca aparece cru.
           *
           * A tela continua sem conhecer base nenhuma por nome: o título de cada
           * grupo é o nome que o gestor deu ao hook.
           */}
          <Card>
            <h3 className="text-sm font-semibold">Dados coletados</h3>
            {restantes.length > 0 ? (
              <div className="mt-4 space-y-4">
                {restantes.map(({ prefixo, titulo, campos }) => (
                  <div key={prefixo}>
                    <div className="text-xs text-ink-600 mb-1.5">{titulo}</div>
                    <dl className="text-sm space-y-1.5">
                      {campos.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <dt className="text-ink-600">{rotularFato(`${prefixo}.${k}`, rotulos)}</dt>
                          <dd className="text-right">{legivel(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-700 mt-3">
                {ultima
                  ? "Esta jornada não guardou os dados consultados."
                  : "Nenhuma consulta foi feita para este CPF ainda."}
              </p>
            )}
          </Card>

        </div>
      </div>
    </ShellFluxo>
  );
}
