import Link from "next/link";
import { ReactNode } from "react";

/**
 * Bloco de título da página: H1 e ação.
 *
 * Sem migalha. Ela repetia o caminho que a navegação do topo e a barra de
 * endereço já dizem, e no gestor chegava a repetir o próprio título da tela
 * duas linhas acima dele.
 */
export function Cabecalho({
  title,
  action,
}: {
  title?: string;
  action?: ReactNode;
}) {
  if (!title && !action) return null;

  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {title && <h1 className="display text-3xl md:text-4xl">{title}</h1>}
        {action}
      </div>
    </div>
  );
}

/**
 * Miolo de tela de painel: faixa de saudação e bloco de título.
 *
 * Mora aqui, e não dentro de um dos shells, porque `ShellGestor` e `ShellFluxo`
 * precisam do mesmo arranjo — o gestor e o vendedor têm painéis com a mesma
 * forma. Duplicar era garantir que os dois divergissem na primeira alteração.
 */
export function Corpo({
  saudacao,
  data,
  title,
  action,
  children,
}: {
  saudacao?: string;
  data?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {/* Quem está e que dia é. Vem antes das migalhas porque orienta a pessoa,
          não a página. */}
      {(saudacao || data) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b hairline pb-5 mb-8">
          {saudacao && <span className="text-base font-semibold text-ink-900">{saudacao}</span>}
          {data && <span className="text-sm text-ink-600">{data}</span>}
        </div>
      )}

      <Cabecalho title={title} action={action} />

      {children}
    </>
  );
}

export function Rodape({ nota, colado }: { nota?: string; colado?: boolean }) {
  return (
    // O respiro de cima existe para separar o rodapé de conteúdo em papel branco.
    // Depois de uma seção sangrada e escura ele vira uma faixa branca solta.
    <footer className={colado ? "border-t hairline" : "border-t hairline mt-16"}>
      <div className="max-w-7xl mx-auto px-6 min-h-20 py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-ink-600">
        <span>{nota ?? "Volkswagen / Uber"}</span>
        <CreditoTechMeNow />
      </div>
    </footer>
  );
}

/**
 * Crédito de autoria. Em componente próprio porque aparece em dois rodapés — o
 * do `ShellFluxo`/`ShellGestor` e o da raiz, que tem cromo próprio — e crédito
 * duplicado é o tipo de coisa que diverge na primeira alteração.
 */
export function CreditoTechMeNow() {
  return (
    <span>
      2026 · Desenvolvido por{" "}
      <a
        href="https://techmenow.com.br"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4 decoration-ink-300 hover:decoration-vw-deep hover:text-ink-900 transition
                   rounded-sm outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
      >
        TechMeNow
      </a>
    </span>
  );
}
