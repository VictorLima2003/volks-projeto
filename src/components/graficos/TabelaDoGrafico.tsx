import { numero, percentual } from "./paleta";

/**
 * A gêmea em tabela de todo gráfico.
 *
 * Existe por uma regra simples: **nenhum valor pode depender de enxergar cor ou
 * de passar o mouse**. Quem usa leitor de tela, quem imprime, quem não distingue
 * dois matizes e quem só quer copiar o número para uma planilha chegam todos
 * aqui — e chegam ao mesmo dado que o desenho mostra, não a um resumo dele.
 *
 * Fechada por padrão, num `<details>`: é alternativa, não segunda cópia do
 * conteúdo ocupando a tela de quem já leu o gráfico. Sem JavaScript, porque o
 * navegador já sabe abrir e fechar isto sozinho.
 */
export function TabelaDoGrafico({
  colunas,
  linhas,
  rotulo = "Ver os números",
}: {
  colunas: string[];
  linhas: (string | number)[][];
  rotulo?: string;
}) {
  if (linhas.length === 0) return null;

  return (
    <details className="mt-5 group">
      <summary
        className="text-sm text-ink-600 cursor-pointer list-none inline-flex items-center gap-1.5
                   hover:text-vw-deep transition rounded-sm
                   outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
      >
        <span aria-hidden className="transition-transform group-open:rotate-90">
          ›
        </span>
        {rotulo}
      </summary>

      <div className="mt-3 overflow-x-auto border hairline rounded-sm">
        <table className="w-full text-sm">
          <thead className="bg-ink-200 border-b hairline-strong">
            <tr>
              {colunas.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={`font-semibold text-ink-700 px-3 py-2 ${i === 0 ? "text-left" : "text-right"}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => (
              <tr key={i} className="border-t hairline">
                {linha.map((celula, j) => (
                  <td
                    key={j}
                    className={
                      j === 0
                        ? "px-3 py-2 text-ink-800"
                        : /* `mono` aqui é tabular-nums, e é onde ele serve: coluna
                             de número que precisa alinhar na vertical. */
                          "px-3 py-2 text-right mono text-ink-900"
                    }
                  >
                    {typeof celula === "number" ? numero(celula) : celula}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** As linhas de uma distribuição, prontas para a tabela. */
export function linhasDeDistribuicao(
  fatias: { rotulo: string; n: number; fracao: number }[],
): (string | number)[][] {
  return fatias.map((f) => [f.rotulo, f.n, percentual(f.fracao)]);
}
