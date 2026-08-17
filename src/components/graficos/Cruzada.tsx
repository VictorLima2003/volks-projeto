import { Cruzamento } from "@/lib/analise";
import { numero, percentual } from "./paleta";

/**
 * Tabela de duas entradas, com a célula tingida pela intensidade.
 *
 * É tabela de verdade (`<table>` com `<th scope>`), não um grid de `div`
 * pintado: quem navega por leitor de tela precisa ouvir "linha X, coluna Y,
 * 14", e isso o navegador só entrega se a marcação disser que é tabela.
 *
 * O tingimento é um azul só com opacidade variável — escala de cor com matiz
 * mudando (verde → amarelo → vermelho) diria que os valores altos são ruins, e
 * aqui eles são só altos.
 */
export function Cruzada({
  dados,
  rotuloLinha,
  rotuloColuna,
  base = "linha",
}: {
  dados: Cruzamento;
  rotuloLinha: string;
  rotuloColuna: string;
  /** Sobre o que o percentual é calculado — muda a pergunta que a tabela responde. */
  base?: "linha" | "total";
}) {
  if (dados.total === 0) {
    return <p className="text-sm text-ink-600">Nada para cruzar neste recorte.</p>;
  }

  const maiorCelula = Math.max(1, ...dados.celulas.flat());

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">
          {rotuloLinha} por {rotuloColuna}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="text-left font-semibold text-ink-700 px-3 py-2.5 border-b-2 hairline-strong"
            >
              {rotuloLinha}
            </th>
            {dados.colunas.map((c) => (
              <th
                key={c}
                scope="col"
                className="text-right font-semibold text-ink-700 px-3 py-2.5 border-b-2 hairline-strong whitespace-nowrap"
              >
                {c}
              </th>
            ))}
            <th
              scope="col"
              className="text-right font-semibold text-ink-700 px-3 py-2.5 border-b-2 hairline-strong"
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {dados.linhas.map((l, i) => (
            <tr key={l} className="border-t hairline">
              <th scope="row" className="text-left font-normal text-ink-800 px-3 py-2.5">
                {l}
              </th>
              {dados.colunas.map((c, j) => {
                const n = dados.celulas[i][j];
                const divisor = base === "linha" ? dados.totaisLinha[i] : dados.total;
                return (
                  <td key={c} className="px-3 py-2.5 text-right">
                    {/* O fundo mora num `span` interno para o filete da linha não
                        ser coberto pelo tingimento da célula. */}
                    <span
                      className="inline-block w-full rounded-sm px-2 py-1 mono"
                      style={{
                        backgroundColor:
                          n > 0 ? `rgba(27, 87, 196, ${0.06 + (n / maiorCelula) * 0.34})` : undefined,
                      }}
                    >
                      {n > 0 ? numero(n) : "—"}
                      {/* O espaço é um caractere de verdade, não só margem: sem
                          ele o leitor de tela anuncia "5250%" e a cópia do
                          texto sai grudada. */}
                      {n > 0 && divisor > 0 && (
                        <span className="text-ink-600 ml-1.5 text-xs">
                          {" "}
                          {percentual(n / divisor)}
                        </span>
                      )}
                    </span>
                  </td>
                );
              })}
              <td className="px-3 py-2.5 text-right mono font-semibold">
                {numero(dados.totaisLinha[i])}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 hairline-strong">
            <th scope="row" className="text-left font-semibold text-ink-700 px-3 py-2.5">
              Total
            </th>
            {dados.totaisColuna.map((t, j) => (
              <td key={dados.colunas[j]} className="px-3 py-2.5 text-right mono font-semibold">
                {numero(t)}
              </td>
            ))}
            <td className="px-3 py-2.5 text-right mono font-semibold">{numero(dados.total)}</td>
          </tr>
        </tfoot>
      </table>

      {/*
       * O total da tabela pode ser menor que o da tela, e calar sobre isso seria
       * deixar alguém somar duas fontes e achar que perdeu registro. O corte é o
       * teto de categorias dos dois eixos.
       */}
      <p className="text-xs text-ink-600 mt-3">
        Percentual sobre {base === "linha" ? "a linha" : "o total"}. Categorias fora do teto entram
        em &ldquo;outros&rdquo;.
      </p>
    </div>
  );
}
