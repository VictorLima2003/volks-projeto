import { NextResponse } from "next/server";
import { obterPesquisa } from "@/lib/store";
import { Regra, RuleSet } from "@/lib/types";
import { podeRevisar, podePropor } from "@/lib/identidade";
import { exigirUsuario } from "@/lib/identidade-server";

export const dynamic = "force-dynamic";

/**
 * Propõe uma nova versão. Ela NÃO entra em produção aqui — fica em revisão
 * até que outra pessoa a aprove.
 */
export async function POST(req: Request) {
  const { pesquisaId, regras, descricao } = await req.json() as {
    pesquisaId: string;
    regras: Regra[];
    descricao?: string;
  };

  const sessao = exigirUsuario();
  if ("recusa" in sessao) return sessao.recusa;
  const autor = sessao.usuario;
  if (!podePropor(autor)) {
    return NextResponse.json(
      { erro: "sem_permissao", detalhe: `${autor.nome} não tem permissão para propor regras.` },
      { status: 403 },
    );
  }

  const pesquisa = obterPesquisa(pesquisaId);
  if (!pesquisa) {
    return NextResponse.json({ erro: "pesquisa_nao_encontrada" }, { status: 404 });
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

  // Uma proposta pendente por vez evita fila ambígua de revisão.
  const pendente = pesquisa.versoes.find((r) => r.status === "em_revisao");
  if (pendente) {
    return NextResponse.json(
      {
        erro: "ja_existe_pendente",
        detalhe: `A v${pendente.versao} já está em revisão. Resolva-a antes de propor outra.`,
      },
      { status: 409 },
    );
  }

  const agora = new Date().toISOString();
  // `0` como piso: a primeira proposta de uma pesquisa vazia seria `-Infinity`.
  const proximaVersao = Math.max(0, ...pesquisa.versoes.map((r) => r.versao)) + 1;
  const novo: RuleSet = {
    id: `rs_v${proximaVersao}_${Date.now().toString(36)}`,
    versao: proximaVersao,
    criadoEm: agora,
    criadoPor: autor.id,
    descricao: descricao || `Versão ${proximaVersao}`,
    regras,
    ativo: false,
    status: "em_revisao",
    propostoPor: autor.id,
    propostaEm: agora,
  };

  pesquisa.versoes.push(novo);

  return NextResponse.json({
    ruleSet: { id: novo.id, versao: novo.versao, status: novo.status },
  });
}

/**
 * Publica, recusa ou faz rollback.
 *
 * Regra central: quem propôs não revisa a própria versão — é o duplo-check que
 * dá sentido ao processo, e por isso a trava é do servidor.
 */
export async function PATCH(req: Request) {
  const { pesquisaId, ruleSetId, acao, motivo } = await req.json() as {
    pesquisaId: string;
    ruleSetId: string;
    acao: "publicar" | "recusar" | "reativar";
    motivo?: string;
  };

  const sessao = exigirUsuario();
  if ("recusa" in sessao) return sessao.recusa;
  const usuario = sessao.usuario;
  const pesquisa = obterPesquisa(pesquisaId);
  if (!pesquisa) {
    return NextResponse.json({ erro: "pesquisa_nao_encontrada" }, { status: 404 });
  }
  const alvo = pesquisa.versoes.find((r) => r.id === ruleSetId);
  if (!alvo) {
    return NextResponse.json({ erro: "versao_nao_encontrada" }, { status: 404 });
  }
  if (!podeRevisar(usuario)) {
    return NextResponse.json(
      { erro: "sem_permissao", detalhe: `${usuario.nome} não revisa versões de regra.` },
      { status: 403 },
    );
  }

  const agora = new Date().toISOString();

  if (acao === "publicar" || acao === "reativar") {
    if (acao === "publicar") {
      if (alvo.status !== "em_revisao") {
        return NextResponse.json(
          { erro: "status_invalido", detalhe: `A v${alvo.versao} não está em revisão.` },
          { status: 409 },
        );
      }
      // A trava que dá sentido ao duplo-check.
      if (alvo.propostoPor === usuario.id) {
        return NextResponse.json(
          {
            erro: "revisao_propria",
            detalhe: "Quem propõe não revisa a própria versão. Peça a outra pessoa que revise.",
          },
          { status: 403 },
        );
      }
      alvo.publicadoPor = usuario.id;
      alvo.publicadoEm = agora;
    }

    // Ativa esta e arquiva a que estava valendo.
    for (const r of pesquisa.versoes) {
      if (r.id === alvo.id) continue;
      if (r.status === "ativo") r.status = "arquivado";
      r.ativo = false;
    }
    alvo.status = "ativo";
    alvo.ativo = true;
    pesquisa.versaoAtivaId = alvo.id;
    return NextResponse.json({ ativo: { id: alvo.id, versao: alvo.versao } });
  }

  if (acao === "recusar") {
    if (alvo.status !== "em_revisao") {
      return NextResponse.json(
        { erro: "status_invalido", detalhe: `A v${alvo.versao} não está em revisão.` },
        { status: 409 },
      );
    }
    if (alvo.propostoPor === usuario.id) {
      return NextResponse.json(
        { erro: "revisao_propria", detalhe: "Quem propõe não revisa a própria versão." },
        { status: 403 },
      );
    }
    if (!motivo || !motivo.trim()) {
      return NextResponse.json(
        { erro: "motivo_obrigatorio", detalhe: "Explique por que a versão foi recusada." },
        { status: 400 },
      );
    }
    alvo.status = "recusado";
    alvo.recusadoPor = usuario.id;
    alvo.recusadoEm = agora;
    alvo.motivoRecusa = motivo.trim();
    return NextResponse.json({ recusado: { id: alvo.id, versao: alvo.versao } });
  }

  return NextResponse.json({ erro: "acao_invalida" }, { status: 400 });
}
