"use client";

import { papelLegivel, USUARIOS, Usuario, usuarioDoDocumento } from "@/lib/identidade";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "./ui";

/**
 * `abrePara` diz de que lado do botão a lista aparece.
 *
 * O padrão "baixo" nasceu no cabeçalho do fluxo, onde o botão fica no alto à
 * direita. Na barra lateral o mesmo posicionamento jogava a lista para baixo do
 * rodapé e alinhada à direita do botão — ou seja, para fora da janela pelos dois
 * lados. No pé da tela ela precisa subir, e encostada à esquerda, que é para
 * onde há espaço.
 */
export function SeletorUsuario({
  compacto = false,
  abrePara = "baixo",
  cheia = false,
}: {
  compacto?: boolean;
  abrePara?: "cima" | "baixo";
  /** Ocupa a largura do contêiner, como o botão de recolher da barra lateral. */
  cheia?: boolean;
}) {
  const router = useRouter();
  // Começa no padrão para o HTML do servidor bater com o do cliente;
  // o cookie real é lido logo após a montagem.
  /* Começa vazio, e não num usuário inventado: quem monta no servidor não lê
     cookie, e chutar alguém aqui faria o cabeçalho piscar o nome errado antes
     de o efeito corrigir. */
  const [atual, setAtual] = useState<Usuario | undefined>(undefined);
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
    router.push("/entrar");
  }

  const iniciais = (atual?.nome ?? "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div className={cheia ? "relative w-full" : "relative"}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        /* Recolhido, só a inicial: o pílula inteira estourava a largura da barra
           lateral e vazava por cima do conteúdo. */
        title={compacto ? atual?.nome : undefined}
        className={
          "flex items-center rounded-full border hairline-strong hover:border-vw-deep transition " +
          (compacto
            ? "h-11 w-11 justify-center"
            : "gap-2.5 h-11 pl-1.5 pr-3 " + (cheia ? "w-full" : ""))
        }
      >
        <span className="w-8 h-8 rounded-full bg-vw-deep text-ink-0 text-xs font-bold flex items-center justify-center shrink-0">
          {iniciais}
        </span>
        {!compacto && (
          <>
            {/*
             * Ocupando a largura toda, o nome não some em tela estreita: quem
             * esconde a barra inteira é o modo recolhido, e `hidden lg:inline`
             * deixava uma pílula larga e vazia entre o avatar e a seta.
             */}
            <span
              className={cn(
                "text-sm font-semibold truncate",
                cheia ? "flex-1 text-left" : "hidden lg:inline",
              )}
            >
              {atual?.nome ?? "…"}
            </span>
            <span className="text-ink-600 text-xs shrink-0" aria-hidden="true">▾</span>
          </>
        )}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div
            className={
              /* `max-h`/`overflow`: são seis pessoas mais o rodapé, e subindo a
                 partir do pé da tela a lista passava do topo em janela baixa. */
              "absolute z-50 w-80 max-h-[70vh] overflow-y-auto bg-ink-0 border hairline-strong rounded-md shadow-lift p-2 " +
              (abrePara === "cima" ? "left-0 bottom-full mb-2" : "right-0 top-full mt-2")
            }
          >
            {/*
             * Trocar de pessoa é parte do trabalho enquanto não há login: sem
             * isso não dá para ver os dois lados da revisão, já que ninguém
             * revisa a própria versão, nem para abrir a carteira de um
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
                  (u.id === atual?.id ? "bg-vw-deep/8" : "hover:bg-ink-100")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-medium">{u.nome}</span>
                  {u.id === atual?.id && (
                    <span className="text-xs font-semibold text-vw-deep">atual</span>
                  )}
                </div>
                <div className="text-xs text-ink-600 mt-0.5">
                  {u.area} · {papelLegivel(u)}
                </div>
              </button>
            ))}
            <p className="px-3 py-2 text-xs text-ink-600 border-t hairline mt-2">
              Protótipo sem login. Troque de pessoa para ver os dois lados da revisão.
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
