"use client";

import { useAviso } from "@/components/Avisos";
import { LogoVW } from "@/components/LogoVW";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * O cartão do nome, no canto superior esquerdo da prancheta.
 *
 * A marca abre a configuração da pesquisa — é o mesmo lugar onde as ferramentas
 * de canvas guardam "o que este arquivo é". Fica num popover e não numa aba
 * porque nome, descrição e situação se ajustam de passagem, sem sair do desenho.
 */
export function CartaoPesquisa({
  pesquisaId,
  inicial,
  podeEditar,
}: {
  pesquisaId: string;
  inicial: { nome: string };
  podeEditar: boolean;
}) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(inicial.nome);
  const [salvando, setSalvando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // Esc fecha, como as demais camadas sobrepostas do sistema.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  async function salvar() {
    setSalvando(true);
    const res = await fetch("/api/pesquisa", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      /* Só o nome. Mandar qualquer outro campo junto — mesmo sem campo para ele
         na tela — sobrescreveria com a cópia velha o que a capa ou o botão de
         publicar acabaram de gravar. */
      body: JSON.stringify({ pesquisaId, nome }),
    });
    const json = await res.json();
    setSalvando(false);
    if (!res.ok) {
      avisar(json.detalhe ?? json.erro ?? "Não deu para salvar.", "stop");
      return;
    }
    setAberto(false);
    avisar("Pesquisa atualizada.", "go");
    router.refresh();
  }

  const rotuloDoCampo = "block text-[11px] font-semibold text-ink-700 mb-1";
  const campo =
    "w-full border hairline-strong rounded-md px-2.5 h-9 text-[13px] bg-ink-0 " +
    "outline outline-2 outline-offset-1 outline-transparent focus:outline-vw-blue";

  return (
    <div className="relative" ref={caixa}>
      <div className="flex items-stretch bg-ink-0 border hairline-strong rounded-ferramenta overflow-hidden">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          aria-label="Configuração da pesquisa"
          className="h-10 pl-3 pr-2.5 flex items-center gap-1.5 hover:bg-ink-100 transition"
        >
          <LogoVW decorativo className="w-5 h-5 text-vw-deep" />
          <Chevron className={aberto ? "rotate-180" : ""} />
        </button>

        <span className="w-px bg-[var(--line)] shrink-0" aria-hidden />

        {/* h6: é rótulo de arquivo, não título de página — o nome da pesquisa
            já é o assunto da tela inteira e não precisa de corpo grande. */}
        <h6 className="h-10 px-3.5 flex items-center text-[13px] font-semibold max-w-[22rem] truncate">
          {inicial.nome}
        </h6>
      </div>

      {aberto && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div
            role="dialog"
            aria-label="Configuração da pesquisa"
            className="absolute left-0 top-full mt-2 z-50 w-[26rem] max-h-[75vh] overflow-y-auto overflow-x-hidden
                       bg-ink-0 border hairline-strong rounded-ferramenta p-4"
          >
            <div className="space-y-3">
              <div>
                <label className={rotuloDoCampo} htmlFor="cfg-nome">Nome</label>
                <input
                  id="cfg-nome"
                  value={nome}
                  disabled={!podeEditar}
                  onChange={(e) => setNome(e.target.value)}
                  className={campo}
                />
              </div>

            </div>

            {/*
             * Aqui ficou o nome, e só.
             *
             * Título e descrição são o texto da capa e se escrevem no painel
             * dela, olhando para o lugar onde vão aparecer. A situação saiu
             * junto: ela é consequência de publicar, e ficava longe da ação que
             * a muda — quem publicasse pelo botão e salvasse este popover em
             * seguida tirava a pesquisa do ar sem perceber, porque o `select`
             * ainda tinha a situação de quando a tela abriu.
             */}
            <div className="mt-4 pt-3 border-t hairline">
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || !podeEditar || !nome.trim()}
                className="h-9 px-4 rounded-full bg-vw-deep text-ink-0 text-[13px] font-semibold
                           hover:opacity-90 transition disabled:opacity-40"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`w-3.5 h-3.5 text-ink-600 transition ${className ?? ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  );
}
