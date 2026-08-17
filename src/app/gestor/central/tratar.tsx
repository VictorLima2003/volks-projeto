"use client";

import { useAviso } from "@/components/Avisos";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * A decisão de um caso, na própria linha da fila.
 *
 * Aberta em acordeão e não num modal: o gestor decide olhando o motivo pelo qual
 * o motor segurou, e um modal cobre justamente a linha que ele precisa ler.
 */
export function TratarCaso({
  sessaoId,
  opcoes,
}: {
  sessaoId: string;
  /** Os desfechos desta pesquisa que liberam ou recusam. */
  opcoes: { id: string; rotulo: string; efeito: "libera" | "recusa" }[];
}) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function decidir(desfechoId: string) {
    setEnviando(true);
    const res = await fetch("/api/central", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessaoId, desfechoId, motivo }),
    });
    const json = await res.json();
    setEnviando(false);
    if (!res.ok) {
      avisar(json.detalhe ?? json.erro ?? "Não deu para tratar.", "stop");
      return;
    }
    setAberto(false);
    setMotivo("");
    avisar(
      json.aviso?.destino
        ? `Caso tratado como "${json.desfecho}". Aviso registrado para ${json.aviso.destino}.`
        : `Caso tratado como "${json.desfecho}". Esta jornada não deixou contato, então não há para onde avisar.`,
      "go",
    );
    router.refresh();
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex h-9 items-center rounded-full border hairline px-4 text-sm
                   text-ink-800 transition hover:border-vw-deep hover:text-vw-deep"
      >
        Tratar
      </button>
    );
  }

  const liberar = opcoes.filter((o) => o.efeito === "libera");
  const recusar = opcoes.filter((o) => o.efeito === "recusa");

  return (
    <div className="min-w-72 space-y-3 rounded-md border hairline p-4">
      <label className="block text-xs font-semibold text-ink-700" htmlFor={`motivo-${sessaoId}`}>
        Por que você está decidindo assim
      </label>
      <textarea
        id={`motivo-${sessaoId}`}
        rows={2}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ex.: conferi o cadastro pelo aplicativo do parceiro e bate."
        className="w-full rounded-md border hairline-strong bg-ink-0 p-2.5 text-sm
                   outline outline-2 outline-offset-1 outline-transparent focus:outline-vw-blue"
      />

      {/* Os fins vêm da pesquisa, com o nome que quem a montou escreveu. Botão
          fixo "Liberar/Recusar" mentiria numa pesquisa cujos fins se chamam
          outra coisa. */}
      <div className="flex flex-wrap gap-2">
        {liberar.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={enviando || !motivo.trim()}
            onClick={() => decidir(o.id)}
            className="inline-flex h-9 items-center rounded-full bg-signal-go px-4 text-sm
                       font-semibold text-ink-0 transition hover:opacity-90 disabled:opacity-40"
          >
            {o.rotulo}
          </button>
        ))}
        {recusar.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={enviando || !motivo.trim()}
            onClick={() => decidir(o.id)}
            className="inline-flex h-9 items-center rounded-full border border-signal-stop px-4
                       text-sm font-semibold text-signal-stop transition
                       hover:bg-signal-stop hover:text-ink-0 disabled:opacity-40"
          >
            {o.rotulo}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="inline-flex h-9 items-center px-3 text-sm text-ink-700 hover:text-ink-900"
        >
          Cancelar
        </button>
      </div>

      <p className="text-xs text-ink-600 leading-snug">
        A decisão substitui o resultado desta jornada e o motorista é avisado. Fica registrado
        quem decidiu, quando e o que o motor tinha decidido antes.
      </p>
    </div>
  );
}
