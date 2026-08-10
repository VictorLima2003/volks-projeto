"use client";

import { ShellGestor } from "@/components/ShellGestor";
import { SelecaoMultipla } from "@/components/SelecaoMultipla";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { CONCESSIONARIAS, FAIXAS_ETARIAS, MODELOS_VW, REGIOES, UFS } from "@/lib/catalogo";
import { useAviso } from "@/components/Avisos";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NovaCampanha() {
  const router = useRouter();
  const { avisar } = useAviso();
  const [salvando, setSalvando] = useState(false);

  const [modelos, setModelos] = useState<string[]>(["T-Cross"]);
  const [ufs, setUfs] = useState<string[]>(["SP"]);
  const [faixas, setFaixas] = useState<string[]>(["25-34", "35-44"]);

  const incompleto = modelos.length === 0 || ufs.length === 0;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/campanhas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(fd.entries()),
        modelos,
        ufs,
        faixasEtarias: faixas,
      }),
    });
    const json = await res.json();
    setSalvando(false);
    if (!res.ok) {
      avisar(json.detalhe ?? json.erro ?? "Falha ao criar campanha.", "stop");
      return;
    }
    router.push(`/gestor/campanhas/${json.id}`);
    router.refresh();
  }

  return (
    <ShellGestor
      secao="campanhas"
      title="Nova campanha"
    >
      <form onSubmit={enviar} className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold tracking-tight mb-5">Identificação</h2>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="nome">Nome da campanha</Label>
                <Input id="nome" name="nome" required placeholder="Ex.: T-Cross Uber SP · 2º Semestre" />
              </div>
              <div>
                <Label htmlFor="concessionaria">Rede ou concessionária responsável</Label>
                <Select id="concessionaria" name="concessionaria" defaultValue="Rede VW São Paulo">
                  <option>Rede VW São Paulo</option>
                  <option>Rede VW Rio de Janeiro</option>
                  {CONCESSIONARIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold tracking-tight mb-5">Veículos ofertados</h2>
            <SelecaoMultipla
              label="Modelos"
              opcoes={MODELOS_VW.map((m) => ({ valor: m, rotulo: m }))}
              valor={modelos}
              onChange={setModelos}
              ajuda="A pesquisa vai oferecer exatamente estes modelos ao motorista."
            />
          </Card>

          <Card>
            <h2 className="text-lg font-semibold tracking-tight mb-5">Público</h2>
            <div className="space-y-7">
              <SelecaoMultipla
                label="Estados"
                opcoes={UFS.map((u) => ({ valor: u.sigla, rotulo: u.sigla }))}
                valor={ufs}
                onChange={setUfs}
                atalhos={REGIOES}
                ajuda="Clique numa região para marcar todos os estados dela de uma vez."
              />

              <SelecaoMultipla
                label="Faixas etárias"
                opcoes={FAIXAS_ETARIAS.map((f) => ({ valor: f, rotulo: f }))}
                valor={faixas}
                onChange={setFaixas}
                ajuda="Deixe vazio para não restringir por idade."
              />

              <div>
                <Label htmlFor="cidades">Cidades (opcional, separadas por vírgula)</Label>
                <Input id="cidades" name="cidades" placeholder="São Paulo, Campinas, Santos" />
                <p className="text-xs text-ink-600 mt-2.5">
                  Sem cidades, a campanha vale para o estado inteiro.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold tracking-tight mb-5">Vigência e verba</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="inicio">Início</Label>
                <Input id="inicio" name="inicio" type="date" defaultValue="2026-09-01" />
              </div>
              <div>
                <Label htmlFor="fim">Fim</Label>
                <Input id="fim" name="fim" type="date" defaultValue="2026-12-31" />
              </div>
              <div>
                <Label htmlFor="verba">Verba total (R$)</Label>
                <Input id="verba" name="verba" type="number" min={0} defaultValue={2_000_000} />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold tracking-tight mb-5">Descrição interna</h2>
            <Textarea name="descricao" placeholder="Contexto rápido para o time..." />
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <Card>
            <h3 className="text-sm font-semibold mb-4">Resumo</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-ink-600">Modelos</dt>
                <dd className="mt-1">{modelos.length ? modelos.join(", ") : "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-600">Estados</dt>
                <dd className="mt-1">
                  {ufs.length === 0 ? "—" : ufs.length > 8 ? `${ufs.length} estados` : ufs.join(", ")}
                </dd>
              </div>
              <div>
                <dt className="text-ink-600">Faixas etárias</dt>
                <dd className="mt-1">{faixas.length ? faixas.join(", ") : "sem restrição"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold mb-4">
              O que vem depois
            </h3>
            <ol className="space-y-2.5 text-sm text-ink-700">
              <li className="flex gap-3"><span className="mono text-ink-600">01</span> Subir base Uber</li>
              <li className="flex gap-3"><span className="mono text-ink-600">02</span> Montar a pesquisa</li>
              <li className="flex gap-3"><span className="mono text-ink-600">03</span> Propor as regras</li>
              <li className="flex gap-3"><span className="mono text-ink-600">04</span> Ativar a campanha</li>
            </ol>
            <p className="text-xs text-ink-600 mt-4">
              A campanha nasce como rascunho, com o RuleSet padrão: 6 meses de Uber, 500 corridas e
              conta ativa.
            </p>
          </Card>


          <Button type="submit" disabled={salvando || incompleto} className="w-full">
            {salvando ? "Criando..." : "Criar campanha"}
          </Button>
          {incompleto && (
            <p className="text-xs text-ink-600">Escolha ao menos um modelo e um estado.</p>
          )}
        </aside>
      </form>
    </ShellGestor>
  );
}
