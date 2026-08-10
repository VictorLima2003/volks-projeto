"use client";

import { useEffect, useState } from "react";

type Estado = "parado" | "copiado" | "falhou";

/**
 * O efeito de copiar é invisível: sem confirmação a pessoa clica de novo sem
 * saber se funcionou. A confirmação vive no próprio rótulo, não num toast — é
 * onde o olho já está.
 *
 * São dois caminhos porque `navigator.clipboard` é negado com mais frequência do
 * que parece: navegador sem permissão, aba sem foco, política da empresa. Quando
 * os dois falham, o botão seleciona o número na tela e diz o que fazer — o que
 * não pode acontecer é o clique não produzir nada e a pessoa ficar clicando.
 */
export function BotaoCopiar({ valor, alvoId }: { valor: string; alvoId: string }) {
  const [estado, setEstado] = useState<Estado>("parado");

  useEffect(() => {
    if (estado === "parado") return;
    const t = setTimeout(() => setEstado("parado"), 2500);
    return () => clearTimeout(t);
  }, [estado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setEstado("copiado");
      return;
    } catch {
      // Segue para o caminho antigo.
    }

    try {
      const campo = document.createElement("textarea");
      campo.value = valor;
      campo.setAttribute("readonly", "");
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      const deu = document.execCommand("copy");
      document.body.removeChild(campo);
      if (deu) {
        setEstado("copiado");
        return;
      }
    } catch {
      // Cai na seleção manual.
    }

    const alvo = document.getElementById(alvoId);
    if (alvo) {
      const faixa = document.createRange();
      faixa.selectNodeContents(alvo);
      const selecao = window.getSelection();
      selecao?.removeAllRanges();
      selecao?.addRange(faixa);
    }
    setEstado("falhou");
  }

  const rotulo =
    estado === "copiado" ? "Copiado" : estado === "falhou" ? "Copie à mão" : "Copiar";

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={`Copiar ${valor}`}
      className={
        "inline-flex items-center justify-center h-11 min-w-[7.5rem] px-5 rounded-full border text-sm font-semibold transition " +
        "outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue " +
        "active:translate-y-px " +
        (estado === "copiado"
          ? "border-signal-go text-signal-go"
          : estado === "falhou"
            ? "border-signal-warn text-signal-warn"
            : "border-vw-deep text-ink-900 hover:bg-ink-100")
      }
    >
      <span aria-hidden>{rotulo}</span>
      {/* O leitor de tela anuncia o resultado sem depender da mudança do rótulo. */}
      <span role="status" aria-live="polite" className="sr-only">
        {estado === "copiado"
          ? `${valor} copiado`
          : estado === "falhou"
            ? `Não foi possível copiar. ${valor} está selecionado na tela.`
            : ""}
      </span>
    </button>
  );
}
