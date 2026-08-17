// ============================================================================
// Domínio: plataforma de pesquisas com decisão automatizada.
// Nada aqui conhece um caso de negócio específico — o vocabulário do caso
// vive em `seed.ts` e nos dados de cada pesquisa.
// ============================================================================

export type UUID = string;

export type PesquisaStatus = "rascunho" | "ativa" | "pausada" | "encerrada";

/**
 * A pesquisa é a unidade do sistema: o questionário, quem responde a ele e o
 * que se decide no fim.
 *
 * Ela já foi duas coisas — havia uma "campanha" que carregava a oferta e
 * apontava para um questionário reutilizável. Não se sustentou: uma pesquisa de
 * satisfação não tem verba nem vigência, e na prática ninguém compartilha
 * questionário entre ofertas — duplica e ajusta o que difere, que é mais barato
 * do que manter sincronizado o que é comum. Duas entidades viravam dois
 * cadastros para criar uma coisa só.
 *
 * O vocabulário do caso de uso continua fora daqui: quais modelos a oferta tem,
 * por exemplo, é uma pergunta da própria pesquisa, com as opções dela — não um
 * campo deste tipo nem um texto paralelo.
 */
export interface Pesquisa {
  id: UUID;
  nome: string;
  descricao?: string;
  status: PesquisaStatus;
  /**
   * A árvore que está **no ar** — a que o respondente percorre.
   *
   * É uma árvore, não uma lista plana: o condicional carrega os ramos dentro
   * de si.
   */
  blocos: Bloco[];
  /**
   * A árvore em edição, quando ela difere da publicada.
   *
   * Ausente quer dizer "não há nada por publicar", e é o estado normal. Existe
   * porque antes havia uma cópia só: salvar uma pergunta enquanto a pesquisa
   * estava no ar trocava a pergunta de quem estava respondendo, com o mesmo
   * clique que guarda um rascunho. Regra já tinha proposta separada do que
   * vale; pergunta não tinha.
   */
  blocosRascunho?: Bloco[];
  /**
   * As regras que decidem o desfecho, guardadas por versão.
   *
   * Moram aqui porque regra é condição sobre o que a própria pesquisa coletou —
   * separá-las numa coleção do sistema criava uma seção à parte para editar
   * algo que só faz sentido ao lado das perguntas que alimentam a condição.
   *
   * Vazio é legítimo: pesquisa que só coleta — satisfação, cadastro — não
   * decide nada, e exigir regra obrigaria a inventar um critério para jogar
   * fora.
   */
  versoes: RuleSet[];
  /** Qual versão vale hoje. Ausente quando nenhuma foi publicada ainda. */
  versaoAtivaId?: UUID;
  /**
   * Credenciais de leitura desta pesquisa, para quem consome de fora.
   *
   * Moram na pesquisa, e não numa lista global, porque é assim que se entrega
   * acesso na prática: a analista que vai plugar o Power BI naquela pesquisa
   * recebe um token daquela pesquisa. Revogar um não derruba os outros.
   */
  tokens?: TokenApi[];
  /**
   * Os fins possíveis desta pesquisa.
   *
   * Ausente em pesquisa criada antes deste passo — quem lê cai em
   * `DESFECHOS_PADRAO`, que são exatamente os cinco de sempre, com os mesmos
   * ids. É o que faz as regras já gravadas continuarem apontando para algo.
   */
  desfechos?: Desfecho[];
  /**
   * O título que quem responde lê na tela de entrada.
   *
   * Existe como campo, e não como texto solto num saco de chaves livres, porque
   * governa o que aparece na tela: enquanto era uma chave chamada "Chamada",
   * bastava alguém escrever errado para o título virar o nome interno da
   * pesquisa, sem aviso nenhum.
   */
  chamada?: string;

  /**
   * Como é a tela de entrada — a capa que quem responde vê antes da primeira
   * pergunta.
   *
   * Opcional porque pesquisa antiga não tem: quem lê cai no padrão. Ver
   * `APRESENTACAO_PADRAO`.
   */
  apresentacao?: Apresentacao;
  /** A etapa fixa de autorização. Ver `CONSENTIMENTO_PADRAO`. */
  consentimento?: Consentimento;
  criadaEm: string;
  atualizadaEm: string;
}

