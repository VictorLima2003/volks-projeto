"use client";

import { acharFato, GrupoDeFatos, OPERADORES, operadoresPara } from "@/lib/engine";
import { Condicao, Operador } from "@/lib/types";
import { Input, Select } from "./ui";

/**
 * Editor de uma comparação. O lado direito pode ser um valor digitado ou
 * outro fato — comparar resposta com resposta é o que dispensa valores fixos.
 */
export function EditorCondicao({
  condicao,
  grupos,
  onChange,
}: {
  condicao: Condicao;
  grupos: GrupoDeFatos[];
  onChange: (c: Condicao) => void;
}) {
  const fatoDef = acharFato(grupos, condicao.fato);
  const operadores = operadoresPara(fatoDef?.tipo);
  /*
   * A definição do operador sai da lista completa, e não da lista filtrada por
   * tipo. É ela que diz se o operador pede valor — e uma regra escrita antes,
   * com um operador que não está mais na lista deste tipo, continua sendo uma
   * regra com valor. Procurando só na lista curta, o campo de valor sumia e o
   * número guardado ficava invisível na tela.
   */
  const opDef = OPERADORES.find((o) => o.valor === condicao.operador);
  const foraDoTipo = Boolean(opDef) && !operadores.some((o) => o.valor === condicao.operador);
  const comparaVariavel = condicao.valorFato !== undefined;

  /** Trocar o fato pode invalidar o operador escolhido. */
  function mudarFato(chave: string) {
    const novo = acharFato(grupos, chave);
    const permitidos = operadoresPara(novo?.tipo);
    const operador = permitidos.some((o) => o.valor === condicao.operador)
      ? condicao.operador
      : permitidos[0].valor;
    onChange({ ...condicao, fato: chave, operador });
  }

  function mudarValor(bruto: string) {
    // Guarda número como número: comparar "500" com 500 é armadilha clássica.
    const valor = fatoDef?.tipo === "numero" && bruto.trim() !== "" ? Number(bruto) : bruto;
    onChange({ ...condicao, valor, valorFato: undefined });
  }

  function alternarModo(paraVariavel: boolean) {
    onChange(
      paraVariavel
        ? { ...condicao, valorFato: grupos[0]?.itens[0]?.chave ?? "", valor: undefined }
        : { ...condicao, valorFato: undefined, valor: "" },
    );
  }

  return (
    <div className="space-y-2.5">
      {/*
       * Empilhado, não em doze colunas.
       *
       * A régua de 12 colunas nasceu quando a condição era editada numa página
       * larga. No inspetor do editor de fluxo, os três campos dividiam 300px e
       * cada seletor mostrava três letras do nome do fato — que é justamente o
       * que precisa ser lido para conferir a condição.
       */}
      <div className="grid gap-2.5">
        <Select
          value={condicao.fato}
          onChange={(e) => mudarFato(e.target.value)}
          aria-label="Fato a comparar"
        >
          {!fatoDef && condicao.fato && (
            <option value={condicao.fato}>{condicao.fato} (não encontrado)</option>
          )}
          {grupos.map((g) => (
            <optgroup key={g.grupo} label={g.grupo}>
              {g.itens.map((i) => (
                <option key={i.chave} value={i.chave}>{i.rotulo}</option>
              ))}
            </optgroup>
          ))}
        </Select>

        <Select
          value={condicao.operador}
          onChange={(e) => onChange({ ...condicao, operador: e.target.value as Operador })}
          aria-label="Operador"
        >
          {/*
           * O operador guardado, mesmo quando não está na lista deste tipo.
           *
           * Sem esta opção, o `select` não achava o que casar e mostrava o
           * primeiro item — a regra dizia "maior ou igual a 6" e a tela exibia
           * "igual a", sem valor nenhum. Mentira silenciosa, e das piores:
           * quem abrisse a regra para conferir leria outra coisa.
           */}
          {(foraDoTipo || !opDef) && (
            <option value={condicao.operador}>
              {opDef?.rotulo ?? condicao.operador} (fora do tipo deste fato)
            </option>
          )}
          {operadores.map((o) => (
            <option key={o.valor} value={o.valor}>{o.rotulo}</option>
          ))}
        </Select>

        {opDef?.usaValor ? (
          comparaVariavel ? (
            <Select
              value={condicao.valorFato ?? ""}
              onChange={(e) => onChange({ ...condicao, valorFato: e.target.value })}
              aria-label="Comparar com o fato"
            >
              {grupos.map((g) => (
                <optgroup key={g.grupo} label={g.grupo}>
                  {g.itens
                    .filter((i) => i.chave !== condicao.fato)
                    .map((i) => (
                      <option key={i.chave} value={i.chave}>{i.rotulo}</option>
                    ))}
                </optgroup>
              ))}
            </Select>
          ) : fatoDef?.opcoes && fatoDef.opcoes.length > 0 ? (
            <Select
              value={String(condicao.valor ?? "")}
              onChange={(e) => mudarValor(e.target.value)}
              aria-label="Valor"
            >
              <option value="">(escolha)</option>
              {fatoDef.opcoes.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </Select>
          ) : (
            <Input
              type={fatoDef?.tipo === "numero" ? "number" : "text"}
              value={String(condicao.valor ?? "")}
              onChange={(e) => mudarValor(e.target.value)}
              placeholder={fatoDef?.tipo === "numero" ? "0" : "valor"}
              aria-label="Valor"
            />
          )
        ) : (
          <div className="text-sm text-ink-600">Este operador não usa valor.</div>
        )}
      </div>

      {opDef?.usaValor && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink-600">Comparar com:</span>
          {[
            { rotulo: "um valor", ativo: !comparaVariavel, fn: () => alternarModo(false) },
            { rotulo: "outra variável", ativo: comparaVariavel, fn: () => alternarModo(true) },
          ].map((m) => (
            <button
              key={m.rotulo}
              type="button"
              onClick={m.fn}
              className={
                "px-3 h-8 rounded-full border transition " +
                (m.ativo
                  ? "bg-vw-deep text-ink-0 border-vw-deep font-semibold"
                  : "border-ink-300 text-ink-700 hover:border-vw-deep")
              }
            >
              {m.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
