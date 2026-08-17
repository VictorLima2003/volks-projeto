import { decidir, montarFatos, proximaPergunta } from "./engine";
import { USUARIOS } from "./identidade";
import {
  Bloco,
  desfechosDa,
  Pedido,
  Pesquisa,
  RuleSet,
  SessaoMotorista,
  TipoPergunta,
} from "./types";

/**
 * Histórico sintético para as telas de análise terem o que mostrar.
 *
 * Existia um problema concreto: o seed trazia três sessões, e com três pontos
 * não há série temporal, não há distribuição e não há comparação de período —
 * qualquer gráfico vira um retângulo. Este módulo produz alguns meses de
 * movimento para as pesquisas cadastradas.
 *
 * Três decisões que sustentam o resto:
 *
 * 1. **O desfecho não é sorteado — é decidido.** O gerador sorteia os *fatos*
 *    (quantos meses, quantas corridas, se há restrição) e chama o mesmo
 *    `decidir()` que a jornada de verdade chama, com a régua ativa da própria
 *    pesquisa. Se alguém mudar o critério de 500 para 800 corridas, os números
 *    do painel mudam junto. Sorteando o desfecho, o painel mentiria na primeira
 *    alteração de regra.
 *
 * 2. **As respostas saem das perguntas da pesquisa**, lidas da árvore de blocos.
 *    Nada aqui sabe o que é "modelo" ou "concessionária": uma pergunta de opção
 *    é respondida com uma das opções dela, e pronto. É o que permite este
 *    gerador continuar servindo quando alguém cadastrar uma pesquisa de
 *    satisfação.
 *
 * 3. **É determinístico.** Mesma pesquisa, mesmo histórico — o `Math.random` faria
 *    os números dançarem a cada reinício do servidor, e ninguém conseguiria
 *    conferir se uma mudança de tela quebrou uma conta.
 */

// --------------------------------------------------------------------------
// Sorteio determinístico
// --------------------------------------------------------------------------

/** mulberry32 — pequeno, sem dependência, e boa o bastante para dado de vitrine. */
function sorteador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A semente sai do id da pesquisa: cada uma tem o seu histórico, sempre o mesmo. */
function sementeDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Sorteio = () => number;

const inteiro = (r: Sorteio, min: number, max: number) =>
  min + Math.floor(r() * (max - min + 1));

const escolher = <T,>(r: Sorteio, lista: readonly T[]): T => lista[Math.floor(r() * lista.length)];

const chance = (r: Sorteio, probabilidade: number) => r() < probabilidade;

/**
 * Puxa o sorteio para perto de zero: dois sorteios multiplicados concentram a
 * massa embaixo. Serve para "muita gente com pouca corrida, pouca gente com
 * muita" — distribuição uniforme daria um platô que não existe em base real.
 */
const enviesado = (r: Sorteio) => r() * r();

// --------------------------------------------------------------------------
// Gente de mentira
// --------------------------------------------------------------------------

const PRIMEIROS = [
  "Marcos", "Carla", "Diego", "Fernanda", "Rafael", "Juliana", "Anderson", "Patrícia",
  "Bruno", "Aline", "Rodrigo", "Camila", "Thiago", "Vanessa", "Leandro", "Priscila",
  "Everton", "Simone", "Wagner", "Renata", "Gilberto", "Débora", "Márcio", "Luciana",
  "Fábio", "Adriana", "Sérgio", "Tatiane", "Cláudio", "Elaine",
];

const SOBRENOMES = [
  "Andrade", "Mendes", "Ferreira", "Souza", "Oliveira", "Barbosa", "Ramos", "Pinheiro",
  "Cardoso", "Teixeira", "Moreira", "Nogueira", "Batista", "Correia", "Duarte", "Peixoto",
];

/** Praças por UF. É dado de vitrine — não há nenhuma regra do produto olhando para isto. */
const PRACAS: Record<string, string[]> = {
  SP: ["São Paulo", "Guarulhos", "Osasco", "Santo André", "Campinas"],
  RJ: ["Rio de Janeiro", "Niterói", "Duque de Caxias", "São Gonçalo"],
  MG: ["Belo Horizonte", "Contagem", "Uberlândia"],
  PR: ["Curitiba", "Londrina"],
};

/**
 * Documento sintético em formato de máscara.
 *
 * Não é CPF válido e não passa em dígito verificador de propósito: o campo é
 * identificador de respondente, e povoar um protótipo com número que passa em
 * validação é o começo de alguém achar que é gente de verdade.
 */
