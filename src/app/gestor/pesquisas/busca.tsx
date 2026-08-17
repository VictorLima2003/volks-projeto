"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * O campo de busca da lista.
 *
 * O que ele muda é a **URL**, e não um estado local: a lista é montada no
 * servidor, o recorte precisa sobreviver a um F5 e um resultado de busca precisa
 * poder ser colado no chat de alguém. É o mesmo acordo das submissões.
 *
 * Digitar não navega a cada tecla. Sem a espera, uma palavra de oito letras
 * dispara oito renderizações no servidor e o cursor pula de posição no meio da
 * digitação.
 */
export function BuscaDePesquisas({ inicial, total }: { inicial: string; total: number }) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(inicial);

  useEffect(() => {
    /*
     * Só navega quando o campo e a URL discordam.
     *
     * Sem esta conferência, qualquer mudança na URL fazia o efeito rodar de
     * novo — e como ele apaga `pagina` (buscar volta para a primeira página),
     * clicar em "Próxima" saía da página 2 e voltava sozinho para a 1. O botão
     * parecia não funcionar.
     *
     * Ela também cobre a montagem: o campo nasce com o valor que veio da URL,
     * então na primeira passada os dois já concordam.
     */
    if (texto.trim() === (params.get("busca") ?? "")) return;

    const id = setTimeout(() => {
      const novos = new URLSearchParams(params.toString());
      if (texto.trim()) novos.set("busca", texto.trim());
      else novos.delete("busca");
      /* Buscar volta para a primeira página. Manter a página em que se estava
         mostraria uma lista vazia sempre que o resultado novo fosse menor que a
         página em que a pessoa parou. */
      novos.delete("pagina");
      router.replace(`${caminho}?${novos.toString()}`, { scroll: false });
    }, 250);

    return () => clearTimeout(id);
  }, [texto, caminho, params, router]);

  return (
    <div className="relative flex-1 min-w-56">
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={`Buscar entre ${total} pesquisa${total === 1 ? "" : "s"}`}
        aria-label="Buscar pesquisas por nome, descrição ou chamada"
        className="w-full h-11 rounded-full border hairline-strong bg-ink-0 pl-11 pr-4 text-base
                   outline outline-2 outline-offset-1 outline-transparent focus:outline-vw-blue"
      />
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="M13.5 13.5 L18 18" strokeLinecap="round" />
      </svg>
    </div>
  );
}