/**
 * Uma credencial de leitura externa.
 *
 * `valor` é o segredo em texto — protótipo, sem hash. Está registrado como
 * limitação: num sistema de verdade guarda-se o hash e mostra-se o valor uma
 * vez só, na criação.
 */
export interface TokenApi {
  id: UUID;
  /** Para quem/para quê — é o que permite revogar o certo depois. */
  nome: string;
  valor: string;
  criadoEm: string;
  criadoPor: string;
  ultimoUsoEm?: string;
}

// --- A capa da pesquisa -----------------------------------------------------

/**
 * Teto do título da capa, em caracteres.
 *
 * Não é gosto: o título ocupa metade da dobra em corpo grande, e passando disso
 * ele desce por cima do cartão de entrada ou encolhe a ponto de deixar de ser
 * título. As duas chamadas do piloto têm 46 e 56 caracteres — o teto dá folga
 * para uma frase inteira e barra o parágrafo disfarçado de manchete.
 */
export const LIMITE_DO_TITULO = 70;

/**
 * O fundo da capa, por nome — não por cor.
 *
 * É catálogo fechado de propósito. Campo livre de cor faria a primeira pesquisa
 * roxa em cima do azul da marca, e a paleta aqui é travada: o gestor escolhe
 * entre formas que já foram desenhadas, não pinta uma nova.
 */
export type FundoDaCapa = "persianas" | "gradiente" | "trama" | "liso" | "malha";

/**
 * O que o cartão da capa faz.
 *
 * `pergunta` colhe uma informação ali mesmo, antes de a jornada começar.
 * `convite` só chama para começar, e tudo é perguntado lá dentro.
 *
 * A diferença não é estética: no `pergunta`, a resposta chega pronta e o campo
 * correspondente já entra respondido; no `convite`, nada chega.
 */
export type EntradaDaCapa = "pergunta" | "convite";

export interface Apresentacao {
  fundo: FundoDaCapa;
  entrada: EntradaDaCapa;
  /**
   * O que o cartão pergunta — quando pergunta.
   *
   * É uma `BlocoPergunta`, o mesmo tipo das perguntas do fluxo, e não uma
   * estrutura própria. Foi de propósito: o cartão pedia CPF porque este caso
   * pede CPF, mas a porta de entrada de uma pesquisa pode ser um e-mail, um
   * telefone, um código de convite ou uma matrícula. Reusando o tipo, todos os
   * formatos que o construtor já sabe editar valem aqui, e a resposta entra no
   * mesmo espaço de fatos (`resposta.<identificador>`) sem nenhum caminho novo.
   *
   * Ela não faz parte da árvore de blocos: não tem ramo, não tem consulta, e o
   * motor não a percorre — é o que a capa entrega já respondido.
   */
  pergunta?: BlocoPergunta;
  /** Só no `convite`: o texto do botão. Vazio cai em "Começar". */
  rotuloDoConvite?: string;
}

/**
 * A pergunta que o cartão faz quando ninguém escolheu outra.
 *
 * CPF porque é o que a primeira pesquisa do sistema usava — não porque o
 * produto saiba o que é um CPF. Trocar tipo e identificador é uma edição no
 * painel do cartão.
 */
export const PERGUNTA_DA_CAPA_PADRAO: BlocoPergunta = {
  id: "capa_pergunta",
  bloco: "pergunta",
  campo: "cpf",
  rotulo: "Seu CPF",
  tipo: "cpf",
  obrigatoria: true,
};

/** O que existia antes de a capa ser configurável — e o que pesquisa velha usa. */
/**
 * A autorização para consultar dados, como etapa fixa depois da capa.
 *
 * Não é um bloco da árvore, e isso é a decisão. Como bloco, ela podia ser
 * apagada sem querer, arrastada para depois de um fim de caminho, ou
 * simplesmente não existir numa pesquisa criada às pressas — e a pergunta
 * "com que base vocês consultaram o CPF dessa pessoa?" ficaria sem resposta
 * justamente na pesquisa em que ninguém pensou nisso.
 *
 * Como etapa estrutural, ela existe em toda pesquisa, inclusive nas importadas
 * de fora. O que se edita é o texto; o que não se edita é a existência dela —
 * fora desligá-la de propósito, que é uma decisão consciente e registrada.
 *
 * O campo é sempre `consentimento`, e por isso as condições podem lê-lo como
 * `resposta.consentimento` em qualquer pesquisa.
 */
