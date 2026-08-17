import { LogoVW } from "@/components/LogoVW";
import { areaDe, USUARIOS } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";
import { redirect } from "next/navigation";
import { destinoSeguro } from "./destino";
import { FormularioDeEntrada } from "./formulario";

export const dynamic = "force-dynamic";

/**
 * A porta das áreas de trabalho.
 *
 * Antes não havia porta: quem chegasse sem cookie era tratado como a primeira
 * pessoa da lista — uma gestora — e passava por toda trava de papel do sistema.
 * As travas existiam e não travavam nada.
 *
 * A área de quem responde continua aberta, e é o ponto dela: o link da pesquisa
 * vai para motorista que não tem conta aqui e nem deveria ter.
 */
export default function Entrar({
  searchParams,
}: {
  searchParams: { de?: string };
}) {
  /* Já entrou e voltou aqui pelo endereço: segue para onde ia, em vez de
     encarar um formulário que não tem nada a resolver. */
  const jaEntrou = usuarioAtual();
  if (jaEntrou) redirect(destinoSeguro(searchParams.de, areaDe(jaEntrou)));

  return (
    <main className="min-h-screen grid place-items-center px-6 py-16 bg-ink-100">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <LogoVW decorativo className="w-9 h-9 text-vw-deep" />
          <span className="text-lg font-semibold tracking-tight">Volkswagen</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-base text-ink-700">
          Use o e-mail do seu cadastro. Quem vende entra na carteira da própria loja; quem monta
          pesquisa entra na área do gestor.
        </p>

        <FormularioDeEntrada
          destino={searchParams.de ?? ""}
          /* A lista de e-mails aparece porque isto é um protótipo de
             demonstração e ninguém decoraria seis endereços para experimentar as
             áreas. Num sistema de verdade ela não existiria: enumerar quem tem
             conta é meio caminho para entrar na conta de alguém. */
          conhecidos={USUARIOS.map((u) => ({
            id: u.id,
            nome: u.nome,
            onde: u.concessionaria ?? u.area,
          }))}
        />

        <p className="mt-8 text-sm text-ink-600 leading-snug">
          <strong>Não há senha neste protótipo.</strong> O e-mail é conferido contra a lista de
          cadastros e a sessão vira um cookie. Antes de isto sair de demonstração, entra
          autenticação de verdade — o que existe aqui separa papéis, não protege contas.
        </p>
      </div>
    </main>
  );
}
