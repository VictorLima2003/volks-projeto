import {
  Bloco,
  Campanha,
  Hook,
  Pedido,
  Regra,
  RuleSet,
  SessaoMotorista,
} from "./types";

// --------------------------------------------------------------------------
// Base Uber (mock) - contexto compartilhado entre campanhas
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// Perguntas base para uma campanha típica
// --------------------------------------------------------------------------
/**
 * A pesquisa padrão como árvore. A indentação já conta a história:
 * identifica → autoriza → e aí o caminho se divide conforme a base Uber.
 */
const blocosPadrao: Bloco[] = [
  {
    id: "q_cpf",
    bloco: "pergunta",
    campo: "cpf",
    rotulo: "Confirme seu CPF",
    ajuda: "Usamos seu CPF apenas para localizar seu perfil na base Uber.",
    tipo: "cpf",
    obrigatoria: true,
  },
  {
    // A base do parceiro entra por hook, igual a qualquer outra fonte.
    id: "consulta_base",
    bloco: "consulta",
    rotulo: "Localizar na base de parceiros",
    hookId: "hook_uber",
    argumentos: { documento: "cpf" },
    obrigatoria: false,
  },
  {
    id: "q_consent",
    bloco: "pergunta",
    campo: "consentimento",
    rotulo: "Autoriza consultar seus dados de atividade na Uber?",
    ajuda: "Precisamos disso para validar sua elegibilidade sem pedir comprovantes.",
    tipo: "consentimento",
    obrigatoria: true,
  },
  {
    /*
     * Recusar encerra o caminho aqui.
     *
     * Antes deste bloco, responder "Não autorizo" não fazia nada: o fluxo
     * seguia, puxava crédito, perguntava modelo e concessionária, e no fim
     * entregava um veredito calculado com os dados que a pessoa acabara de
     * recusar. O campo era gravado e ignorado.
     *
     * A condição é `existe` **e** `é falso`, e não só `é falso`.
     *
     * Só `falsy` também casa com "ainda não respondeu", e aí o percurso inteiro
     * era truncado: `passosVisiveis` para no primeiro feedback que encontra, e
     * este feedback aparecia já na pergunta do consentimento. A régua dizia
     * "Passo 2 de 2" — que parece a última — e depois pulava para 5 assim que a
     * pessoa autorizava. Com `existe`, antes de responder o ramo é o vazio e o
     * caminho segue inteiro.
     *
     * Isto é conveniência de fluxo, não a trava: a decisão real é recusada pela
     * regra `r_sem_consentimento` no RuleSet, no servidor. Lá o `falsy` sozinho
     * é o certo, porque ausência de autorização é ausência de autorização.
     */
    id: "cond_sem_consentimento",
    bloco: "condicional",
    rotulo: "Não autorizou a consulta",
    condicao: {
      todas: [
        { fato: "resposta.consentimento", operador: "exists" },
        { fato: "resposta.consentimento", operador: "falsy" },
      ],
      fato: "",
      operador: "truthy",
    },
    entao: [
      {
        id: "fim_sem_consentimento",
        bloco: "feedback",
        tipo: "info",
        titulo: "Sem a autorização, não temos como consultar",
        mensagem:
          "Nada foi consultado e nada fica guardado. Você pode voltar e autorizar quando quiser, ou falar com uma concessionária Volkswagen, que confere sua condição no balcão.",
      },
    ],
    senao: [],
  },
  {
    // Gatilho: com o CPF em mãos, puxa a base de crédito antes de seguir.
    id: "consulta_credito",
    bloco: "consulta",
    rotulo: "Consultar restrições de crédito",
    hookId: "hook_credito",
    argumentos: { documento: "cpf" },
    obrigatoria: false,
  },
  {
    id: "cond_na_base",
    bloco: "condicional",
    rotulo: "CPF encontrado na base Uber",
    condicao: { fato: "uber.encontrado", operador: "truthy" },
    entao: [
      {
        id: "q_modelo",
        bloco: "pergunta",
        campo: "modelo",
        rotulo: "Qual modelo Volkswagen te interessa?",
        tipo: "opcao",
        opcoes: ["T-Cross", "Polo Track", "Nivus", "Virtus", "Ainda decidindo"],
        obrigatoria: true,
      },
      {
        id: "q_concessionaria",
        bloco: "pergunta",
        campo: "concessionaria",
        rotulo: "Concessionária preferida",
        tipo: "opcao",
        opcoes: [
          "VW Barra Funda (SP)",
          "VW Ipiranga (SP)",
          "VW Barra (RJ)",
          "VW Savassi (BH)",
          "Outra",
        ],
        obrigatoria: true,
      },
      {
        id: "q_canal",
        bloco: "pergunta",
        campo: "canalContato",
        rotulo: "Melhor canal de contato",
        tipo: "opcao",
        opcoes: ["WhatsApp", "Telefone", "E-mail"],
        obrigatoria: true,
      },
      {
        id: "cond_divergencia",
        bloco: "condicional",
        rotulo: "Dados divergentes entre Uber e motorista",
        condicao: { fato: "uber.divergencia", operador: "truthy" },
        entao: [
          {
            id: "q_confirma_dados",
            bloco: "pergunta",
            campo: "confirmaDados",
            rotulo: "Os dados encontrados na Uber batem com você? (nome/cidade)",
            tipo: "opcao",
            opcoes: ["Sim, batem", "Não batem"],
            obrigatoria: true,
          },
        ],
        senao: [],
      },
    ],
    senao: [
      {
        id: "q_analise_email",
        bloco: "pergunta",
        campo: "emailAnalise",
        rotulo: "Seu e-mail para pedirmos análise manual",
        ajuda: "Como não te encontramos na base, precisamos de um contato.",
        tipo: "email",
        obrigatoria: true,
      },
      {
        // Fim de caminho para quem não está na base: nada depois disso.
        id: "fim_analise",
        bloco: "feedback",
        tipo: "warning",
        titulo: "Vamos analisar seu caso",
        mensagem:
          "Não encontramos seu CPF na base compartilhada pela Uber. Nossa central vai conferir manualmente e retornar pelo e-mail informado em até 2 dias úteis.",
      },
    ],
  },
];

