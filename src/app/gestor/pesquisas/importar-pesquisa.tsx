"use client";

import { useAviso } from "@/components/Avisos";
import { pesquisaDeArquivo } from "@/lib/portabilidade";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/**
 * Trazer uma pesquisa de outra instalação.
 *
 * Fica ao lado de "+ Nova pesquisa" porque é a outra maneira de uma pesquisa
 * passar a existir aqui — e não em Configuração, que é onde se mexe no que já
 * existe.
 *
 * Diferente da fonte, que entra na tela e espera o "Salvar", a pesquisa é criada
 * na hora e abre no construtor: fonte é código que precisa ser lido antes de
 * valer, pesquisa é um questionário em rascunho, que não pergunta nada a
 * ninguém enquanto não for publicado.
 */
export function ImportarPesquisa({ podeEditar }: { podeEditar: boolean }) {
  const router = useRouter();
  const { avisar } = useAviso();
  const arquivo = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function importar(f: File) {
    const lido = pesquisaDeArquivo(await f.text());
    if (!lido.ok) {
      avisar(lido.erro, "stop");
      return;
    }

    setEnviando(true);
    const res = await fetch("/api/pesquisa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ importada: lido.valor }),
    });
    const json = await res.json();
    setEnviando(false);

    if (!res.ok) {
      avisar(json.detalhe ?? json.erro ?? "Não deu para importar.", "stop");
      return;
    }

    /* O aviso de fonte faltando é o motivo de a importação responder alguma
       coisa além do id: a pesquisa entra inteira, mas não funciona sozinha. */
    const avisos: string[] = json.avisos ?? [];
    avisar(
      avisos.length ? `"${lido.valor.nome}" importada. ${avisos.join(" ")}` : `"${lido.valor.nome}" importada como rascunho.`,
      avisos.length ? "stop" : "go",
    );
    router.push(`/gestor/pesquisas/${json.id}`);
  }

  return (
    <>
      <input
        ref={arquivo}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importar(f);
          /* Zerado, o mesmo arquivo pode ser escolhido de novo depois de
             corrigido — senão o `change` não dispara na segunda vez. */
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => arquivo.current?.click()}
        disabled={enviando || !podeEditar}
        className="inline-flex h-12 items-center rounded-full border border-vw-deep bg-ink-0 px-5
                   text-base font-semibold text-ink-900 transition hover:bg-ink-100
                   disabled:opacity-40"
      >
        {enviando ? "Importando..." : "Importar pesquisa"}
      </button>
    </>
  );
}
