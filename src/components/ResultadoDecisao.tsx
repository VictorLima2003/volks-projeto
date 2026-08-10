import { rotularFato } from "@/lib/engine";
import { PadraoPontos } from "./PadraoPontos";
import { cn } from "./ui";

/**
 * Peças da tela de veredito, compartilhadas entre a jornada do motorista e a
 * consulta do vendedor.
 *
 * Os dois olham para a mesma decisão do motor, cada um do seu lado do balcão.
 * Enquanto cada tela desenhava o resultado do seu jeito, o vendedor via uma
 * faixa de semáforo e quem respondeu via um cartão de campanha — o mesmo fato,
 * em duas linguagens, e nenhuma conversa possível entre as duas pessoas.
 */

export type Tom = "go" | "stop" | "espera" | "neutro";

/**
 * Selo do veredito, acima do título.
 *
 * O do sucesso se desenha; os outros entram prontos. Movimento é reforço, e
 * reforçar "ainda não deu" com animação de chegada seria comemorar a recusa.
 *
 * O de "não deu certo" **não é um X**. X é veredito final, e este não é: os
 * critérios são de tempo e de corridas, coisas que a pessoa acumula. A seta em
 * círculo diz o que a tela diz por escrito, que é voltar depois.
 */
export function SeloResultado({ tom }: { tom: Tom }) {
  const cor = {
    go: "text-signal-go",
    stop: "text-signal-stop",
    espera: "text-ink-900",
    neutro: "text-ink-900",
  }[tom];

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("w-8 h-8 shrink-0", cor)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {tom === "go" && (
        <>
          <circle cx="12" cy="12" r="9" pathLength={1} className="selo-traco" />
          {/* O tique começa quando o anel está quase fechando: desenhar os dois
              juntos vira rabisco, e em sequência lê como carimbo. */}
          <path
            d="M8 12.4l2.7 2.7L16.4 9.4"
            pathLength={1}
            className="selo-traco"
            style={{ animationDelay: "420ms" }}
          />
        </>
      )}
      {tom === "stop" && (
        <>
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </>
      )}
      {tom === "espera" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5.2l3.4 2" />
        </>
      )}
      {/* Fim de caminho que não é sucesso, nem falha, nem espera: só é assim.
          O relógio prometeria que alguém está analisando, e não está. */}
      {tom === "neutro" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5.4" />
          <path d="M12 7.6v.1" />
        </>
      )}
    </svg>
  );
}

/**
 * A campanha, em cartão de gradiente com a trama de pontos.
 *
 * Vem antes do veredito e é o título maior da tela: a campanha é o assunto, e o
 * veredito é o que aconteceu dentro dela.
 */
export function CartaoCampanha({
  nome,
  rotulo = "Campanha",
  sub,
}: {
  nome: string;
  rotulo?: string;
  /** Linha de identificação abaixo do nome — o CPF, na consulta do vendedor. */
  sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-md bg-sinal text-ink-0 px-7 py-7">
      <PadraoPontos
        /* A trama vive no canto escuro do gradiente. Do lado claro, pontos
           brancos a 20% somem e o cartão parece liso. */
        className="fill-ink-0/[0.2] [mask-image:radial-gradient(110%_120%_at_0%_100%,black_15%,transparent_70%)]"
      />
      <div className="relative">
        {/* "Sua campanha" seria bajulação: ninguém escolheu campanha nenhuma, a
            pessoa clicou num link. E no caminho do não elegível o possessivo
            viraria mentira. */}
        <div className="text-sm text-azul-100">{rotulo}</div>
        <h1 className="display text-3xl md:text-4xl mt-1.5 text-ink-0">{nome}</h1>
        {sub && <div className="mono text-base text-azul-100 mt-2">{sub}</div>}
      </div>
    </div>
  );
}

/**
 * Veredito: selo, título colorido e o texto de apoio.
 *
 * Exceção declarada à regra de título sempre navy — ela vale porque o veredito
 * não é o h1 da tela: virou legenda do cartão da campanha, e a cor passou a
 * fazer o trabalho que a hierarquia de tamanho não faz mais.
 */
export function Veredito({
  tom,
  titulo,
  texto,
}: {
  tom: Tom;
  titulo: string;
  texto?: string;
}) {
  const cor = { go: "text-signal-go", stop: "text-signal-stop", espera: "", neutro: "" }[tom];
  return (
    <>
      <div className="mt-8">
        <SeloResultado tom={tom} />
        <h2 className={cn("display text-2xl md:text-3xl mt-4", cor)}>{titulo}</h2>
      </div>
      {texto && <p className="text-lg text-ink-700 mt-5">{texto}</p>}
    </>
  );
}

/**
 * Números que pesaram na decisão, em cartões só de traço. Quais são, o motor não
 * sabe: são os fatos numéricos que os hooks trouxerem.
 */
export function CartoesNumericos({
  numeros,
  rotulos = {},
}: {
  numeros: [string, unknown][];
  /** Rótulos declarados pelos hooks, por caminho de fato. */
  rotulos?: Record<string, string>;
}) {
  if (numeros.length === 0) return null;
  return (
    <div
      className={cn(
        "mt-8 grid gap-4",
        numeros.length >= 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2",
      )}
    >
      {numeros.map(([k, v]) => (
        <div key={k} className="border hairline rounded-md px-5 py-5">
          <div className="display text-3xl">{Number(v).toLocaleString("pt-BR")}</div>
          <div className="text-sm text-ink-600 mt-1.5">{rotularFato(k, rotulos)}</div>
        </div>
      ))}
    </div>
  );
}