export const CAMPO_DO_CONSENTIMENTO = "consentimento";

export interface Consentimento {
  ativo: boolean;
  pergunta: string;
  ajuda?: string;
  tituloDaRecusa: string;
  mensagemDaRecusa: string;
}

export const CONSENTIMENTO_PADRAO: Consentimento = {
  ativo: true,
  pergunta: "Podemos consultar seus dados para conferir se você tem direito?",
  ajuda: "É o que evita pedir comprovante e print para você.",
  tituloDaRecusa: "Sem a autorização, não temos como conferir",
  mensagemDaRecusa:
    "Nada foi consultado e nada fica guardado. Você pode voltar e autorizar quando quiser, ou falar com uma concessionária.",
};

export function consentimentoDe(pesquisa: { consentimento?: Consentimento }): Consentimento {
  return pesquisa.consentimento ?? CONSENTIMENTO_PADRAO;
}

/**
 * A etapa traduzida para os blocos que o motor já sabe percorrer.
 *
 * Em vez de ensinar a jornada, a régua de progresso, o mapa e o "voltar" a
 * conhecer um passo especial, a etapa é convertida nos dois blocos que
 * descrevem exatamente o mesmo comportamento. Tudo que já funciona para uma
 * pergunta passa a funcionar para ela sem uma linha nova.
 *
 * A condição é `existe` **e** `é falso`, e não só `é falso`: `falsy` sozinho
 * também casa com "ainda não respondeu", e aí o percurso inteiro apareceria
 * truncado no primeiro passo, prometendo uma jornada de dois passos que vira de
 * cinco assim que a pessoa autoriza.
 */
export function blocosDoConsentimento(c: Consentimento): Bloco[] {
  if (!c.ativo) return [];
  return [
    {
      id: "__consentimento__",
      bloco: "pergunta",
      campo: CAMPO_DO_CONSENTIMENTO,
      rotulo: c.pergunta,
      ajuda: c.ajuda,
      tipo: "consentimento",
      obrigatoria: true,
    },
    {
      id: "__sem_consentimento__",
      bloco: "condicional",
      rotulo: "Não autorizou",
      condicao: {
        todas: [
          { fato: `resposta.${CAMPO_DO_CONSENTIMENTO}`, operador: "exists" },
          { fato: `resposta.${CAMPO_DO_CONSENTIMENTO}`, operador: "falsy" },
        ],
        fato: "",
        operador: "truthy",
      },
      entao: [
        {
          id: "__fim_sem_consentimento__",
          bloco: "feedback",
          tipo: "info",
          titulo: c.tituloDaRecusa,
          mensagem: c.mensagemDaRecusa,
        },
      ],
      senao: [],
    },
  ];
}

/** A árvore como o respondente a percorre: a etapa fixa antes do que foi montado. */
export function blocosParaResponder(pesquisa: {
  blocos: Bloco[];
  consentimento?: Consentimento;
}): Bloco[] {
  return [...blocosDoConsentimento(consentimentoDe(pesquisa)), ...pesquisa.blocos];
}

export const APRESENTACAO_PADRAO: Apresentacao = {
  fundo: "persianas",
  entrada: "pergunta",
  pergunta: PERGUNTA_DA_CAPA_PADRAO,
};

// --- Pesquisa: árvore de blocos ---------------------------------------------
export type TipoPergunta =
  | "texto"
  | "numero"
  | "cpf"
  | "email"
  | "telefone"
  | "data"
  | "opcao"
  | "multipla"
  | "consentimento";

/**
 * Uma pergunta é um bloco da cadeia. `campo` é o identificador da resposta —
 * é por ele que as regras e as condições referenciam o que foi respondido.
 */
export interface BlocoPergunta {
  id: UUID;
  bloco: "pergunta";
  campo: string;
  rotulo: string;
  ajuda?: string;
  tipo: TipoPergunta;
  opcoes?: string[];
  obrigatoria: boolean;
}

/**
 * A condicional também é um bloco da cadeia, não um atributo escondido dentro
 * da pergunta. Quando resolvida, ela abre a ramificação correspondente —
 * é isso que dá a árvore.
 */
export interface BlocoCondicional {
  id: UUID;
  bloco: "condicional";
  rotulo: string;
  condicao: Condicao;
  entao: Bloco[];
  senao: Bloco[];
}