function documentoFalso(r: Sorteio): string {
  const bloco = () => String(inteiro(r, 100, 999));
  return `${bloco()}.${bloco()}.${bloco()}-${String(inteiro(r, 10, 99))}`;
}

// --------------------------------------------------------------------------
// Respostas a partir das perguntas da própria pesquisa
// --------------------------------------------------------------------------

/**
 * Percorre a pesquisa como quem responde percorre — perguntando ao motor qual é
 * a próxima e respondendo só essa.
 *
 * Achatar a árvore e responder tudo era o caminho curto e estava errado: quem
 * não foi achado na base cai no ramo da análise manual e **nunca vê** a pergunta
 * de modelo. Com a lista achatada, o painel mostraria preferência de modelo de
 * gente que jamais chegou lá, e o funil não fecharia com a lista de submissões.
 *
 * O teto de repetições é rede de segurança: uma pergunta cuja resposta não muda
 * o que o motor devolve — tipo sem valor gerável, por exemplo — deixaria isto
 * girando para sempre, e um seed que não termina trava o servidor inteiro.
 */
function percorrer(
  r: Sorteio,
  blocos: Bloco[],
  externos: Record<string, Record<string, unknown>>,
  contexto: { documento: string; nome: string },
  /** Quantas perguntas responder antes de largar. `Infinity` percorre até o fim. */
  ate = Infinity,
): Record<string, unknown> {
  const respostas: Record<string, unknown> = {};
  const teto = Math.min(40, ate);

  for (let i = 0; i < teto; i++) {
    const pergunta = proximaPergunta(blocos, montarFatos(respostas, externos));
    if (!pergunta) break;

    const valor = responder(r, pergunta, contexto);
    /* Sem valor gerável para o tipo, marca como vazia e segue: deixar a chave
       ausente faria o motor devolver a mesma pergunta na volta seguinte. */
    respostas[pergunta.campo] = valor === undefined ? "" : valor;
  }

  return respostas;
}

/**
 * Uma resposta plausível para o tipo — e nada além disso.
 *
 * `undefined` quer dizer "esta pergunta não foi respondida neste percurso", que
 * é o caso normal de quem caiu no outro ramo.
 */
function responder(
  r: Sorteio,
  pergunta: { campo: string; tipo: TipoPergunta; opcoes?: string[] },
  contexto: { documento: string; nome: string },
): unknown {
  switch (pergunta.tipo) {
    case "opcao":
      return pergunta.opcoes?.length ? escolher(r, pergunta.opcoes) : undefined;
    case "multipla":
      return pergunta.opcoes?.length
        ? pergunta.opcoes.filter(() => chance(r, 0.35)).join(", ") || pergunta.opcoes[0]
        : undefined;
    /* Recusa existe e precisa aparecer no painel: é um caminho legítimo da
       jornada, e uma amostra só de quem autorizou esconderia justamente a
       fatia que interessa a quem acompanha. */
    case "consentimento":
      return chance(r, 0.93);
    case "cpf":
      return contexto.documento;
    case "email": {
      const [primeiro] = contexto.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(" ");
      return `${primeiro}.${inteiro(r, 10, 99)}@exemplo.com.br`;
    }
    case "telefone":
      return `(${inteiro(r, 11, 61)}) 9${inteiro(r, 1000, 9999)}-${inteiro(r, 1000, 9999)}`;
    case "numero":
      return inteiro(r, 1, 100);
    case "data":
      return `19${inteiro(r, 70, 99)}-${String(inteiro(r, 1, 12)).padStart(2, "0")}-${String(inteiro(r, 1, 28)).padStart(2, "0")}`;
    default:
      return undefined;
  }
}

// --------------------------------------------------------------------------
// Fatos das consultas
// --------------------------------------------------------------------------

/**
 * O que os hooks do seed devolvem, com as mesmas chaves.
 *
 * Isto é a única parte do arquivo que conhece nome de campo, e conhece de
 * propósito: são os fatos que as réguas do seed leem. Uma pesquisa com outros
 * hooks simplesmente não recebe nada aqui, e o histórico dela sai só com as
 * respostas — que é o comportamento correto, não uma falha.
 */
