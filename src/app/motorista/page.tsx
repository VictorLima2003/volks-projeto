import { capaEhClara, FundoDaCapa } from "@/components/FundoDaCapa";
import { MarcaCabecalho } from "@/components/MarcaCabecalho";
import { ShellFluxo } from "@/components/ShellFluxo";
import { podePropor } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";
import { listarPesquisas } from "@/lib/store";
import { APRESENTACAO_PADRAO, PesquisaStatus } from "@/lib/types";
import { notFound } from "next/navigation";
import { ConviteJornada, IniciarJornadaForm } from "./iniciar-form";

export const dynamic = "force-dynamic";

/**
 * Home do respondente, com escopo de UMA pesquisa.
 *
 * A pesquisa chega pelo link que o gestor compartilha (`?pesquisa=<id>`) e dá o
 * título da página. Antes era um seletor dentro do formulário, o que pedia a
 * quem responde uma decisão que é do gestor.
 *
 * O título e o texto saem do dado — a chamada e a descrição da pesquisa —
 * porque são copy do caso de uso. Uma pesquisa de satisfação usa a mesma tela
 * sem precisar de um `if` novo aqui dentro.
 *
 * Forma: a dobra é uma faixa só, toda em gradiente, ocupando a tela inteira. Não
 * há barra de cabeçalho — a marca mora dentro da própria dobra, porque uma faixa
 * branca acima roubaria altura para repetir o que já está lá dentro.
 */