// --------------------------------------------------------------------------
// Hooks de exemplo
// --------------------------------------------------------------------------
/**
 * A base de parceiros é um hook como outro qualquer — não há nada de "Uber"
 * dentro do motor. Trocar este CSV por um `fetch` na API real é mexer só aqui.
 */
const hookBaseParceiro: Hook = {
  id: "hook_uber",
  nome: "Base de parceiros",
  descricao: "Localiza o respondente na base compartilhada pelo parceiro.",
  prefixo: "uber",
  parametros: [{ nome: "documento", rotulo: "Documento", descricao: "CPF do respondente" }],
  mensagemCarregando: "Localizando seu cadastro...",
  // Como cada fato deve ser escrito na tela. A chave é identificador de código
  // e não leva acento; o rótulo, sim.
  rotulos: {
    nome: "Nome",
    cidade: "Cidade",
    uf: "UF",
    mesesUber: "Meses na Uber",
    corridas: "Corridas concluídas",
    status: "Status da conta",
    rating: "Avaliação",
  },
  anexos: [
    {
      nome: "parceiros.csv",
      conteudo: [
        "documento,nome,cidade,uf,mesesUber,corridas,status,rating",
        "111.222.333-44,Marcos Andrade,São Paulo,SP,14,2380,ativo,4.92",
        "222.333.444-55,Juliana Ribeiro,São Paulo,SP,9,1120,ativo,4.87",
        "333.444.555-66,Rafael Nogueira,Rio de Janeiro,RJ,22,5400,ativo,4.95",
        "444.555.666-77,Carla Mendes,Belo Horizonte,MG,4,320,ativo,4.71",
        "555.666.777-88,Diego Cardoso,Curitiba,PR,7,480,ativo,4.66",
        "666.777.888-99,Patrícia Lima,Porto Alegre,RS,18,3010,ativo,4.90",
        "777.888.999-00,Bruno Tavares,Salvador,BA,11,900,suspenso,4.42",
        "888.999.000-11,Larissa Souza,Recife,PE,6,510,ativo,4.80",
        "999.000.111-22,Eduardo Freitas,Fortaleza,CE,25,6100,ativo,4.97",
        "000.111.222-33,Fernanda Alves,Brasília,DF,3,220,ativo,4.55",
        "121.232.343-45,Rodrigo Pinto,São Paulo,SP,15,1780,inativo,4.60",
        "232.343.454-56,Aline Batista,Campinas,SP,8,640,ativo,4.75",
      ].join("\n"),
    },
  ],
  codigo: [
    "const linhas = await csv('parceiros.csv');",
    "const achado = linhas.find((l) => chave(l.documento) === chave(documento));",
    "",
    "if (!achado) return null;",
    "",
    "return {",
    "  nome: achado.nome,",
    "  cidade: achado.cidade,",
    "  uf: achado.uf,",
    "  mesesUber: Number(achado.mesesUber),",
    "  corridas: Number(achado.corridas),",
    "  status: achado.status,",
    "  rating: Number(achado.rating),",
    "};",
  ].join("\n"),
  ativo: true,
};