/**
 * Gatilho de busca externa: quando o fluxo chega aqui, o sistema consulta a
 * fonte usando uma resposta já coletada (o CPF, tipicamente) e injeta o
 * resultado como fatos. É GET, não push — o fluxo puxa o dado quando precisa.
 */
export interface BlocoConsulta {
  id: UUID;
  bloco: "consulta";
  rotulo: string;
  hookId: UUID;
  /**
   * De onde sai cada parâmetro do hook: nome do parâmetro → identificador de
   * uma resposta já coletada. Um valor entre aspas é tratado como literal.
   */
  argumentos: Record<string, string>;
  /** Se a busca falhar, seguir mesmo assim ou tratar como erro. */
  obrigatoria: boolean;
}

export type TipoFeedback = "sucesso" | "info" | "warning" | "error";

/**
 * Fim de caminho. O fluxograma tem um final, e esse final pode ser
 * condicionado — daí o feedback viver dentro de um ramo. Nenhum bloco pode
 * vir depois dele: quando o fluxo chega aqui, acabou.
 */
export interface BlocoFeedback {
  id: UUID;
  bloco: "feedback";
  tipo: TipoFeedback;
  titulo: string;
  mensagem?: string;
  imagemUrl?: string;
  /** Cor de destaque em hex; vazio usa a cor padrão do tipo. */
  cor?: string;
  /**
   * Os números trazidos pelas consultas, em cartões — como na tela de veredito.
   *
   * Quais números, o bloco não escolhe: são os fatos numéricos que os hooks
   * trouxeram até aqui. Num fim de caminho que corta antes de qualquer consulta
   * a lista sai vazia e a seção some sozinha.
   */
  mostrarNumeros?: boolean;
  /** O quadro destacado do fim: o que a pessoa faz agora. */
  proximoPasso?: { titulo: string; texto: string };
}

export type Bloco = BlocoPergunta | BlocoCondicional | BlocoConsulta | BlocoFeedback;

export function ehPergunta(b: Bloco): b is BlocoPergunta {
  return b.bloco === "pergunta";
}
export function ehCondicional(b: Bloco): b is BlocoCondicional {
  return b.bloco === "condicional";
}
export function ehConsulta(b: Bloco): b is BlocoConsulta {
  return b.bloco === "consulta";
}
export function ehFeedback(b: Bloco): b is BlocoFeedback {
  return b.bloco === "feedback";
}

/** Cor padrão de cada tipo, quando o autor não escolhe uma. */
export const COR_FEEDBACK: Record<TipoFeedback, string> = {
  sucesso: "#0E7C3A",
  info: "#001E50",
  warning: "#96560B",
  error: "#BB0B22",
};

// --- Hooks de código --------------------------------------------------------

/** Um parâmetro de entrada do hook, preenchido no bloco de consulta. */
export interface ParametroHook {
  /** Nome da variável dentro do código. */
  nome: string;
  rotulo: string;
  descricao?: string;
}

/** Arquivo anexado ao hook, acessível pelo código via `arquivo(nome)`. */
export interface AnexoHook {
  nome: string;
  conteudo: string;
}

/**
 * Um hook é código que busca e trata dados. Ele substitui a antiga separação
 * entre "fonte CSV" e "fonte API": o próprio código decide se faz `fetch`,
 * se lê um CSV anexado ou se combina os dois.
 *
 * O que ele retorna vira fato sob o `prefixo`, disponível nas condicionais
 * e nas regras.
 */
/**
 * Para onde o código olha: fonte traz dado de fora, destino leva dado para fora.
 *
 * É a mesma máquina nos dois sentidos — editor, execução, anexos, registro de
 * erro. O que muda é quando roda e o que recebe: a fonte roda no meio da jornada
 * e devolve fatos; o destino roda quando a jornada fecha e recebe o que foi
 * decidido.
 *
 * Opcional porque hook gravado antes disto não tem o campo, e ele é fonte.
 */
export type TipoDeHook = "fonte" | "destino";

