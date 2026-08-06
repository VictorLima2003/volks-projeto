import { NextResponse } from "next/server";
import { obterCampanha, salvarCampanha } from "@/lib/store";
import { Regra, RuleSet } from "@/lib/types";
import { podeAprovar, podePropor } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";

export const dynamic = "force-dynamic";

/**
 * Propõe uma nova versão. Ela NÃO entra em produção aqui — fica em aprovação
 * até que outra pessoa a aprove.
 */
export async function POST(req: Request) {
  const { campanhaId, regras, descricao } = await req.json() as {
    campanhaId: string;
    regras: Regra[];
    descricao?: string;
  };

  const autor = usuarioAtual();
  if (!podePropor(autor)) {
    return NextResponse.json(
      { erro: "sem_permissao", detalhe: `${autor.nome} não tem permissão para propor regras.` },
      { status: 403 },
    );
  }

  const campanha = obterCampanha(campanhaId);
  if (!campanha) {
    return NextResponse.json({ erro: "campanha_nao_encontrada" }, { status: 404 });
  }
  if (!Array.isArray(regras) || regras.length === 0) {
    return NextResponse.json({ erro: "ruleset_vazio" }, { status: 400 });
  }

  // Prioridades duplicadas tornam a ordem de avaliação ambígua.
  const prioridades = regras.map((r) => r.prioridade);
  if (new Set(prioridades).size !== prioridades.length) {
    return NextResponse.json(
      { erro: "prioridades_duplicadas", detalhe: "Cada regra precisa de uma prioridade única." },
      { status: 400 },
    );
  }

  // Uma proposta pendente por vez evita fila ambígua de aprovação.
  const pendente = campanha.ruleSets.find((r) => r.status === "em_aprovacao");
  if (pendente) {
    return NextResponse.json(
      {
        erro: "ja_existe_pendente",
        detalhe: `A v${pendente.versao} já está aguardando aprovação. Resolva-a antes de propor outra.`,
      },
      { status: 409 },
    );
  }

  const agora = new Date().toISOString();
  const proximaVersao = Math.max(...campanha.ruleSets.map((r) => r.versao)) + 1;
  const novo: RuleSet = {
    id: `rs_v${proximaVersao}_${Date.now().toString(36)}`,
    versao: proximaVersao,
    criadoEm: agora,
    criadoPor: autor.id,
    descricao: descricao || `Versão ${proximaVersao}`,
    regras,
    ativo: false,
    status: "em_aprovacao",
    propostoPor: autor.id,
    propostaEm: agora,
  };

  campanha.ruleSets.push(novo);
  salvarCampanha(campanha);

  return NextResponse.json({
    ruleSet: { id: novo.id, versao: novo.versao, status: novo.status },
  });
}

/**
 * Aprova, rejeita ou faz rollback.
 * Regra central: quem propôs não pode aprovar a própria proposta.
 */
export async function PATCH(req: Request) {
  const { campanhaId, ruleSetId, acao, motivo } = await req.json() as {
    campanhaId: string;
    ruleSetId: string;
    acao: "aprovar" | "rejeitar" | "reativar";
    motivo?: string;
  };

  const usuario = usuarioAtual();
  const campanha = obterCampanha(campanhaId);
  if (!campanha) {
    return NextResponse.json({ erro: "campanha_nao_encontrada" }, { status: 404 });
  }
  const alvo = campanha.ruleSets.find((r) => r.id === ruleSetId);
  if (!alvo) {
    return NextResponse.json({ erro: "versao_nao_encontrada" }, { status: 404 });
  }
  if (!podeAprovar(usuario)) {
    return NextResponse.json(
      { erro: "sem_permissao", detalhe: `${usuario.nome} não tem permissão de aprovação.` },
      { status: 403 },
    );
  }

  const agora = new Date().toISOString();

  if (acao === "aprovar" || acao === "reativar") {
    if (acao === "aprovar") {
      if (alvo.status !== "em_aprovacao") {
        return NextResponse.json(
          { erro: "status_invalido", detalhe: `A v${alvo.versao} não está aguardando aprovação.` },
          { status: 409 },
        );
      }
      // A trava que dá sentido ao duplo-check.
      if (alvo.propostoPor === usuario.id) {
        return NextResponse.json(
          {
            erro: "autoaprovacao",
            detalhe: "Quem propõe não pode aprovar. Peça a outra pessoa com permissão de aprovação.",
          },
          { status: 403 },
        );
      }
      alvo.aprovadoPor = usuario.id;
      alvo.aprovadoEm = agora;
    }

    // Ativa esta e arquiva a que estava valendo.
    for (const r of campanha.ruleSets) {
      if (r.id === alvo.id) continue;
      if (r.status === "ativo") r.status = "arquivado";
      r.ativo = false;
    }
    alvo.status = "ativo";
    alvo.ativo = true;
    campanha.ruleSetAtivoId = alvo.id;
    salvarCampanha(campanha);
    return NextResponse.json({ ativo: { id: alvo.id, versao: alvo.versao } });
  }

  if (acao === "rejeitar") {
    if (alvo.status !== "em_aprovacao") {
      return NextResponse.json(
        { erro: "status_invalido", detalhe: `A v${alvo.versao} não está aguardando aprovação.` },
        { status: 409 },
      );
    }
    if (alvo.propostoPor === usuario.id) {
      return NextResponse.json(
        { erro: "autoaprovacao", detalhe: "Quem propõe não avalia a própria proposta." },
        { status: 403 },
      );
    }
    if (!motivo || !motivo.trim()) {
      return NextResponse.json(
        { erro: "motivo_obrigatorio", detalhe: "Explique por que a proposta foi rejeitada." },
        { status: 400 },
      );
    }
    alvo.status = "rejeitado";
    alvo.rejeitadoPor = usuario.id;
    alvo.rejeitadoEm = agora;
    alvo.motivoRejeicao = motivo.trim();
    salvarCampanha(campanha);
    return NextResponse.json({ rejeitado: { id: alvo.id, versao: alvo.versao } });
  }

  return NextResponse.json({ erro: "acao_invalida" }, { status: 400 });
}