/**
 * Hook que lê um CSV anexado. É o arquivo típico que o time de crédito manda —
 * aqui ele vira anexo do hook, e o código decide como tratá-lo.
 */
const hookCredito: Hook = {
  id: "hook_credito",
  nome: "Restrições de crédito",
  descricao: "Lê o CSV enviado pelo time de crédito e devolve score e restrição.",
  prefixo: "credito",
  parametros: [
    { nome: "documento", rotulo: "Documento", descricao: "CPF ou CNPJ do respondente" },
  ],
  mensagemCarregando: "Consultando restrições de crédito...",
  rotulos: {
    score: "Score",
    temRestricao: "Tem restrição",
    limite: "Limite pré-aprovado",
  },
  anexos: [
    {
      nome: "restricoes.csv",
      conteudo: [
        "documento,score,restricao,limitePreAprovado",
        "111.222.333-44,842,nao,68000",
        "222.333.444-55,715,nao,42000",
        "333.444.555-66,905,nao,95000",
        "444.555.666-77,530,sim,0",
        "555.666.777-88,688,nao,38000",
        "666.777.888-99,871,nao,74000",
        "777.888.999-00,412,sim,0",
        "888.999.000-11,733,nao,45000",
      ].join("\n"),
    },
  ],
  codigo: [
    "// `csv(nome)` lê um anexo ou uma URL. `chave()` normaliza documentos.",
    "const linhas = await csv('restricoes.csv');",
    "const achado = linhas.find((l) => chave(l.documento) === chave(documento));",
    "",
    "// Retornar null diz ao motor que nada foi encontrado.",
    "if (!achado) return null;",
    "",
    "return {",
    "  score: Number(achado.score),",
    "  temRestricao: achado.restricao === 'sim',",
    "  limite: Number(achado.limitePreAprovado),",
    "};",
  ].join("\n"),
  ativo: true,
};

/**
 * Hook que consome uma API. Fica desativado porque aponta para um endpoint
 * fictício — serve como esqueleto de integração real.
 */
const hookApiParceira: Hook = {
  id: "hook_api_parceira",
  nome: "Motor consumir API parceira",
  descricao: "Esqueleto de integração por HTTP. Troque a URL e o token pelos reais.",
  prefixo: "parceiro",
  parametros: [
    { nome: "documento", rotulo: "Documento" },
    { nome: "regiao", rotulo: "Região", descricao: "Opcional, filtra a consulta" },
  ],
  mensagemCarregando: "Falando com o parceiro...",
  anexos: [],
  codigo: [
    "const url = `https://api.exemplo.com/pessoas/${encodeURIComponent(documento)}`;",
    "",
    "const res = await fetch(url, {",
    "  headers: { authorization: 'Bearer TOKEN_AQUI', accept: 'application/json' },",
    "});",
    "",
    "if (res.status === 404) return null;",
    "if (!res.ok) throw new Error(`A API respondeu ${res.status}`);",
    "",
    "const dado = await res.json();",
    "log('recebido', dado);",
    "",
    "return {",
    "  categoria: dado.categoria,",
    "  ativo: dado.status === 'ACTIVE',",
    "  regiaoConsultada: regiao,",
    "};",
  ].join("\n"),
  ativo: false,
};