export interface Hook {
  id: UUID;
  nome: string;
  tipo?: TipoDeHook;
  descricao?: string;
  /** Prefixo dos fatos retornados: "credito" → credito.score, credito.limite. */
  prefixo: string;
  parametros: ParametroHook[];
  /** Exibido ao respondente enquanto o hook executa. */
  mensagemCarregando: string;
  /**
   * Como cada fato retornado deve ser escrito na tela: `{ temRestricao: "Tem
   * restrição" }`.
   *
   * Existe porque a chave é identificador de código e não leva acento. Sem isto,
   * a interface só podia separar o camelCase e subir a inicial — e `temRestricao`
   * aparecia como "Tem Restricao", errado em português. Quem sabe escrever o
   * nome direito é quem escreveu o hook.
   *
   * Opcional e parcial: o que não estiver aqui continua caindo na regra
   * mecânica, e o motor segue sem conhecer nenhum campo por nome.
   */
  rotulos?: Record<string, string>;
  /** Corpo de uma função assíncrona. Recebe os parâmetros por nome. */
  codigo: string;
  anexos: AnexoHook[];
  ativo: boolean;
}

// --- Regras (motor) ---------------------------------------------------------
export type Operador =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "contem"
  | "naoContem"
  | "comecaCom"
  | "in"
  | "notIn"
  | "exists"
  | "missing"
  | "truthy"
  | "falsy";

export interface Condicao {
  /** Caminho do fato: "resposta.<campo>" ou "<prefixoDoHook>.<chave>". */
  fato: string;
  operador: Operador;
  /** Valor literal digitado pelo autor. */
  valor?: unknown;
  /**
   * Comparar contra OUTRO fato em vez de um literal. Quando presente, tem
   * precedência sobre `valor` — é o que permite "resposta A maior que resposta B".
   */
  valorFato?: string;
  todas?: Condicao[];          // AND
  qualquer?: Condicao[];       // OR
}

/**
 * O que um desfecho faz **no sistema** — e não o que ele quer dizer para quem lê.
 *
 * É um enum pequeno e de propósito: o vendedor precisa saber se libera o pedido,
 * o painel precisa contar quantas seguraram, a central precisa achar as que
 * pararam. Nenhum deles precisa saber que o desfecho se chama "elegível".
 *
 * A divisão é essa: o **rótulo** é do caso de uso e o autor escreve; o **efeito**
 * é do sistema e a lista é fechada. Enquanto os dois eram a mesma string, uma
 * pesquisa de satisfação não podia ter desfecho nenhum sem herdar a esteira
 * comercial junto.
 */
export type EfeitoDoDesfecho = "libera" | "segura" | "recusa";

/**
 * Um fim possível da pesquisa, nomeado por quem a montou.
 *
 * Mora dentro da `Pesquisa`, como as regras — é vocabulário do caso, não do
 * produto. As regras apontam para o `id`; a tela final do respondente sai de
 * `titulo`, `texto` e `proximoPasso`.
 */
export interface Desfecho {
  id: string;
  /** Como este fim se chama para quem trabalha na pesquisa. */
  rotulo: string;
  efeito: EfeitoDoDesfecho;
  /** Selo e cor da tela final — a mesma escala do resto do sistema. */
  tom: "go" | "stop" | "espera" | "neutro";
  /**
   * O título que quem responde lê. `{nome}` é trocado pelo primeiro nome, quando
   * algum hook tiver trazido um — é o que fazia a saudação, antes chumbada.
   */
  titulo: string;
  texto?: string;
  proximoPasso?: { titulo: string; texto: string };
}

/**
 * Os cinco desfechos com que toda pesquisa nasce.
 *
 * O texto é **exatamente** o que estava chumbado na jornada, inclusive as
 * reticências e o `{identificador}` no lugar do CPF mascarado. Isso não é
 * nostalgia: é o que permite este passo não mudar nenhuma tela. O que muda é de
 * onde o texto vem — e, a partir do próximo passo, quem pode reescrevê-lo.
 *
 * `{nome}` e `{identificador}` são as duas únicas trocas: o primeiro nome
 * trazido por algum hook, e o dado que a capa colheu. Sem hook que traga nome, a
 * frase se resolve sem a saudação, como sempre se resolveu.
 */
