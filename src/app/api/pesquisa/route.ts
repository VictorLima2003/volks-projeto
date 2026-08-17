import { NextResponse } from "next/server";
import { criarPesquisa, listarHooks, obterPesquisa, salvarPesquisa } from "@/lib/store";
import { fontesCitadas, PesquisaPortavel } from "@/lib/portabilidade";
import {
  APRESENTACAO_PADRAO,
  Apresentacao,
  Bloco,
  BlocoPergunta,
  Desfecho,
  EfeitoDoDesfecho,
  EntradaDaCapa,
  ehCondicional,
  ehFeedback,
  ehPergunta,
  FundoDaCapa,
  LIMITE_DO_TITULO,
  PERGUNTA_DA_CAPA_PADRAO,
  Pesquisa,
  PesquisaStatus,
  RuleSet,
} from "@/lib/types";
import { temErro, validarPesquisa } from "@/lib/validacao-pesquisa";
import { podePropor } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";

export const dynamic = "force-dynamic";

const EFEITOS_VALIDOS: EfeitoDoDesfecho[] = ["libera", "segura", "recusa"];
const TONS_VALIDOS: Desfecho["tom"][] = ["go", "stop", "espera", "neutro"];

/**
 * O que impede um conjunto de desfechos de ser gravado.
 *
 * As travas são de integridade, não de gosto: id repetido faria duas regras
 * apontarem para coisas diferentes com o mesmo nome, e apagar um desfecho citado
 * por qualquer versão — inclusive arquivada — transformaria decisões já tomadas
 * em "Resultado indisponível".
 */
function validarDesfechos(desfechos: Desfecho[], pesquisa: Pesquisa): string | null {
  if (!Array.isArray(desfechos) || desfechos.length === 0) {
    return "A pesquisa precisa de pelo menos um desfecho.";
  }
  const ids = desfechos.map((d) => d.id);
  if (new Set(ids).size !== ids.length) return "Há dois desfechos com o mesmo identificador.";

  for (const d of desfechos) {
    if (!d.id?.trim()) return "Desfecho sem identificador.";
    if (!d.rotulo?.trim()) return "Todo desfecho precisa de um nome.";
    if (!d.titulo?.trim()) return `O desfecho "${d.rotulo}" precisa de um título.`;
    if (!EFEITOS_VALIDOS.includes(d.efeito)) return `Efeito inválido em "${d.rotulo}".`;
    if (!TONS_VALIDOS.includes(d.tom)) return `Cor inválida em "${d.rotulo}".`;
  }

  const emUso = new Set(pesquisa.versoes.flatMap((v) => v.regras.map((r) => r.resultado)));
  const sumiram = [...emUso].filter((id) => !ids.includes(id));
  if (sumiram.length > 0) {
    return `Alguma regra ainda aponta para: ${sumiram.join(", ")}. Renomeie em vez de remover.`;
  }
  return null;
}

const FUNDOS_VALIDOS: FundoDaCapa[] = ["persianas", "gradiente", "trama", "liso", "malha"];
const ENTRADAS_VALIDAS: EntradaDaCapa[] = ["pergunta", "convite"];

