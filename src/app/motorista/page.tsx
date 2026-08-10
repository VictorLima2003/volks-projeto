import { FundoDobra } from "@/components/FundoDobra";
import { MarcaCabecalho } from "@/components/MarcaCabecalho";
import { PadraoPontos } from "@/components/PadraoPontos";
import { ShellFluxo } from "@/components/ShellFluxo";
import { listarCampanhas } from "@/lib/store";
import { notFound } from "next/navigation";
import { IniciarJornadaForm } from "./iniciar-form";

export const dynamic = "force-dynamic";

/**
 * Home do respondente, com escopo de UMA campanha.
 *
 * A campanha chega pelo link que o gestor compartilha (`?campanha=<id>`, o mesmo
 * que a tela da campanha exibe como "Link de teste") e dá o título da página.
 * Antes ela era um seletor dentro do formulário, o que pedia a quem responde uma
 * decisão que é do gestor.
 *
 * Forma: a dobra é uma faixa só, toda em gradiente, ocupando a tela inteira. Não
 * há barra de cabeçalho — a marca mora dentro da própria dobra, porque uma faixa
 * branca acima roubaria altura para repetir o que já está lá dentro.
 */

/** "T-Cross, Nivus ou Polo Track" — a lista fecha com "ou", que é como se fala. */
function listar(modelos: string[]) {
  if (modelos.length <= 1) return modelos[0] ?? "";
  return `${modelos.slice(0, -1).join(", ")} ou ${modelos[modelos.length - 1]}`;
}

export default function MotoristaHome({
  searchParams,
}: {
  searchParams: { campanha?: string };
}) {
  const abertas = listarCampanhas().filter(
    (c) => c.status === "ativa" || c.status === "rascunho",
  );
  const campanha = searchParams.campanha
    ? abertas.find((c) => c.id === searchParams.campanha)
    : abertas[0];

  if (!campanha) notFound();

  return (
    <ShellFluxo
      area={{ label: "Motorista", href: "/motorista" }}
      cabecalho={false}
      rodapeColado
      topo={
        // Tela cheia menos o rodapé (5rem). A dobra passou a ser a página
        // inteira quando o "Como funciona" saiu: antes ela media 78% para deixar
        // aparecer um pedaço da seção seguinte, que era o aviso de que a página
        // continuava. Sem seção seguinte, aquele pedaço virava faixa branca
        // pendurada acima do rodapé, prometendo conteúdo que não existe.
        //
        // `svh` e não `vh`: no celular a barra de endereço some e volta, e `vh`
        // mede a altura sem ela, o que cortaria a dobra até a pessoa rolar.
        // O `1px` do cálculo é o filete do rodapé: sem descontá-lo sobra
        // exatamente essa altura de rolagem, e página que rola 1px é página que
        // rola.
        <section className="bg-profundo text-ink-0 min-h-[calc(100svh-5rem-1px)] flex flex-col relative">
          {/*
           * Trama de pontos, sutil. Sem modo de mesclagem: `soft-light` com
           * branco sobre navy escuro levanta tão pouco que a trama sumia. A
           * opacidade direta é previsível e chega no mesmo lugar.
           *
           * A máscara elíptica apaga a trama subindo — ela vive no pé da dobra,
           * longe do título e do cartão, que é o que a mantém decoração.
           */}
          <FundoDobra />
          <PadraoPontos
            className="fill-ink-0/[0.14] [mask-image:radial-gradient(110%_90%_at_50%_115%,black_25%,transparent_70%)]"
          />
          {/* `relative` nos irmãos: um `absolute` pinta acima de filho não
              posicionado, então sem isto a trama passaria por cima do texto. */}
          <div className="entra relative max-w-7xl mx-auto px-6 w-full pt-7">
            <MarcaCabecalho href="/motorista" rotulo="Motorista" tom="claro" />
          </div>

          <div className="relative flex-1 flex items-center">
            {/* Respiro menor no celular. Não é preferência: numa coluna só, o
                título grande mais o cartão já passam da altura da tela, e a
                folga de desktop empurrava a home para 52px de rolagem que não
                levavam a lugar nenhum além do rodapé. */}
            <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-12 gap-x-12 gap-y-8 lg:gap-y-12 items-center py-6 lg:py-10">
              {/* `data-sai`: os dois blocos que a saída anima antes de navegar. */}
              <div data-sai className="lg:col-span-7">
                <h1 className="entra display text-5xl text-ink-0" style={{ animationDelay: "80ms" }}>
                  {listar(campanha.modelos)} na condição de motorista
                </h1>
                <p className="entra text-lg mt-6 lg:mt-8 max-w-2xl text-azul-100" style={{ animationDelay: "170ms" }}>
                  Você dirige por aplicativo e a Volkswagen já tem os dados que precisa conferir.
                  Digite seu CPF e veja a resposta nesta mesma tela.
                </p>
              </div>

              <div data-sai className="lg:col-span-5">
                {/*
                 * Sem trilha de passos aqui. O CPF é a porta de entrada, não o
                 * passo 1 de N: o número de perguntas depende do que os hooks
                 * trouxerem, e a jornada conta 3 ou 5 conforme o caminho. Um
                 * "passo 1 de 4" no cartão prometia um total que a tela
                 * seguinte contradiz.
                 */}
                <div className="entra bg-ink-0 border hairline rounded-md p-6 lg:p-8 shadow-lift" style={{ animationDelay: "260ms" }}>
                  <h2 className="text-xl font-semibold tracking-tight mb-6">Comece pelo CPF</h2>
                  <IniciarJornadaForm campanhaId={campanha.id} />
                </div>
              </div>
            </div>
          </div>
        </section>
      }
    />
  );
}