export const DESFECHOS_PADRAO: Desfecho[] = [
  {
    id: "elegivel",
    rotulo: "Elegível",
    efeito: "libera",
    tom: "go",
    titulo: "{nome}você está elegível!",
    texto:
      "Suas condições especiais estão liberadas. Um vendedor da concessionária escolhida vai te procurar.",
    proximoPasso: {
      titulo: "Próximo passo",
      texto:
        "Leve seu CPF {identificador} à concessionária. O vendedor consulta e o pedido já sai liberado.",
    },
  },
  {
    id: "nao_elegivel",
    rotulo: "Não elegível",
    efeito: "recusa",
    tom: "stop",
    /* As reticências não são estilo: "ainda não é dessa vez." fecha o assunto,
       com reticências deixa a porta aberta — que é o que a frase seguinte
       promete. */
    titulo: "{nome}ainda não é dessa vez...",
    texto: "Você pode voltar assim que atingir os critérios. Nada se perde.",
  },
  {
    id: "pendente_validacao",
    rotulo: "Pendente de validação",
    efeito: "segura",
    tom: "espera",
    /* "seu caso" é jargão de central de atendimento, e transforma quem responde
       em processo. Aqui somos nós que fazemos alguma coisa. */
    titulo: "{nome}vamos analisar seu pedido.",
    texto: "Nossa central analisa manualmente e retorna pelo canal que você informou.",
  },
  {
    id: "revalidar",
    rotulo: "Revalidar",
    efeito: "segura",
    tom: "espera",
    titulo: "{nome}precisamos confirmar seus dados.",
    texto: "Encontramos uma divergência. A central vai entrar em contato para confirmar.",
  },
  {
    id: "erro",
    rotulo: "Erro",
    efeito: "segura",
    tom: "stop",
    titulo: "{nome}não conseguimos decidir agora...",
    texto: "Houve um problema na consulta. Sua solicitação foi encaminhada para análise.",
  },
];

/** Os desfechos desta pesquisa — com o padrão para quem foi criada antes deles. */
export function desfechosDa(pesquisa: { desfechos?: Desfecho[] }): Desfecho[] {
  return pesquisa.desfechos?.length ? pesquisa.desfechos : DESFECHOS_PADRAO;
}

/**
 * O desfecho de um id, com uma saída para o id que não existe mais.
 *
 * Regra apontando para desfecho apagado é possível — e a tela precisa mostrar
 * alguma coisa em vez de quebrar. O que ela mostra é o próprio id, com efeito de
 * `segura`: na dúvida, não libera nada.
 */
export function acharDesfecho(desfechos: Desfecho[] | undefined, id: string): Desfecho {
  return (
    desfechos?.find((d) => d.id === id) ?? {
      id,
      rotulo: id,
      efeito: "segura",
      tom: "neutro",
      titulo: "Resultado indisponível",
      texto: "Este desfecho não existe mais nesta pesquisa.",
    }
  );
}

export interface Regra {
  id: UUID;
  nome: string;
  condicao: Condicao;
  /** O `id` do desfecho desta pesquisa — não mais um enum do produto. */
  resultado: string;
  motivo: string;              // mensagem exibida (motorista/vendedor)
  proximaAcao?: string;        // orientação p/ vendedor/central
  prioridade: number;          // menor = maior prioridade
}

/**
 * Uma versão só entra em produção depois de **revisada** por alguém diferente
 * de quem a propôs. `arquivado` é a versão que já valeu e foi substituída.
 *
 * O nome mudou de "aprovação" para "revisão" porque a palavra fazia dois
 * trabalhos no sistema: aqui é governança — alguém confere a versão da regra
 * antes de ela valer — e no fim da jornada era o veredito sobre a pessoa. Duas
 * coisas sem relação com o mesmo rótulo, e a confusão aparecia na conversa.
 * O veredito virou `Desfecho`, nomeado por quem monta; isto aqui é revisão.
 */
export type RuleSetStatus = "em_revisao" | "ativo" | "recusado" | "arquivado";

export interface RuleSet {
  id: UUID;
  versao: number;
  criadoEm: string;
  criadoPor: string;
  descricao: string;
  regras: Regra[];
  ativo: boolean;

  status: RuleSetStatus;
  propostoPor: string;
  propostaEm: string;
  /** Quem publicou a versão — nunca a mesma pessoa que propôs. */
  publicadoPor?: string;
  publicadoEm?: string;
  recusadoPor?: string;
  recusadoEm?: string;
  motivoRecusa?: string;
}

// --- Respostas / Sessões ----------------------------------------------------
export type SessaoStatus =
  | "em_andamento"
  | "concluida"
  | "abandonada";

