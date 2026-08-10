import { ShellFluxo } from "@/components/ShellFluxo";
import { BotaoCopiar } from "./copiar";

/**
 * Saiu da home do motorista: é ferramenta de quem testa o produto, não conteúdo
 * de quem responde a pesquisa. Quem responde não tem por que ver CPF de terceiro.
 *
 * Os dados vêm de `parceiros.csv` e `restricoes.csv` no seed, e o desfecho segue
 * a regra ativa do RuleSet v1: 6 meses ou mais, 500 corridas ou mais, conta ativa.
 */
const documentos = [
  {
    cpf: "111.222.333-44",
    dados: "14 meses de app, 2.380 corridas, conta ativa, sem restrição de crédito",
    desfecho: "Passa",
    acento: "bg-signal-go",
  },
  {
    cpf: "666.777.888-99",
    dados: "18 meses de app, 3.010 corridas, conta ativa, sem restrição de crédito",
    desfecho: "Passa",
    acento: "bg-signal-go",
  },
  {
    cpf: "555.666.777-88",
    dados: "7 meses de app, 480 corridas, conta ativa",
    desfecho: "Barra por 20 corridas",
    acento: "bg-signal-stop",
  },
  {
    cpf: "444.555.666-77",
    dados: "4 meses de app, 320 corridas, com restrição de crédito",
    desfecho: "Barra por tempo, por corridas e por crédito",
    acento: "bg-signal-stop",
  },
  {
    cpf: "777.888.999-00",
    dados: "11 meses de app, 900 corridas, conta suspensa, com restrição de crédito",
    desfecho: "Barra pela conta suspensa",
    acento: "bg-signal-stop",
  },
  {
    cpf: "999.888.777-66",
    dados: "Não consta na base de parceiros",
    desfecho: "Cai na análise manual",
    acento: "bg-signal-warn",
  },
];

export default function Documentos() {
  return (
    <ShellFluxo area={{ label: "Motorista", href: "/motorista" }} largura="larga">
      <div className="max-w-2xl">
        <h1 className="display text-4xl">CPFs para testar</h1>
        <p className="text-lg text-ink-700 mt-6">
          Cada CPF desta lista leva o motor a uma decisão diferente. Copie um e cole na tela
          inicial da jornada.
        </p>
      </div>

      <ul className="mt-12">
        {documentos.map((d) => (
          <li
            key={d.cpf}
            className="grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,20rem)_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 border-t hairline py-5"
          >
            <span aria-hidden className={`h-6 w-1 ${d.acento}`} />

            <div className="min-w-0">
              <div id={`cpf-${d.cpf}`} className="mono text-lg text-ink-900">
                {d.cpf}
              </div>
              <div className="text-sm text-ink-900 md:hidden mt-0.5">{d.desfecho}</div>
            </div>

            <div className="col-start-2 md:col-start-3">
              <div className="text-base text-ink-900 hidden md:block">{d.desfecho}</div>
              <div className="text-sm text-ink-600 md:mt-0.5">{d.dados}</div>
            </div>

            <div className="col-start-2 md:col-start-4 justify-self-start md:justify-self-end">
              <BotaoCopiar valor={d.cpf} alvoId={`cpf-${d.cpf}`} />
            </div>
          </li>
        ))}
      </ul>
    </ShellFluxo>
  );
}