export default function MotoristaHome({
  searchParams,
}: {
  searchParams: { pesquisa?: string; previa?: string };
}) {
  /*
   * A situação é a porta, e não um rótulo.
   *
   * Antes esta tela aceitava `ativa` **e** `rascunho`: quem tivesse o link de um
   * rascunho respondia normalmente, e "No ar" não trancava nada. Agora só a
   * pesquisa publicada responde — as outras dizem o que aconteceu, em vez do
   * 404 seco que era a resposta para pausada e encerrada.
   */
  const todas = listarPesquisas();
  const pesquisa = searchParams.pesquisa
    ? todas.find((p) => p.id === searchParams.pesquisa)
    : todas.find((p) => p.status === "ativa");

  if (!pesquisa) notFound();

  /*
   * A prévia é pedida na URL, não deduzida de quem está olhando.
   *
   * A tentação era liberar para quem tem papel de propor — só que aqui o
   * usuário sem cookie **é** a gestora padrão, e a trava não trancaria nada. Com
   * `?previa=1`, o link que se compartilha continua sendo o link de verdade, e
   * ver antes de publicar é uma escolha deliberada de quem monta.
   */
  const quem = usuarioAtual();
  const previa = searchParams.previa === "1" && !!quem && podePropor(quem);

  if (pesquisa.status !== "ativa" && !previa) {
    return <ForaDoAr status={pesquisa.status} />;
  }

  /* Pesquisa criada antes de a capa existir não tem o campo — e continua
     abrindo, no formato que ela sempre teve. */
  const capa = pesquisa.apresentacao ?? APRESENTACAO_PADRAO;
  /* Fundo claro pede texto escuro — e a marca também vira. */
  const claro = capaEhClara(capa.fundo);

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
        <section
          className={`bg-profundo min-h-[calc(100svh-5rem-1px)] flex flex-col relative ${
            claro ? "text-ink-900" : "text-ink-0"
          }`}
        >
          {previa && (
            <div className="relative z-10 bg-signal-warn/95 text-ink-900 text-center text-sm font-semibold py-2 px-4">
              Prévia · esta pesquisa não está no ar. Quem não é do time vê um aviso no lugar dela.
            </div>
          )}

          {/* A camada decorativa vem do catálogo, escolhida no fluxo. O azul de
              baixo é da seção e não muda: é ele que segura a leitura quando o
              fundo escolhido é WebGL e o WebGL não sobe. */}
          <FundoDaCapa fundo={capa.fundo} />
          {/* `relative` nos irmãos: um `absolute` pinta acima de filho não
              posicionado, então sem isto a trama passaria por cima do texto. */}
          <div className="entra relative max-w-7xl mx-auto px-6 w-full pt-7">
            <MarcaCabecalho href="/motorista" rotulo="Motorista" tom={claro ? "escuro" : "claro"} />
          </div>

          <div className="relative flex-1 flex items-center">
            {/* Respiro menor no celular. Não é preferência: numa coluna só, o
                título grande mais o cartão já passam da altura da tela, e a
                folga de desktop empurrava a home para 52px de rolagem que não
                levavam a lugar nenhum além do rodapé. */}
            <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-12 gap-x-12 gap-y-8 lg:gap-y-12 items-center py-6 lg:py-10">
              {/* `data-sai`: os dois blocos que a saída anima antes de navegar. */}
              <div data-sai className="lg:col-span-7">
                <h1
                  className={`entra display text-5xl ${claro ? "text-ink-900" : "text-ink-0"}`}
                  style={{ animationDelay: "80ms" }}
                >
                  {pesquisa.chamada ?? pesquisa.nome}
                </h1>
                {/* `azul-100` sobre o navy, `ink-700` sobre o branco: os dois são
                    o degrau de apoio da sua base, e nenhum fica abaixo do piso
                    de contraste. */}
                <p
                  className={`entra text-lg mt-6 lg:mt-8 max-w-2xl ${
                    claro ? "text-ink-700" : "text-azul-100"
                  }`}
                  style={{ animationDelay: "170ms" }}
                >
                  {pesquisa.descricao}
                </p>
              </div>

              <div data-sai className="lg:col-span-5">
                {/*
                 * Sem trilha de passos aqui. A identificação é a porta de
                 * entrada, não o passo 1 de N: o número de perguntas depende do
                 * que os hooks trouxerem, e a jornada conta 3 ou 5 conforme o
                 * caminho. Um "passo 1 de 4" no cartão prometia um total que a
                 * tela seguinte contradiz.
                 */}
                <div className="entra bg-ink-0 border hairline rounded-md p-6 lg:p-8 shadow-lift" style={{ animationDelay: "260ms" }}>
                  {/* Sem identificador não há onde guardar a resposta — o
                      cartão vira convite em vez de colher um dado que some. */}
                  {capa.entrada === "convite" ||
                  !capa.pergunta?.campo.trim() ||
                  !capa.pergunta?.rotulo.trim() ? (
                    <ConviteJornada
                      pesquisaId={pesquisa.id}
                      rotulo={capa.rotuloDoConvite}
                      previa={previa}
                    />
                  ) : (
                    /* O título do cartão é o enunciado da pergunta. Enquanto era
                       "Comece pelo CPF" fixo, trocar a pergunta para e-mail
                       deixava um título mentindo em cima do campo certo. */
                    <IniciarJornadaForm
                      pesquisaId={pesquisa.id}
                      pergunta={capa.pergunta}
                      previa={previa}
                    />
                  )}

                  {/*
                   * A nota fica no cartão, e não dentro de cada uma das duas
                   * entradas: ela vale igual para quem digita um dado e para
                   * quem só clica em começar, e escrita uma vez não tem como as
                   * duas versões divergirem.
                   *
                   * `ink-600` é o piso de contraste do sistema. Neste corpo o
                   * piso não é folga: 10px é o menor tamanho da interface e
                   * qualquer tom mais claro sai de 4.5:1.
                   */}
                  <p className="mt-4 text-[10px] leading-relaxed text-ink-600">
                    Ao prosseguir, você concorda com os termos de uso e a política de privacidade.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      }
    />
  );
}

/**
 * A tela de quem chega por um link que não está mais respondendo.
 *
 * Ela existe porque o 404 mentia: quem recebeu o link de uma pesquisa que
 * encerrou não errou o endereço, e a diferença entre "não existe" e "acabou"
 * é a única coisa que essa pessoa precisa saber.
 *
 * Sem o nome da pesquisa: o link pode ter vazado, e o nome interno de um
 * rascunho não é assunto de quem está do lado de fora.
 */
function ForaDoAr({ status }: { status: PesquisaStatus }) {
  const texto =
    status === "encerrada"
      ? "Esta pesquisa foi encerrada e não recebe mais respostas. Se você respondeu antes do fim, sua resposta continua valendo."
      : "Esta pesquisa não está recebendo respostas agora. Se você recebeu o link de alguém da Volkswagen, vale confirmar com quem enviou.";

  return (
    <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="estreita" rodapeColado>
      <div className="py-16">
        <h1 className="display text-3xl">
          {status === "encerrada" ? "Esta pesquisa terminou" : "Esta pesquisa está fora do ar"}
        </h1>
        <p className="text-lg text-ink-700 mt-5 max-w-xl">{texto}</p>
      </div>
    </ShellFluxo>
  );
}
