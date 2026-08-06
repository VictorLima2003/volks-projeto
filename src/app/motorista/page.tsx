import { ShellFluxo } from "@/components/ShellFluxo";
import { Badge, Card } from "@/components/ui";
import { listarCampanhas } from "@/lib/store";
import Link from "next/link";
import { IniciarJornadaForm } from "./iniciar-form";

export const dynamic = "force-dynamic";

export default function MotoristaHome({
  searchParams,
}: {
  searchParams: { campanha?: string };
}) {
  const campanhas = listarCampanhas().filter((c) => c.status === "ativa" || c.status === "rascunho");
  const preSelecionada = searchParams.campanha;

  return (
    <ShellFluxo area={{ label: "Motorista", href: "/motorista" }}>
      <section className="grid-bg -mx-6 px-6 pt-8 pb-12 mb-10 border-b hairline">
        <div className="max-w-2xl">
          <Badge tone="vw">Motorista Uber</Badge>
          <h1 className="display text-3xl md:text-4xl mt-7">
            Poucos toques.<br />Resposta na hora.
          </h1>
          <p className="text-lg text-ink-700 mt-6">
            Você já é motorista Uber. A Volkswagen só precisa confirmar dois ou três detalhes para liberar
            condições especiais no seu próximo carro. Se você atende aos critérios, o vendedor já recebe autorização.
          </p>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold tracking-tight mb-4">Iniciar minha jornada</h2>
          <IniciarJornadaForm
            campanhas={campanhas.map((c) => ({ id: c.id, nome: c.nome, modelos: c.modelos }))}
            preSelecionada={preSelecionada}
          />
        </Card>

        <Card>
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-600">Como funciona</h3>
          <ol className="mt-4 space-y-4 text-sm">
            <li>
              <div className="mono text-vw-blue text-xs">01</div>
              <div>Digite seu CPF. Localizamos seu perfil na base Uber compartilhada com a VW.</div>
            </li>
            <li>
              <div className="mono text-vw-blue text-xs">02</div>
              <div>Você autoriza a consulta. Sem enviar prints ou comprovantes.</div>
            </li>
            <li>
              <div className="mono text-vw-blue text-xs">03</div>
              <div>Responde só o essencial: modelo, concessionária, canal de contato.</div>
            </li>
            <li>
              <div className="mono text-vw-blue text-xs">04</div>
              <div>Resultado imediato: liberado, ainda não elegível, ou pendente de análise.</div>
            </li>
          </ol>
        </Card>
      </div>

      <div className="mt-12">
        <div className="text-xs font-bold uppercase tracking-widest text-ink-600 mb-3">CPFs de demonstração</div>
        <div className="flex flex-wrap gap-2">
          {[
            { cpf: "111.222.333-44", nota: "elegível (14m · 2380)" },
            { cpf: "444.555.666-77", nota: "poucas corridas (4m · 320)" },
            { cpf: "777.888.999-00", nota: "conta suspensa" },
            { cpf: "999.888.777-66", nota: "não existe na base" },
          ].map((d) => (
            <div key={d.cpf} className="border hairline bg-ink-100 px-3 py-2 text-xs">
              <span className="mono text-ink-900">{d.cpf}</span>
              <span className="text-ink-600 ml-2">{d.nota}</span>
            </div>
          ))}
        </div>
      </div>
    </ShellFluxo>
  );
}