function fatosExternos(r: Sorteio, ufPreferida: string, nome: string) {
  const naBase = chance(r, 0.86);
  if (!naBase) {
    return {
      uber: { encontrado: false },
      credito: { encontrado: false },
    };
  }

  /* Meses e corridas andam juntos: quem roda há mais tempo tem mais corridas.
     Sorteados soltos, apareceria gente com 2 meses e 4000 viagens, e a régua
     de elegibilidade viraria ruído. */
  const meses = 1 + Math.floor(enviesado(r) * 47);
  const porMes = inteiro(r, 55, 210);
  const corridas = Math.round(meses * porMes * (0.75 + r() * 0.5));

  const uf = chance(r, 0.78) ? ufPreferida : escolher(r, Object.keys(PRACAS));
  const status = chance(r, 0.93) ? "ativo" : chance(r, 0.5) ? "suspenso" : "inativo";

  const temRestricao = chance(r, 0.15);
  const score = temRestricao ? inteiro(r, 320, 560) : inteiro(r, 540, 950);

  return {
    uber: {
      encontrado: true,
      nome,
      cidade: escolher(r, PRACAS[uf] ?? PRACAS.SP),
      uf,
      mesesUber: meses,
      corridas,
      status,
      rating: Number((4.4 + r() * 0.6).toFixed(2)),
      divergencia: chance(r, 0.06),
    },
    credito: {
      encontrado: chance(r, 0.96),
      score,
      temRestricao,
      limite: temRestricao ? 0 : Math.round((score - 500) * 180),
    },
  };
}

// --------------------------------------------------------------------------
// Movimento no tempo
// --------------------------------------------------------------------------

/**
 * Quantas jornadas começam num dia.
 *
 * Três forças, e nenhuma é enfeite: a **tendência** faz a pesquisa crescer
 * depois do lançamento e cair perto do fim, o **fim de semana** derruba o
 * volume (é jornada feita no intervalo do trabalho), e o **ruído** evita a
 * curva perfeita que denuncia dado inventado.
 */
function volumeDoDia(r: Sorteio, diaIndex: number, totalDias: number, pico: number): number {
  const fase = diaIndex / totalDias;
  const tendencia = Math.sin(Math.PI * Math.min(1, fase * 1.15)) * 0.85 + 0.15;
  const diaDaSemana = diaIndex % 7;
  const fimDeSemana = diaDaSemana === 5 || diaDaSemana === 6 ? 0.45 : 1;
  const ruido = 0.65 + r() * 0.7;
  return Math.max(0, Math.round(pico * tendencia * fimDeSemana * ruido));
}

export interface HistoricoGerado {
  sessoes: SessaoMotorista[];
  pedidos: Pedido[];
}

interface Janela {
  /** Há quantos dias esta pesquisa começou a receber respostas. */
  dias: number;
  /** Teto de jornadas por dia no melhor momento. */
  pico: number;
}

/**
 * A janela vem do cadastro da pesquisa, não de uma tabela por id.
 *
 * Uma pesquisa criada há duas semanas não pode ter três meses de histórico — e
 * amarrar isso a `pesq_polo_rj` colocaria um id de negócio dentro da lógica.
 */
function janelaDe(pesquisa: Pesquisa, agora: Date): Janela {
  const nascimento = new Date(pesquisa.criadaEm).getTime();
  const idade = Math.floor((agora.getTime() - nascimento) / 86_400_000);
  const dias = Math.min(150, Math.max(21, idade));
  /* Pesquisa pausada ou encerrada recebeu menos gente — o painel de uma oferta
     que saiu do ar não pode parecer o de uma no auge. */
  const pico = pesquisa.status === "ativa" ? 7 : 3;
  return { dias, pico };
}

/**
 * O vendedor de uma concessionária, quando existe.
 *
 * Sem vendedor cadastrado naquela loja **não se inventa pedido**. A alternativa
 * era apontar o pedido para alguém que não trabalha lá, e aí a tabela "pedidos
 * por vendedor" viraria ficção — justamente a tabela que alguém usaria para
 * cobrar meta.
 */
function vendedorDe(concessionaria: unknown): { id: string; loja: string } | null {
  if (typeof concessionaria !== "string") return null;
  const u = USUARIOS.find((x) => x.concessionaria === concessionaria);
  return u?.concessionaria ? { id: u.id, loja: u.concessionaria } : null;
}