// --------------------------------------------------------------------------
// RuleSet padrão v1: 6 meses + 500 corridas
// --------------------------------------------------------------------------
const regrasV1: Regra[] = [
  {
    /*
     * Primeira de todas, e por isso prioridade 5.
     *
     * A tela já encerra a jornada de quem recusa, mas a tela não é trava: um
     * POST em `/api/decidir` sem passar pelo formulário chegaria aqui com o
     * consentimento vazio, e sem esta regra o motor decidiria alegremente com
     * dados que ninguém autorizou a usar. Trava de negócio mora no servidor.
     */
    id: "r_sem_consentimento",
    nome: "Sem autorização para consultar",
    condicao: { fato: "resposta.consentimento", operador: "falsy" },
    resultado: "nao_elegivel",
    motivo: "Sem autorização para consultar os dados de atividade, não dá para avaliar a elegibilidade.",
    proximaAcao: "Nenhuma. Só a pessoa pode autorizar, e nada é consultado até lá.",
    prioridade: 5,
  },
  {
    id: "r_erro_cpf",
    nome: "CPF não localizado na Uber",
    condicao: { fato: "uber.encontrado", operador: "falsy" },
    resultado: "pendente_validacao",
    motivo: "Não encontramos seu CPF na base Uber compartilhada com a Volkswagen.",
    proximaAcao: "Encaminhar para análise manual da Central.",
    prioridade: 10,
  },
  {
    id: "r_divergencia",
    nome: "Dados divergentes",
    condicao: {
      fato: "resposta.confirmaDados",
      operador: "=",
      valor: "Não batem",
    },
    resultado: "revalidar",
    motivo: "Divergência entre dados da Uber e confirmação do motorista.",
    proximaAcao: "Central deve conferir cadastro Uber vs. Serasa/RF.",
    prioridade: 15,
  },
  {
    // Cruza duas bases: a restrição vem do CSV de crédito, não da Uber.
    id: "r_restricao_credito",
    nome: "Restrição de crédito",
    condicao: { fato: "credito.temRestricao", operador: "truthy" },
    resultado: "nao_elegivel",
    motivo: "Há uma restrição de crédito ativa no seu CPF.",
    proximaAcao: "Motorista deve regularizar a restrição antes de retornar.",
    prioridade: 18,
  },
  {
    id: "r_suspenso",
    nome: "Conta suspensa",
    condicao: {
      fato: "uber.status",
      operador: "=",
      valor: "suspenso",
    },
    resultado: "nao_elegivel",
    motivo: "Sua conta Uber está suspensa no momento.",
    proximaAcao: "Motorista deve regularizar situação Uber antes de retornar.",
    prioridade: 20,
  },
  {
    id: "r_inativo",
    nome: "Conta inativa",
    condicao: {
      fato: "uber.status",
      operador: "=",
      valor: "inativo",
    },
    resultado: "nao_elegivel",
    motivo: "Sua conta Uber está marcada como inativa.",
    proximaAcao: "Motorista precisa reativar a conta e refazer a jornada.",
    prioridade: 25,
  },
  {
    id: "r_tempo",
    nome: "Tempo insuficiente na Uber",
    condicao: {
      fato: "uber.mesesUber",
      operador: "<",
      valor: 6,
    },
    resultado: "nao_elegivel",
    motivo: "Elegibilidade exige 6 meses ou mais de atividade na Uber.",
    proximaAcao: "Motorista pode retornar após completar 6 meses.",
    prioridade: 30,
  },
  {
    id: "r_corridas",
    nome: "Corridas insuficientes",
    condicao: {
      fato: "uber.corridas",
      operador: "<",
      valor: 500,
    },
    resultado: "nao_elegivel",
    motivo: "Elegibilidade exige 500 corridas ou mais concluídas.",
    proximaAcao: "Motorista pode retornar após completar 500 corridas.",
    prioridade: 40,
  },
  {
    id: "r_ok",
    nome: "Elegível (6 meses + 500 corridas)",
    condicao: {
      todas: [
        { fato: "uber.mesesUber", operador: ">=", valor: 6 },
        { fato: "uber.corridas", operador: ">=", valor: 500 },
        { fato: "uber.status", operador: "=", valor: "ativo" },
      ],
      fato: "",
      operador: "truthy",
    },
    resultado: "elegivel",
    motivo: "Você atende aos critérios: 6 meses ou mais e 500 corridas ou mais.",
    proximaAcao: "Vendedor liberado a montar pedido na concessionária escolhida.",
    prioridade: 100,
  },
];

