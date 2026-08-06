import { NextResponse } from "next/server";
import { listarCampanhas, salvarCampanha } from "@/lib/store";
import { Campanha } from "@/lib/types";
import { CAMPANHAS_SEED } from "@/lib/seed";
import { todasAsPerguntas } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listarCampanhas());
}

function lista(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = `camp_${Date.now().toString(36)}`;

  const modelos = lista(body.modelos);
  if (modelos.length === 0) {
    return NextResponse.json(
      { erro: "sem_modelo", detalhe: "Escolha ao menos um modelo para a campanha." },
      { status: 400 },
    );
  }
  const ufs = lista(body.ufs);
  if (ufs.length === 0) {
    return NextResponse.json(
      { erro: "sem_uf", detalhe: "Escolha ao menos um estado." },
      { status: 400 },
    );
  }

  // Herda a pesquisa e o ruleset padrão do primeiro seed
  const seed = CAMPANHAS_SEED[0];
  const blocos = JSON.parse(JSON.stringify(seed.blocos)) as Campanha["blocos"];

  // A pergunta de modelo passa a oferecer exatamente os modelos da campanha —
  // senão o motorista escolheria um carro que a campanha não vende.
  const pModelo = todasAsPerguntas(blocos).find((p) => p.campo === "modelo");
  if (pModelo) pModelo.opcoes = [...modelos, "Ainda decidindo"];

  const campanha: Campanha = {
    id,
    nome: String(body.nome ?? "Nova campanha"),
    concessionaria: String(body.concessionaria ?? ""),
    modelos,
    cidadesAlvo: lista(body.cidades),
    ufsAlvo: ufs,
    faixasEtarias: lista(body.faixasEtarias),
    verbaTotal: Number(body.verba ?? 0),
    verbaConsumida: 0,
    vigenciaInicio: String(body.inicio ?? "2026-09-01"),
    vigenciaFim: String(body.fim ?? "2026-12-31"),
    status: "rascunho",
    criadaEm: new Date().toISOString(),
    blocos,
    hooks: JSON.parse(JSON.stringify(seed.hooks)),
    ruleSets: JSON.parse(JSON.stringify(seed.ruleSets)),
    ruleSetAtivoId: seed.ruleSetAtivoId,
  };
  salvarCampanha(campanha);
  return NextResponse.json({ id: campanha.id });
}