export function gerarHistorico(pesquisas: Pesquisa[], agora = new Date()): HistoricoGerado {
  const sessoes: SessaoMotorista[] = [];
  const pedidos: Pedido[] = [];

  for (const pesquisa of pesquisas) {
    const r = sorteador(sementeDe(pesquisa.id));
    const { dias, pico } = janelaDe(pesquisa, agora);
    const desfechos = desfechosDa(pesquisa);
    const regua: RuleSet | undefined =
      pesquisa.versoes.find((v) => v.id === pesquisa.versaoAtivaId) ?? pesquisa.versoes[0];
    const ufPreferida = pesquisa.id.includes("rj") ? "RJ" : "SP";

    for (let d = dias; d >= 0; d--) {
      const quantas = volumeDoDia(r, dias - d, dias, pico);

      for (let i = 0; i < quantas; i++) {
        const nome = `${escolher(r, PRIMEIROS)} ${escolher(r, SOBRENOMES)}`;
        const documento = documentoFalso(r);

        /* Horário comercial esticado: a jornada é feita entre corridas, e a
           cauda da noite existe. Minuto sorteado para o gráfico por hora não
           sair em degraus redondos. */
        const inicio = new Date(agora);
        inicio.setDate(inicio.getDate() - d);
        inicio.setHours(inteiro(r, 7, 22), inteiro(r, 0, 59), inteiro(r, 0, 59), 0);

        const externos = fatosExternos(r, ufPreferida, nome);

        /*
         * Nem todo mundo termina — e o funil depende disso.
         *
         * Sem abandono, "iniciaram 326 → concluíram 324" não é funil, é uma
         * linha reta: a taxa de conclusão dava 99% e a etapa mais importante do
         * gráfico não media nada. Gente larga jornada no meio, e é justamente
         * onde larga que quem acompanha precisa olhar.
         *
         * Quem largou há três meses não está "em andamento": está abandonada.
         * `em_andamento` fica reservado para os últimos dois dias, que é o que
         * a tela de submissões trata como parada recente.
         */
        const desistiu = chance(r, 0.14);
        const aindaNoAr = d <= 2 && chance(r, 0.35);
        const parouNoMeio = desistiu && !aindaNoAr;

        const respostas = percorrer(
          r,
          pesquisa.blocos,
          externos,
          { documento, nome },
          parouNoMeio || aindaNoAr ? inteiro(r, 0, 2) : Infinity,
        );

        const duracaoMin = inteiro(r, 2, 14);
        const fim = new Date(inicio.getTime() + duracaoMin * 60_000);

        const sessao: SessaoMotorista = {
          id: `s_${pesquisa.id}_${d}_${i}`,
          pesquisaId: pesquisa.id,
          cpf: documento,
          iniciadaEm: inicio.toISOString(),
          atualizadaEm: fim.toISOString(),
          status: aindaNoAr ? "em_andamento" : parouNoMeio ? "abandonada" : "concluida",
          externos,
          respostas,
        };

        if (!aindaNoAr && !parouNoMeio && regua) {
          const decisao = decidir(regua, montarFatos(respostas, externos), desfechos);
          /* `decidir` carimba a hora de agora; esta decisão é de meses atrás. */
          decisao.decididoEm = fim.toISOString();
          sessao.resultado = decisao;
          sessao.ruleSetVersao = regua.versao;
        }

        sessoes.push(sessao);

        /*
         * Pedido só nasce de jornada liberada, e nem toda liberada vira pedido:
         * a pessoa precisa aparecer na loja. A taxa aqui é o que dá sentido ao
         * indicador de conversão — se toda liberada virasse pedido, o número
         * seria 100% para sempre e não mediria nada.
         */
        if (sessao.resultado?.efeito === "libera" && chance(r, 0.62)) {
          const vendedor = vendedorDe(respostas.concessionaria);
          if (vendedor) {
            const criado = new Date(fim.getTime() + inteiro(r, 1, 96) * 3_600_000);
            if (criado <= agora) {
              pedidos.push({
                id: `ped_${pesquisa.id}_${d}_${i}`,
                pesquisaId: pesquisa.id,
                cpf: documento,
                vendedor: vendedor.id,
                concessionaria: vendedor.loja,
                modelo: typeof respostas.modelo === "string" ? respostas.modelo : "A definir",
                criadoEm: criado.toISOString(),
                /* A venda leva dias para fechar: pedido de ontem ainda está
                   liberado, não concluído. */
                status: chance(r, 0.42) ? "concluido" : chance(r, 0.12) ? "em_analise" : "liberado",
              });
            }
          }
        }
      }
    }
  }

  return { sessoes, pedidos };
}