const ruleSetV1: RuleSet = {
  id: "rs_v1",
  versao: 1,
  criadoEm: "2026-01-15T10:00:00Z",
  criadoPor: "ana.produto@volkswagen",
  descricao: "Regra base Volkswagen × Uber: 6 meses + 500 corridas + conta ativa.",
  regras: regrasV1,
  ativo: true,
  status: "ativo",
  propostoPor: "ana.produto@volkswagen",
  propostaEm: "2026-01-14T16:30:00Z",
  aprovadoPor: "marina.compliance@volkswagen",
  aprovadoEm: "2026-01-15T10:00:00Z",
};

// --------------------------------------------------------------------------
// Campanhas mockadas
// --------------------------------------------------------------------------
export const CAMPANHAS_SEED: Campanha[] = [
  {
    id: "camp_tcross_sp",
    nome: "T-Cross Uber SP · 1º Semestre",
    concessionaria: "Rede VW São Paulo",
    modelos: ["T-Cross", "Nivus", "Polo Track"],
    cidadesAlvo: ["São Paulo", "Campinas"],
    ufsAlvo: ["SP"],
    faixasEtarias: ["25-34", "35-44", "45-54"],
    verbaTotal: 4_800_000,
    verbaConsumida: 1_240_000,
    vigenciaInicio: "2026-06-01",
    vigenciaFim: "2026-12-31",
    status: "ativa",
    criadaEm: "2026-05-20T14:00:00Z",
    blocos: blocosPadrao,
    hooks: [hookBaseParceiro, hookCredito, hookApiParceira],
    ruleSets: [ruleSetV1],
    ruleSetAtivoId: ruleSetV1.id,
  },
  {
    id: "camp_polo_rj",
    nome: "Polo Track Uber RJ · Piloto",
    concessionaria: "VW Barra RJ",
    modelos: ["Polo Track", "Virtus"],
    cidadesAlvo: ["Rio de Janeiro"],
    ufsAlvo: ["RJ"],
    faixasEtarias: ["25-34", "35-44"],
    verbaTotal: 1_200_000,
    verbaConsumida: 210_000,
    vigenciaInicio: "2026-07-15",
    vigenciaFim: "2026-10-15",
    status: "ativa",
    criadaEm: "2026-07-10T09:00:00Z",
    blocos: blocosPadrao,
    hooks: [hookBaseParceiro, hookCredito, hookApiParceira],
    ruleSets: [ruleSetV1],
    ruleSetAtivoId: ruleSetV1.id,
  },
];

// --------------------------------------------------------------------------
// Pedidos e sessões iniciais para popular dashboards
// --------------------------------------------------------------------------
export const PEDIDOS_SEED: Pedido[] = [
  {
    id: "ped_001",
    campanhaId: "camp_tcross_sp",
    cpf: "111.222.333-44",
    vendedor: "julia.barrafunda@volkswagen",
    concessionaria: "VW Barra Funda (SP)",
    modelo: "T-Cross",
    criadoEm: "2026-08-01T12:00:00Z",
    status: "liberado",
  },
  {
    id: "ped_002",
    campanhaId: "camp_tcross_sp",
    cpf: "444.555.666-77",
    vendedor: "julia.barrafunda@volkswagen",
    concessionaria: "VW Barra Funda (SP)",
    modelo: "T-Cross",
    criadoEm: "2026-08-02T09:30:00Z",
    status: "bloqueado",
    motivo: "Corridas insuficientes",
  },
  {
    id: "ped_003",
    campanhaId: "camp_polo_rj",
    cpf: "333.444.555-66",
    vendedor: "bruno.barrarj@volkswagen",
    concessionaria: "VW Barra (RJ)",
    modelo: "Polo Track",
    criadoEm: "2026-08-03T14:15:00Z",
    status: "concluido",
  },
];