export interface SessaoMotorista {
  id: UUID;
  pesquisaId: UUID;
  cpf: string;
  iniciadaEm: string;
  atualizadaEm: string;
  status: SessaoStatus;
  respostas: Record<string, unknown>;
  /** Fatos vindos de fontes externas, agrupados por prefixo. */
  externos?: Record<string, Record<string, unknown>>;
  resultado?: DecisaoResultado;
  ruleSetVersao?: number;
  /** Preenchido quando uma pessoa decidiu no lugar do motor. Ver `TratamentoManual`. */
  tratamento?: TratamentoManual;
  /** O que os destinos fizeram com esta jornada. Ver `EntregaDeDestino`. */
  entregas?: EntregaDeDestino[];
  /** O que já foi avisado ao respondente sobre esta jornada. */
  avisos?: AvisoAoRespondente[];
}

/**
 * A conferência humana de um caso que o motor segurou.
 *
 * Tratar **sobrescreve** o `resultado` da sessão, e não cria um segundo veredito
 * ao lado dele. Dois resultados conviventes obrigariam cada tela — consulta do
 * vendedor, submissões, indicadores, exportação — a lembrar qual dos dois vale,
 * e a primeira que esquecesse mostraria o veredito velho para quem está no
 * balcão com o motorista na frente.
 *
 * O que o motor havia decidido não se perde: fica aqui, com quem decidiu por
 * cima e por quê. É o que permite auditar depois quantas vezes a régua foi
 * corrigida na mão, e em que direção.
 */
export interface TratamentoManual {
  por: string;
  em: string;
  motivo: string;
  /** O desfecho que o motor tinha dado, antes de a pessoa decidir. */
  desfechoAutomatico: string;
  efeitoAutomatico: EfeitoDoDesfecho;
}

/**
 * Um aviso ao respondente.
 *
 * Fica registrado como dado, e o envio de verdade não existe neste protótipo:
 * não há serviço de e-mail nem de mensagem. Guardar o aviso mesmo assim é o que
 * deixa a tela dizer a verdade — "avisado em tal data, por tal canal" — em vez
 * de sumir com a informação e deixar o gestor sem saber se já falou com a
 * pessoa. Quando entrar um serviço de envio, é este registro que ele consome.
 */
export interface AvisoAoRespondente {
  /** Onde a mensagem chegaria: um e-mail respondido na jornada, por exemplo. */
  canal: string;
  destino?: string;
  texto: string;
  registradoEm: string;
}

export interface DecisaoResultado {
  /** O `id` do desfecho que venceu. */
  tipo: string;
  /**
   * O que este desfecho faz no sistema, gravado junto.
   *
   * Podia ser buscado na pesquisa a cada leitura, mas a sessão é histórico: se
   * o autor mudar o efeito de um desfecho amanhã, a decisão de ontem continua
   * valendo o que valia quando foi tomada.
   */
  efeito: EfeitoDoDesfecho;
  motivo: string;
  proximaAcao?: string;
  regraAplicadaId?: UUID;
  ruleSetVersao: number;
  decididoEm: string;
  contexto: Record<string, unknown>;
}

// --- Pedido (esteira comercial) --------------------------------------------
export type PedidoStatus =
  | "aguardando_elegibilidade"
  | "liberado"
  | "bloqueado"
  | "em_analise"
  | "concluido";

export interface Pedido {
  id: UUID;
  pesquisaId: UUID;
  cpf: string;
  /**
   * Id do usuário que registrou, como em `propostoPor` do RuleSet. Guardar o
   * nome solto deixava a autoria envelhecer junto com o cadastro e impedia
   * filtrar a carteira por quem vendeu.
   */
  vendedor: string;
  concessionaria: string;
  modelo: string;
  criadoEm: string;
  status: PedidoStatus;
  motivo?: string;
}

/** Se este hook leva dado para fora em vez de trazer. */
export function ehDestino(h: Hook): boolean {
  return h.tipo === "destino";
}

/**
 * O que aconteceu quando o sistema tentou entregar esta jornada lá fora.
 *
 * Guardado na sessão, e não só no log do servidor. Entrega que falhou é o tipo
 * de coisa que só se descobre quando alguém do outro lado reclama que o lead
 * nunca chegou — e aí é tarde para saber se foi o CRM que recusou ou o código
 * que quebrou. Aqui fica escrito, por jornada.
 */
export interface EntregaDeDestino {
  destinoId: UUID;
  destinoNome: string;
  ok: boolean;
  erro?: string;
  duracaoMs: number;
  em: string;
}
