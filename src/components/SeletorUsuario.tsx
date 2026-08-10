"use client";

import { papelLegivel, USUARIOS, USUARIO_PADRAO, Usuario, usuarioDoDocumento } from "@/lib/identidade";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SeletorUsuario({ compacto = false }: { compacto?: boolean }) {
  const router = useRouter();
  // Começa no padrão para o HTML do servidor bater com o do cliente;
  // o cookie real é lido logo após a montagem.
  const [atual, setAtual] = useState<Usuario>(USUARIO_PADRAO);
  const [aberto, setAberto] = useState(false);
  const [trocando, setTrocando] = useState(false);

  useEffect(() => {
    setAtual(usuarioDoDocumento());
  }, []);

  async function trocar(id: string) {
    setTrocando(true);
    await fetch("/api/identidade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuarioId: id }),
    });
    setAtual(usuarioDoDocumento());
    setAberto(false);
    setTrocando(false);
    router.refresh();
  }

  /*
   * Não há login para desfazer: o protótipo guarda quem você é num cookie. Sair
   * apaga esse cookie e devolve à porta de entrada, que é a coisa mais próxima
   * de sair que existe aqui — e é onde a pessoa escolheria de novo a área.
   */
  async function sair() {
    setTrocando(true);
    await fetch("/api/identidade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuarioId: null }),
    });
    setAberto(false);
    router.push("/");
  }

  const iniciais = atual.nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        /* Recolhido, só a inicial: o pílula inteira estourava a largura da barra
           lateral e vazava por cima do conteúdo. */
        title={compacto ? atual.nome : undefined}
        className={
          "flex items-center rounded-full border hairline-strong hover:border-vw-deep transition " +
          (compacto ? "h-11 w-11 justify-center" : "gap-2.5 h-11 pl-1.5 pr-3")
        }
      >
        <span className="w-8 h-8 rounded-full bg-vw-deep text-ink-0 text-xs font-bold flex items-center justify-center shrink-0">
          {iniciais}
        </span>
        {!compacto && (
          <>
            <span className="text-sm font-semibold hidden lg:inline">{atual.nome}</span>
            <span className="text-ink-600 text-xs" aria-hidden="true">▾</span>
          </>
        )}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-ink-0 border hairline-strong rounded-md shadow-lift p-2">
            {/*
             * Trocar de pessoa é parte do trabalho enquanto não há login: sem
             * isso não dá para ver os dois lados da aprovação, já que ninguém
             * aprova a própria proposta, nem para abrir a carteira de um
             * vendedor. Some quando existir login de verdade.
             */}
            <div className="px-3 py-2 text-sm font-semibold text-ink-600">Entrar como</div>
            {USUARIOS.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={trocando}
                onClick={() => trocar(u.id)}
                className={
                  "w-full text-left px-3 py-2.5 rounded-sm transition disabled:opacity-50 " +
                  (u.id === atual.id ? "bg-vw-deep/8" : "hover:bg-ink-100")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-medium">{u.nome}</span>
                  {u.id === atual.id && (
                    <span className="text-xs font-semibold text-vw-deep">atual</span>
                  )}
                </div>
                <div className="text-xs text-ink-600 mt-0.5">
                  {u.area} · {papelLegivel(u)}
                </div>
              </button>
            ))}
            <p className="px-3 py-2 text-xs text-ink-600 border-t hairline mt-2">
              Protótipo sem login. Troque de pessoa para ver os dois lados da aprovação.
            </p>

            <button
              type="button"
              disabled={trocando}
              onClick={sair}
              className="w-full text-left px-3 py-2.5 rounded-sm text-base font-medium
                         text-signal-stop hover:bg-signal-stop/[0.07] transition disabled:opacity-50"
            >
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