export const SESSOES_SEED: SessaoMotorista[] = [
  {
    id: "s_001",
    campanhaId: "camp_tcross_sp",
    cpf: "111.222.333-44",
    iniciadaEm: "2026-08-01T11:40:00Z",
    atualizadaEm: "2026-08-01T11:52:00Z",
    status: "concluida",
    // Os fatos que os hooks devolveram nesta jornada. Sem eles a consulta do
    // vendedor dizia "nenhuma consulta retornou dados" logo abaixo de uma tela
    // afirmando que o motorista atende aos critérios — o resultado ficava
    // gravado e a prova dele não.
    externos: {
      uber: { encontrado: true, nome: "Marcos Andrade", cidade: "São Paulo", uf: "SP", mesesUber: 14, corridas: 2380, status: "ativo", rating: 4.92 },
      credito: { encontrado: true, score: 842, temRestricao: false, limite: 68000 },
    },
    respostas: { consentimento: true, modelo: "T-Cross", concessionaria: "VW Barra Funda (SP)", canalContato: "WhatsApp" },
    resultado: {
      tipo: "elegivel",
      motivo: "Você atende aos critérios: 6 meses ou mais e 500 corridas ou mais.",
      proximaAcao: "Vendedor liberado a montar pedido na concessionária escolhida.",
      regraAplicadaId: "r_ok",
      ruleSetVersao: 1,
      decididoEm: "2026-08-01T11:52:00Z",
      contexto: { mesesUber: 14, corridas: 2380 },
    },
    ruleSetVersao: 1,
  },
  {
    id: "s_002",
    campanhaId: "camp_tcross_sp",
    cpf: "444.555.666-77",
    iniciadaEm: "2026-08-02T09:10:00Z",
    atualizadaEm: "2026-08-02T09:20:00Z",
    status: "concluida",
    externos: {
      uber: { encontrado: true, nome: "Carla Mendes", cidade: "Belo Horizonte", uf: "MG", mesesUber: 4, corridas: 320, status: "ativo", rating: 4.71 },
      credito: { encontrado: true, score: 530, temRestricao: true, limite: 0 },
    },
    respostas: { consentimento: true },
    resultado: {
      tipo: "nao_elegivel",
      motivo: "Elegibilidade exige 500 corridas ou mais concluídas.",
      proximaAcao: "Motorista pode retornar após completar 500 corridas.",
      regraAplicadaId: "r_corridas",
      ruleSetVersao: 1,
      decididoEm: "2026-08-02T09:20:00Z",
      contexto: { mesesUber: 4, corridas: 320 },
    },
    ruleSetVersao: 1,
  },
  {
    id: "s_003",
    campanhaId: "camp_polo_rj",
    cpf: "333.444.555-66",
    iniciadaEm: "2026-08-03T13:50:00Z",
    atualizadaEm: "2026-08-03T14:02:00Z",
    status: "concluida",
    externos: {
      uber: { encontrado: true, nome: "Rafael Nogueira", cidade: "Rio de Janeiro", uf: "RJ", mesesUber: 22, corridas: 5400, status: "ativo", rating: 4.95 },
      credito: { encontrado: true, score: 905, temRestricao: false, limite: 95000 },
    },
    respostas: { consentimento: true, modelo: "Polo Track", concessionaria: "VW Barra (RJ)", canalContato: "Telefone" },
    resultado: {
      tipo: "elegivel",
      motivo: "Você atende aos critérios: 6 meses ou mais e 500 corridas ou mais.",
      proximaAcao: "Vendedor liberado a montar pedido na concessionária escolhida.",
      regraAplicadaId: "r_ok",
      ruleSetVersao: 1,
      decididoEm: "2026-08-03T14:02:00Z",
      contexto: { mesesUber: 22, corridas: 5400 },
    },
    ruleSetVersao: 1,
  },
];
