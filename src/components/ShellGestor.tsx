import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "./ui";
import { LogoVW } from "./LogoVW";
import { SeletorUsuario } from "./SeletorUsuario";
import { Corpo, Rodape } from "./Cabecalho";

export type SecaoGestor = "campanhas" | "aprovacoes" | "central" | "dashboard" | null;

const secoes: { id: Exclude<SecaoGestor, null>; label: string; href: string }[] = [
  { id: "campanhas",  label: "Campanhas",  href: "/gestor" },
  { id: "aprovacoes", label: "Aprovações", href: "/gestor/aprovacoes" },
  { id: "central",    label: "Central",    href: "/gestor/central" },
  { id: "dashboard",  label: "Dashboard",  href: "/gestor/dashboard" },
];

/**
 * Área do gestor — a única com navegação interna, porque é a única que tem
 * várias seções. Motorista e vendedor são fluxos focados e não têm menu.
 */
export function ShellGestor({
  secao = null,
  title,
  action,
  saudacao,
  data,
  children,
}: {
  secao?: SecaoGestor;
  title?: string;
  action?: ReactNode;
  /**
   * Saudação e data, na faixa acima do título. Chegam prontas como texto porque
   * a saudação depende do cookie de usuário, e ler cookie aqui puxaria
   * `next/headers` para dentro de um componente que Client Components importam.
   */
  saudacao?: string;
  data?: string;
  children: ReactNode;
}) {
  /*
   * Um eixo só na área inteira.
   *
   * As telas de construção corriam a 1600px enquanto o resto do gestor corria a
   * 1280 — então a marca, a navegação e o perfil pulavam 73px na horizontal a
   * cada ida de Campanhas para Pesquisa. É o mesmo defeito que a jornada do
   * motorista teve, ali entre cabeçalho e conteúdo; aqui, entre telas vizinhas.
   *
   * Os 1600 se justificavam por "as telas de construção precisam de espaço", e
   * não precisam: o construtor é uma lista vertical de blocos, e linha longa
   * demais atrapalha a leitura em vez de ajudar.
   */
  const container = "max-w-7xl";
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-1 bg-vw-deep" />

      <header className="border-b hairline sticky top-0 z-30 bg-ink-0/97 backdrop-blur">
        <div className={`${container} mx-auto px-6 h-20 flex items-center gap-8`}>
          <Link
            href="/gestor"
            aria-label="Volkswagen · área do gestor"
            className="flex items-center gap-3.5 group shrink-0"
          >
            {/* Só a marca. "Gestor" nomeava a área para quem já está nela — a
                navegação ao lado e a URL dizem isso, e a palavra gastava espaço
                para repetir o óbvio. O `aria-label` do link continua dizendo. */}
            <LogoVW decorativo className="w-9 h-9 text-vw-deep transition group-hover:text-ink-900" />
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {secoes.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className={cn(
                  "px-4 h-10 inline-flex items-center rounded-full text-base tracking-tight transition whitespace-nowrap",
                  secao === s.id
                    ? "bg-vw-deep text-ink-0"
                    : "text-ink-700 hover:text-ink-900 hover:bg-ink-100",
                )}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto shrink-0 flex items-center gap-6">
            {/* Data no cabeçalho, como no vendedor: contexto não gasta a
                primeira linha do conteúdo. */}
            {data && <span className="text-sm text-ink-600 hidden lg:inline">{data}</span>}
            <SeletorUsuario />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className={`${container} mx-auto px-6 py-10`}>
          <Corpo
            title={title}
            action={action}
          >
            {children}
          </Corpo>
        </div>
      </main>

      <Rodape />
    </div>
  );
}
