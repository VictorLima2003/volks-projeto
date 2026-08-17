"use client";

import { Consentimento } from "@/lib/types";
import { useEffect, useRef } from "react";

/**
 * O texto da etapa de autorização.
 *
 * Só o texto: a etapa em si não é montada aqui e não pode ser arrastada para
 * outro lugar do fluxo. Ela vem depois da capa em toda pesquisa, e é isso que
 * permite responder "com que base vocês consultaram o CPF dessa pessoa?" sem
 * depender de quem montou ter lembrado de incluir a pergunta.
 *
 * Desligar é possível, e fica sendo uma decisão consciente de quem monta — não
 * um esquecimento.
 */
export function PainelConsentimento({
  consentimento,
  podeEditar,
  onPatch,
  onFechar,
}: {
  consentimento: Consentimento;
  podeEditar: boolean;
  onPatch: (patch: Partial<Consentimento>) => void;
  onFechar: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const rotulo = "block text-[11px] font-semibold text-ink-700 mb-1";
  const campo =
    "w-full border hairline-strong rounded-md px-2.5 py-2 text-[13px] bg-ink-0 " +
    "outline outline-2 outline-offset-1 outline-transparent focus:outline-vw-blue " +
    "disabled:opacity-50";

  return (
    <div
      ref={caixa}
      role="dialog"
      aria-label="Autorização"
      className="w-full max-h-full overflow-y-auto bg-ink-0 border hairline-strong
                 rounded-ferramenta p-4"
    >
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold">Autorização</h2>
        <button
          type="button"
          onClick={onFechar}
          className="text-[13px] text-ink-700 hover:text-ink-900"
        >
          fechar
        </button>
      </div>

      <label className="flex items-start gap-2.5 mb-4">
        <input
          type="checkbox"
          checked={consentimento.ativo}
          disabled={!podeEditar}
          onChange={(e) => onPatch({ ativo: e.target.checked })}
          className="mt-0.5"
        />
        <span className="text-[13px] leading-snug">
          Pedir autorização antes de consultar
          <span className="block text-ink-600">
            Desligue apenas quando esta pesquisa não consultar dado de ninguém.
          </span>
        </span>
      </label>

      <div className={consentimento.ativo ? "space-y-3" : "space-y-3 opacity-40"}>
        <div>
          <label className={rotulo} htmlFor="cons-pergunta">
            A pergunta
          </label>
          <textarea
            id="cons-pergunta"
            rows={2}
            value={consentimento.pergunta}
            disabled={!podeEditar || !consentimento.ativo}
            onChange={(e) => onPatch({ pergunta: e.target.value })}
            className={campo}
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="cons-ajuda">
            Texto de apoio
          </label>
          <textarea
            id="cons-ajuda"
            rows={2}
            value={consentimento.ajuda ?? ""}
            disabled={!podeEditar || !consentimento.ativo}
            onChange={(e) => onPatch({ ajuda: e.target.value })}
            className={campo}
          />
        </div>

        {/* O que quem recusa lê. Fica aqui junto e não numa tela à parte: quem
            escreve a pergunta está decidindo, na mesma frase, o que acontece
            com quem responde "não". */}
        <div className="pt-3 border-t hairline">
          <label className={rotulo} htmlFor="cons-recusa-titulo">
            Se a pessoa não autorizar
          </label>
          <input
            id="cons-recusa-titulo"
            value={consentimento.tituloDaRecusa}
            disabled={!podeEditar || !consentimento.ativo}
            onChange={(e) => onPatch({ tituloDaRecusa: e.target.value })}
            className={campo}
          />
          <textarea
            id="cons-recusa-mensagem"
            rows={3}
            value={consentimento.mensagemDaRecusa}
            disabled={!podeEditar || !consentimento.ativo}
            onChange={(e) => onPatch({ mensagemDaRecusa: e.target.value })}
            className={campo + " mt-2"}
          />
        </div>
      </div>

      <p className="text-[11px] text-ink-600 mt-4 leading-snug">
        A resposta fica gravada na submissão como{" "}
        <span className="font-semibold">resposta.consentimento</span>, e as regras podem lê-la.
      </p>
    </div>
  );
}
