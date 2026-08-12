import { FundoDobra } from "./FundoDobra";
import { PadraoPontos } from "./PadraoPontos";
import { FundoDaCapa as FundoId } from "@/lib/types";

/**
 * O catálogo de fundos da capa da pesquisa.
 *
 * Um componente só, escolhendo por nome — e não quatro telas de entrada. A capa
 * inteira continua sendo uma seção; o que muda é a camada decorativa que ela
 * pinta por baixo do texto.
 *
 * Todas as opções vivem sobre `bg-profundo`, que fica na seção. Isso não é
 * detalhe: as persianas são WebGL e podem não inicializar (GPU bloqueada,
 * contexto esgotado, navegador antigo), e o azul de baixo é o que segura a
 * legibilidade quando isso acontece.
 */

/* O catálogo é dado puro e vive em `lib/fundos`; aqui ficam só as camadas. */
export { FUNDOS, capaEhClara } from "@/lib/fundos";

export function FundoDaCapa({
  fundo,
  miniatura = false,
}: {
  fundo: FundoId;
  /** Prévia no painel: o holofote das persianas para de seguir o cursor. */
  miniatura?: boolean;
}) {
  if (fundo === "liso") return null;

  if (fundo === "malha") {
    /*
     * A única capa clara: grade fina e um brilho no canto.
     *
     * A grade usa `--line`, o mesmo filete de todas as bordas do sistema, e o
     * brilho é o azul-400 da escala — não uma cor nova. A forma veio de um
     * padrão conhecido de fundo (grade + clarão radial); as cores, daqui.
     *
     * O branco é da própria camada, e não da seção: assim a seção continua
     * `bg-profundo` e uma capa clara que falhe ao pintar cai num azul legível,
     * em vez de deixar texto claro sobre branco.
     */
    return (
      <div aria-hidden className="absolute inset-0 pointer-events-none bg-ink-0">
        <div
          className="absolute inset-0
                     bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)]
                     bg-[size:6rem_4rem]"
        />
        {/* Raio em porcentagem, não em pixels: assim o clarão ocupa a mesma
            fração da área na página e na miniatura do painel. Com os 800px do
            padrão de origem, a prévia de 250px virava um retângulo azul inteiro
            e prometia uma capa que a tela cheia não entrega. */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_110%_at_100%_15%,rgba(98,140,215,0.32),transparent_70%)]" />
      </div>
    );
  }

  if (fundo === "trama") {
    /* Sem máscara subindo, ao contrário da capa de persianas: aqui a trama é o
       fundo inteiro, e não o rodapé de outra coisa. A opacidade baixa é o que a
       mantém atrás do texto. */
    return <PadraoPontos espaco={26} className="fill-ink-0/[0.10]" />;
  }

  if (fundo === "gradiente") {
    return (
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none
                   bg-[radial-gradient(120%_90%_at_15%_0%,rgba(98,140,215,0.55),transparent_62%)]"
      />
    );
  }

  return (
    <>
      <FundoDobra holofoteFixo={miniatura} />
      <PadraoPontos className="fill-ink-0/[0.14] [mask-image:radial-gradient(110%_90%_at_50%_115%,black_25%,transparent_70%)]" />
    </>
  );
}