/** Limpa campos que não fazem sentido para o tipo, antes de gravar. */
function normalizar(blocos: Bloco[]): Bloco[] {
  return blocos.map((b) => {
    if (ehPergunta(b)) {
      const usaOpcoes = b.tipo === "opcao" || b.tipo === "multipla";
      return {
        ...b,
        campo: b.campo.trim(),
        rotulo: b.rotulo.trim(),
        ajuda: b.ajuda?.trim() || undefined,
        opcoes: usaOpcoes ? (b.opcoes ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
      };
    }
    if (ehCondicional(b)) {
      return {
        ...b,
        rotulo: b.rotulo.trim(),
        entao: normalizar(b.entao),
        senao: normalizar(b.senao),
      };
    }
    if (ehFeedback(b)) {
      /* Quadro sem texto não vira quadro vazio na tela: o corpo é o que ele
         serve, e um título sozinho seria um retângulo colorido dizendo
         "Próximo passo" e mais nada. */
      const passo = b.proximoPasso?.texto?.trim()
        ? {
            titulo: b.proximoPasso.titulo?.trim() || "Próximo passo",
            texto: b.proximoPasso.texto.trim(),
          }
        : undefined;

      return {
        ...b,
        titulo: b.titulo.trim(),
        mensagem: b.mensagem?.trim() || undefined,
        imagemUrl: b.imagemUrl?.trim() || undefined,
        cor: b.cor?.trim() || undefined,
        proximoPasso: passo,
      };
    }
    return { ...b, rotulo: b.rotulo.trim() };
  });
}

/**
 * Cria uma pesquisa: vazia, ou a partir de um arquivo.
 *
 * Importar **sempre cria uma nova**, com id novo e em rascunho. Nunca
 * sobrescreve: um arquivo errado apagaria trabalho de outra pessoa, e a pesquisa
 * de destino nem apareceria na conversa — quem importa está pensando no arquivo,
 * não no que já existe.
 */
export async function POST(req: Request) {
  const { nome, descricao, importada } = (await req.json()) as {
    nome?: string;
    descricao?: string;
    importada?: PesquisaPortavel;
  };

  const autor = usuarioAtual();
  if (!podePropor(autor)) {
    return NextResponse.json(
      { erro: "sem_permissao", detalhe: `${autor.nome} não pode criar pesquisas.` },
      { status: 403 },
    );
  }

  if (importada) return importar(importada, autor.id);

  if (!nome || !nome.trim()) {
    return NextResponse.json(
      { erro: "sem_nome", detalhe: "Dê um nome à pesquisa." },
      { status: 400 },
    );
  }

  const pesquisa = criarPesquisa(nome.trim(), descricao?.trim() || undefined);
  return NextResponse.json({ id: pesquisa.id });
}

function importar(p: PesquisaPortavel, autorId: string) {
  /*
   * A mesma validação da tela de montagem, e não uma segunda escrita aqui.
   * Um arquivo pode trazer árvore que a interface nunca deixaria montar — bloco
   * depois de um fim de caminho, condicional sem condição — e isso precisa ser
   * barrado na porta, não descoberto por quem for responder.
   */
  const problemas = validarPesquisa(p.blocos);
  if (temErro(problemas)) {
    return NextResponse.json(
      {
        erro: "pesquisa_invalida",
        detalhe: "A pesquisa do arquivo tem erro de montagem e não foi importada.",
        problemas: problemas.filter((x) => x.gravidade === "erro"),
      },
      { status: 400 },
    );
  }

  const pesquisa = criarPesquisa(p.nome, p.descricao);
  pesquisa.chamada = p.chamada;
  pesquisa.blocos = p.blocos;
  if (p.apresentacao) pesquisa.apresentacao = p.apresentacao;
  if (p.desfechos?.length) pesquisa.desfechos = p.desfechos;

  if (p.regras?.length) {
    const agora = new Date().toISOString();
    /*
     * A régua entra como v1 **já valendo**, e não como proposta em revisão.
     * Ela já foi revisada em algum lugar; obrigar uma revisão aqui deixaria a
     * pesquisa importada sem decidir nada até alguém aprovar o que veio pronto.
     * A trilha desta instalação começa agora, com quem importou.
     */
    const rs: RuleSet = {
      id: `rs_${Date.now().toString(36)}`,
      versao: 1,
      criadoEm: agora,
      criadoPor: autorId,
      descricao: p.descricaoDasRegras ?? "Critérios vindos de arquivo.",
      regras: p.regras,
      ativo: true,
      status: "ativo",
      propostoPor: autorId,
      propostaEm: agora,
      publicadoPor: autorId,
      publicadoEm: agora,
    };
    pesquisa.versoes = [rs];
    pesquisa.versaoAtivaId = rs.id;
  }

  salvarPesquisa(pesquisa);

  /*
   * As fontes não viajam com a pesquisa: são da instalação, com código que lê
   * bases que talvez só existam lá. Faltando alguma, a pesquisa entra parecendo
   * inteira e só falha quando alguém percorre a jornada — daí o aviso na hora.
   */
  const citadas = fontesCitadas(p);
  const hooks = listarHooks();
  const avisos: string[] = [];

  const semHook = citadas.hookIds.filter((id) => !hooks.some((h) => h.id === id));
  if (semHook.length) {
    avisos.push(
      `${semHook.length} bloco(s) de consulta apontam para fonte que não existe aqui. Importe a fonte e reaponte o bloco.`,
    );
  }

  const semPrefixo = citadas.prefixos.filter((pre) => !hooks.some((h) => h.prefixo === pre));
  if (semPrefixo.length) {
    avisos.push(
      `As condições leem ${semPrefixo.map((s) => `"${s}.*"`).join(", ")}, e nenhuma fonte daqui tem esse prefixo.`,
    );
  }

  return NextResponse.json({ id: pesquisa.id, avisos });
}

/**
 * Salva a árvore de blocos — no rascunho, ou no ar.
 *
 * Salvar mexe só no rascunho: enquanto havia uma cópia só, guardar uma pergunta
 * pela metade trocava a pergunta de quem estava respondendo naquele instante.
 * `publicar` é o que promove o rascunho para o ar, e faz as duas coisas numa
 * requisição só — separado, dava para gravar e falhar ao publicar, deixando a
 * pesquisa num meio-termo que ninguém pediu.
 *
 * Diferente das regras, isto não passa por revisão de outra pessoa: muda o que
 * se pergunta, não quem passa. A decisão continua vindo da versão publicada.
 */
export async function PUT(req: Request) {
  const { pesquisaId, blocos, publicar } = (await req.json()) as {
    pesquisaId: string;
    blocos: Bloco[];
    publicar?: boolean;
  };

  const autor = usuarioAtual();
  if (!podePropor(autor)) {
    return NextResponse.json(
      { erro: "sem_permissao", detalhe: `${autor.nome} não pode editar pesquisas.` },
      { status: 403 },
    );
  }

  const pesquisa = obterPesquisa(pesquisaId);
  if (!pesquisa) {
    return NextResponse.json({ erro: "pesquisa_nao_encontrada" }, { status: 404 });
  }
  if (!Array.isArray(blocos)) {
    return NextResponse.json({ erro: "payload_invalido" }, { status: 400 });
  }

  const problemas = validarPesquisa(blocos);
  if (temErro(problemas)) {
    return NextResponse.json(
      { erro: "pesquisa_invalida", problemas: problemas.filter((p) => p.gravidade === "erro") },
      { status: 400 },
    );
  }

  const normalizados = normalizar(blocos);

  if (publicar) {
    pesquisa.blocos = normalizados;
    pesquisa.blocosRascunho = undefined;
    pesquisa.status = "ativa";
  } else {
    /*
     * Rascunho igual ao publicado não é rascunho.
     *
     * Sem esta comparação, abrir a pesquisa e salvar sem mexer em nada já
     * acendia o aviso de "alterações não publicadas" — e um aviso que aparece
     * sozinho é um aviso que se aprende a ignorar.
     */
    const igual = JSON.stringify(normalizados) === JSON.stringify(pesquisa.blocos);
    pesquisa.blocosRascunho = igual ? undefined : normalizados;
  }
  pesquisa.atualizadaEm = new Date().toISOString();

  return NextResponse.json({
    ok: true,
    avisos: problemas.filter((p) => p.gravidade === "aviso"),
    temRascunho: pesquisa.blocosRascunho !== undefined,
  });
}

/**
 * Salva a configuração da pesquisa — tudo que não são os blocos.
 *
 * Separado do PUT de propósito: o construtor salva a árvore inteira a cada
 * "Salvar pesquisa", e mandar nome e status junto faria uma edição de
 * texto sobrescrever o que outra pessoa acabou de configurar na outra aba.
 */
export async function PATCH(req: Request) {
  const { pesquisaId, nome, descricao, status, chamada, apresentacao, desfechos, descartarRascunho } =
    (await req.json()) as {
      pesquisaId: string;
      desfechos?: Desfecho[];
      nome?: string;
      descricao?: string;
      status?: PesquisaStatus;
      chamada?: string;
      apresentacao?: Apresentacao;
      descartarRascunho?: boolean;
    };

  const autor = usuarioAtual();
  if (!podePropor(autor)) {
    return NextResponse.json(
      { erro: "sem_permissao", detalhe: `${autor.nome} não pode editar pesquisas.` },
      { status: 403 },
    );
  }

  const pesquisa = obterPesquisa(pesquisaId);
  if (!pesquisa) {
    return NextResponse.json({ erro: "pesquisa_nao_encontrada" }, { status: 404 });
  }
  if (nome !== undefined && !nome.trim()) {
    return NextResponse.json(
      { erro: "sem_nome", detalhe: "A pesquisa precisa de um nome." },
      { status: 400 },
    );
  }

  if (desfechos !== undefined) {
    const erro = validarDesfechos(desfechos, pesquisa);
    if (erro) return NextResponse.json({ erro: "desfechos_invalidos", detalhe: erro }, { status: 400 });
    pesquisa.desfechos = desfechos.map((d) => ({
      ...d,
      rotulo: d.rotulo.trim(),
      titulo: d.titulo.trim(),
      texto: d.texto?.trim() || undefined,
      proximoPasso: d.proximoPasso?.texto?.trim()
        ? {
            titulo: d.proximoPasso.titulo?.trim() || "Próximo passo",
            texto: d.proximoPasso.texto.trim(),
          }
        : undefined,
    }));
  }

  /* Jogar fora o rascunho é voltar ao que está no ar — não apaga nada
     publicado, e por isso não pede confirmação do servidor. */
  if (descartarRascunho) pesquisa.blocosRascunho = undefined;

  if (nome !== undefined) pesquisa.nome = nome.trim();
  if (descricao !== undefined) pesquisa.descricao = descricao.trim() || undefined;
  if (status !== undefined) pesquisa.status = status;
  if (chamada !== undefined) {
    /* O `maxLength` do campo é conveniência; a medida é aqui. Corta em vez de
       recusar: o painel salva sozinho enquanto se digita, e um 400 no meio da
       frase devolveria o texto anterior sem a pessoa entender por quê. */
    pesquisa.chamada = chamada.trim().slice(0, LIMITE_DO_TITULO) || undefined;
  }
  if (apresentacao !== undefined) {
    /*
     * O fundo e a entrada entram por lista, não por confiança no cliente.
     *
     * É o mesmo motivo de o fundo ser catálogo fechado na tela: aqui o valor
     * chega por HTTP, e um `fundo` desconhecido faria a capa não desenhar nada
     * — tela preta em produção por causa de um typo em um POST.
     */
    const fundo = FUNDOS_VALIDOS.includes(apresentacao.fundo)
      ? apresentacao.fundo
      : APRESENTACAO_PADRAO.fundo;
    const entrada = ENTRADAS_VALIDAS.includes(apresentacao.entrada)
      ? apresentacao.entrada
      : APRESENTACAO_PADRAO.entrada;

    /*
     * A pergunta do cartão passa pela mesma limpeza das perguntas do fluxo.
     *
     * Campo e enunciado vazios são gravados como vazios, e não trocados por um
     * padrão: quem está no meio de apagar para reescrever veria o texto antigo
     * voltar sozinho no campo. Quem recusa a pergunta incompleta é a leitura —
     * capa sem identificador não tem onde guardar a resposta e volta a ser
     * convite.
     */
    const p = apresentacao.pergunta;
    const pergunta: BlocoPergunta | undefined =
      entrada === "pergunta"
        ? {
            ...PERGUNTA_DA_CAPA_PADRAO,
            ...p,
            campo: p?.campo?.trim() ?? PERGUNTA_DA_CAPA_PADRAO.campo,
            rotulo: p?.rotulo?.trim() ?? PERGUNTA_DA_CAPA_PADRAO.rotulo,
            ajuda: p?.ajuda?.trim() || undefined,
            opcoes:
              p?.tipo === "opcao" || p?.tipo === "multipla"
                ? (p.opcoes ?? []).map((o) => o.trim()).filter(Boolean)
                : undefined,
            obrigatoria: true,
          }
        : undefined;

    pesquisa.apresentacao = {
      fundo,
      entrada,
      pergunta,
      rotuloDoConvite:
        entrada === "convite" ? apresentacao.rotuloDoConvite?.trim() || undefined : undefined,
    };
  }
  pesquisa.atualizadaEm = new Date().toISOString();

  return NextResponse.json({ ok: true });
}
