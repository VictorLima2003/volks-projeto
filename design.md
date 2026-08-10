# Design — Volkswagen

Sistema travado deste app. Todo redesenho de página lê este arquivo antes de emitir código.
Não regenere por página — estenda ou emende este arquivo quando o sistema precisar crescer.

> **Onde mora o quê.** Este arquivo é a camada de *forma*: gênero, macroestrutura por família de
> página, arquétipos de nav e rodapé, voz de CTA, postura de movimento. A camada de *matéria* —
> cor, gradiente, tipografia, grid — já existia antes dele e continua sendo
> [`docs/design-system.md`](docs/design-system.md), com os valores implementados em
> [`tailwind.config.ts`](tailwind.config.ts). Onde os dois falarem do mesmo assunto, o
> `docs/design-system.md` vence: ele é rastreável até a marca, este aqui é rastreável até uma skill.

## Gênero

**modern-minimal.**

Dispara em plataforma, B2B, dashboard, dev tool, API — o produto é os cinco. O registro do gênero
que mais se aproxima é o "Cobalt": papel branco-frio, um acento azul elétrico, sans no corpo, mono
no código, filete de régua e raio apertado. Foi coincidência útil, não escolha estética: o nosso
azul veio do site da Volkswagen e o filete veio da regra 3, muito antes de existir gênero nenhum.

O gênero **permite** papel branco puro, neutro sem croma, hero de duas colunas e CTA em pílula
(que é a nossa regra 2). O gênero **proíbe** serifa itálica no corpo, coluna de prosa assimétrica,
capitular e ornamento, easing com overshoot e texto em gradiente.

### Glassmorphism: tentado e revertido

Houve uma versão da home do respondente com cabeçalho e formulário translúcidos. Foi revertida —
não por causa da regra do gênero, mas porque não ficou bom. O cromo `vidro` do `ShellFluxo`, o tom
`vidro` dos campos e a variante `claro` do botão existiram por algumas horas e saíram junto; se
alguém precisar de superfície translúcida no futuro, começa do zero e com motivo.

O cabeçalho é branco sólido e não escreve o nome da área ao lado da marca. O `label` de `area`
continua existindo, mas só nomeia o link para leitor de tela — sem ele, três links diferentes
seriam anunciados como "Volkswagen" e nenhum diria para onde vai.

## Família de macroestrutura

As quatro famílias abaixo não foram inventadas aqui: são as mesmas divisões de container que o
`docs/design-system.md` já fazia por **formato da tarefa**. A macroestrutura só dá forma ao que a
largura já separava.

| Família | Rotas | Container | Macroestrutura |
| --- | --- | --- | --- |
| **Marketing** | `/` | 1280px (`largura="padrao"`) | **03 · Marquee Hero** |
| **Marketing** | `/motorista` | 1280px (`largura="larga"`) | **15 · Split Studio** |
| **Conteúdo** | `/documentos` | 1280px (`largura="larga"`) | **11 · Catalogue** |
| **Fluxo** | `/motorista/jornada` | 672px (`largura="estreita"`) | **14 · Narrative Workflow** |
| **Decisão** | `/vendedor`, `/vendedor/consulta`, `/gestor`, `/gestor/dashboard`, `/gestor/aprovacoes`, `/gestor/central`, `/gestor/campanhas/nova`, `/gestor/campanhas/[id]`, `/gestor/campanhas/[id]/regras` | 1280px | **01 · Bento Grid** |
| **Ferramenta** | `/gestor/campanhas/[id]/pesquisa`, `.../hooks`, `.../regras/editar` | 1280px | **21 · Component Playground** |

**Por que cada uma:**

- **Marquee Hero** — a dobra é uma afirmação só e embaixo dela a página vira outra coisa. Serve à
  porta de entrada, que não tem trabalho de conversão: quem chega ali só precisa saber onde está
  antes de escolher um dos três caminhos.
- **Split Studio** — díptico: cada bloco divide a tela entre afirmação e prova, alternando o lado
  descendo a página. A `/motorista` **não** usa Marquee, e a razão está na ficha do próprio Marquee:
  ele proíbe CTA na dobra e avisa para evitá-lo em produto cujo valor precisa ser explicado em
  segundos. A home do respondente é exatamente esse caso — a pessoa precisa entender em uma frase
  por que a VW já sabe quem ela é, e conseguir digitar o CPF sem rolar. Forçar Marquee ali seria
  seguir a skill contra o objetivo da tela.
- **Narrative Workflow** — etapas numeradas contando o processo no tempo. A jornada já é isso por
  dentro (o percurso é recalculado a cada resposta); faltava o desenho dizer.
- **Bento Grid** — blocos de tamanhos diferentes, hierarquia por área e não por repetição. Entra
  para resolver um problema real: hoje as telas de decisão são fileiras de cards idênticos, e nada
  na página diz o que olhar primeiro.
- **Component Playground** — blocos que se edita vendo o resultado ao lado. É o construtor de
  pesquisa e o editor de hooks descritos com precisão.

## Tema

Não há tema de catálogo e não há paleta OKLCH gerada. Os tokens são os que já existem em
`tailwind.config.ts`, e a referência de uso de cada degrau está em `docs/design-system.md`.

| Papel | Token | Valor |
| --- | --- | --- |
| Papel | `ink-0` / `ink-50` | `#FFFFFF` / `#FBFAF8` |
| Papel secundário | `ink-100` | `#F6F5F2` |
| Tinta | `ink-900` | `#1B2236` |
| Tinta de apoio | `ink-600` | `#606574` — piso de contraste, nada abaixo em texto |
| Filete | `ink-300` (`--line`) | `#DFE4E8` |
| Marca / ação | `vw-deep` (`azul-900`) | `#001E50` |
| Interativo / foco | `vw-blue` (`azul-600`) | `#1B57C4` |
| Sinal | `signal-go/warn/stop` | `#0E7C3A` / `#96560B` / `#BB0B22` |

**Superfície escura** — só as dobras de marketing, via `bg-profundo` ou `bg-glow`. Nenhuma tela de
decisão ou de ferramenta tem fundo escuro: elas são lidas por horas seguidas.

## Tipografia

- **Uma família só: Inter** (`var(--font-inter)`), em todos os níveis. H1–H3 no peso 500
  (`.display`), H4–H6 no 600 (`.display-sm`), corpo no 400.
- **Monoespaçada é proibida na interface.** Chegou a existir uma (JetBrains Mono, no papel técnico)
  e saiu no mesmo dia: fonte com cara de máquina de escrever está banida de qualquer tela. A única
  coisa que ela resolvia era alinhamento de dígito em coluna, e isso hoje é `font-variant-numeric:
  tabular-nums` dentro do próprio Inter — é o que a classe `.mono` do `globals.css` faz agora, a
  despeito do nome herdado.
- **Exceção única:** o interior do editor Monaco. Ali o alinhamento por coluna é função do código,
  não estilo da interface.
- **Escala:** os nove níveis de `docs/design-system.md`, implementados como `clamp()` fluido entre
  375px e 1280px. Altura de linha e tracking vivem no token, por nível.

## Espaçamento

Escala Tailwind de 4pt. Gaps de composição: `gap-3` para tira densa de KPI, `gap-4` para campos
relacionados dentro de um card, `gap-6` para cards e painéis no nível da página.

## Movimento

Projeto **motion-cut** — nenhuma biblioteca de animação, e não entra nenhuma.

- **Reveal no scroll: não existe.** O gênero pede página composta, não página que se monta enquanto
  você desce. Se um elemento precisa aparecer para ser notado, o problema é de hierarquia.
- **Movimento só sob interação.** Houve uma variante `brilho` do `Button` com gradiente cônico
  girando na borda o tempo todo; foi tentada e removida, e as 155 linhas de CSS dela saíram junto.
  O que ficou é a seta do CTA (`SetaCta`): no hover e no `focus-visible` a seta em cena sai pela
  direita e outra entra pela esquerda, dentro de uma caixa que recorta. Transform apenas, 200ms,
  e `prefers-reduced-motion` troca sem deslizar.
- **Ícone se desenha à mão.** Quatro segmentos não justificam uma biblioteca, e misturar
  bibliotecas é o começo de páginas com três estilos de ícone ao mesmo tempo.
- **`animejs` é a única biblioteca de animação do projeto** (v4). Entrou por decisão do Pedro,
  depois de eu argumentar contra três vezes; o registro fica aqui para ninguém reabrir a discussão
  achando que foi descuido. Usada em dois lugares: o `svg.createDrawable` da marca de carregamento
  e a saída da dobra ao enviar o CPF. `framer-motion` e `lucide-react` continuam fora.
- **`@14islands/react-page-transitions` foi tentada e não funciona aqui.** Ela orquestra saída e
  entrada de página com `SwitchTransition`, e depende de a página que sai continuar montada. No App
  Router isso não acontece: o `children` de um layout é o `LayoutRouter` do Next, que troca o
  conteúdo por dentro, e quando o `usePathname()` atualiza o segmento antigo já foi substituído.
  Medido — a lib monta (o wrapper `.page` dela aparece no DOM), mas o `onExiting` dispara **zero
  vezes** e a tela antiga desmonta em 60ms. Tentei também dar a ela um filho com `key` por rota;
  não mudou nada. O exemplo do README é do Pages Router, onde `<Component {...pageProps} />` é um
  elemento de verdade que muda de identidade. Não insista sem trocar a arquitetura da rota.
- **O que funciona no lugar dela: cortina no layout.** O layout **não** desmonta ao navegar entre
  rotas filhas — só o miolo troca. Então uma cortina de tela cheia que mora no
  `/motorista/layout.tsx` atravessa a navegação e cobre a troca inteira. Não é preciso segurar a
  página que sai; basta esconder o momento em que ela some.
- **A cortina e a tela de carregamento usam o mesmo `bg-profundo`.** É isso que torna a troca de
  rota invisível: a cortina sobe navy, a jornada monta navy por baixo, e quando a cortina baixa não
  há mudança de cor para a vista registrar.
- **A entrada é camada, não `return` antecipado.** Enquanto era `return`, o carregamento saía para
  uma tela vazia e a primeira pergunta entrava em corte seco. Agora a pergunta monta por baixo
  enquanto a marca ainda está em cena, e a passagem entre as duas é dissolução. A camada **captura
  o clique** durante a espera — a pergunta invisível por baixo seria respondível às cegas — e solta
  na dissolução, quando ela já está aparecendo.

**A sequência inteira, sem nenhum corte:** dobra recua → cortina navy cobre → rota troca coberta →
carregamento navy monta (mesma cor, troca invisível) → cortina baixa → símbolo desenha o ciclo
completo → carregamento se dissolve sobre a pergunta que já está lá.

## Posição dos botões

Decidido por pesquisa, não por gosto.

**No celular: empilhado, de ponta a ponta, primário em cima.** Alvo cheio é mais fácil de acertar e
fica na faixa do polegar; o mínimo de 44×44px vale para tudo que se toca, e CTA principal costuma
ficar entre 48 e 56px de altura.

**No desktop: lado a lado, alinhados à esquerda da coluna de conteúdo, primário primeiro.** À
esquerda porque é a borda que o olho já segue desde o enunciado — primário à direita obriga a
atravessar a coluna para encontrá-lo. Primário primeiro segue a convenção de plataforma dominante,
que é o que a NN/g manda perseguir: consistência com o que a pessoa já espera economiza mais tempo
do que qualquer otimização pontual de ordem.

**A ação secundária tem peso visual menor**, sempre. É exigência explícita da NN/g para evitar
clique acidental — daí o vazado ao lado do preenchido, e nunca dois botões preenchidos lado a lado.

Fontes: [OK-Cancel or Cancel-OK?](https://www.nngroup.com/articles/ok-cancel-or-cancel-ok/) e
[Website Forms Usability](https://www.nngroup.com/articles/web-form-design/) (NN/g);
[Button Design](https://baymard.com/learn/button-design) (Baymard).

## Jornada: régua, perfil e âncora

**Progresso em segmentos**, um por passo — a figura de story. Dá para contar quantos faltam de
relance, sem número escrito. Saíram de baixo dela o nome da campanha e a porcentagem: eram duas
linhas de texto para dizer o que a régua já diz.

**A régua mostra todos os passos desde o primeiro.** Um feedback encerra o percurso em
`passosVisiveis`, então qualquer condicional que caia num feedback antes da hora trunca a contagem —
foi o que aconteceu com o ramo da recusa: a régua dizia "Passo 2 de 2" na pergunta do consentimento,
que parece a última, e pulava para 5 assim que a pessoa autorizava. A condição de um ramo que termina
em feedback precisa ser `existe` **e** o teste, nunca só `falsy`, que também casa com "ainda não
respondeu".

**O contexto conhecido é um cartão de perfil**, com silhueta de pessoa, **sempre recolhido**. Ele já
abriu sozinho na primeira pergunta, como prova de que o sistema sabia quem era a pessoa — mas seis
campos abertos empurram a pergunta para baixo, e a primeira tela é a que menos pode empurrar. O
título fechado dá o recado e quem quiser confere. O controle diz "Expandir", não "6 dados": rótulo de
controle descreve o que o clique faz, não o que tem dentro. Rótulo semibold e mais
escuro que o valor — invertido em relação ao usual, de propósito: o rótulo é o que orienta a
varredura, e o valor é dado que já foi conferido, não decisão a tomar. As chaves viram rótulo por
regra mecânica (separa camelCase, sobe a inicial, sigla de duas letras vira maiúscula) — o motor não
pode ganhar um dicionário de nomes de negócio.

**A resposta fica perto da pergunta:** divisor a 24px do enunciado, resposta 24px depois dele. A
âncora no pé foi abandonada — proximidade entre pergunta e resposta vale mais que posição fixa, e o
divisor já dá a separação que a âncora dava.

**A régua navega.** Cada segmento é um botão: leva ao passo, para trás ou para frente, até onde a
pessoa já chegou. O limite é monotônico de propósito — voltar não retira o direito de avançar de
novo, senão quem volta fica preso no passado. O alvo de toque tem 44px de altura com o traço de 4px
dentro dele; 4px é impossível de acertar com o dedo.

**Voltar navega, não apaga.** Enquanto ele removia a última resposta, voltar custava o que já tinha
sido respondido — com a régua permitindo ir e vir, isso viraria perda de dado a cada clique.

Durante a transição entre passos a régua fica travada, para o clique não cair no meio da troca de
estado.

**A saudação pelo nome aparece uma vez só**, no enunciado da primeira pergunta que a pessoa
responde: "Marcos, autoriza consultar seus dados?". Ali ela trabalha — é a prova de que a consulta
achou quem devia achar, dita na primeira frase. Repetida a cada passo viraria tique, porque da
segunda tela em diante não informa mais nada. O nome sai de um fato de chave `nome`, venha de que
hook vier; sem ele, o enunciado aparece inteiro e continua fazendo sentido.

## Tela final da jornada

**A campanha, o veredito, o motivo, os números, o passo, a ação.** Nessa ordem, e sem filete de
estado em lugar nenhum: o selo e a cor já dizem o estado, e o filete seria a mesma informação uma
terceira vez.

As duas telas finais possíveis — o resultado do motor e a tela desenhada pelo autor da pesquisa —
**abrem igual**. Cair numa ou na outra depende de um detalhe do fluxo que quem responde não conhece;
não faz sentido que pareçam telas de produtos diferentes.

- **A campanha vem primeiro e é o título maior** (h1), em cartão de gradiente com a trama de pontos.
  Ela é o assunto da página; o veredito é o que aconteceu dentro dele. O rótulo é "Campanha", nunca
  "Sua campanha": ninguém escolheu campanha nenhuma, a pessoa clicou num link, e no caminho do não
  elegível o possessivo mentiria.
- **A trama vive no canto escuro do gradiente.** Do lado claro, pontos brancos a 20% somem e o
  cartão parece liso.
- **O veredito vem abaixo, menor, colorido, com selo à esquerda.** "Marcos, você está elegível!" em
  verde; "Diego, ainda não é dessa vez..." em vermelho.
  - **Exceção declarada à regra de título sempre navy.** Ela vale porque o veredito deixou de ser o
    h1: virou legenda do cartão, e a cor passou a fazer o trabalho que o tamanho não faz mais. Fora
    daqui a regra continua de pé.
  - **Reticências nos caminhos que não deram certo.** "ainda não é dessa vez." fecha o assunto;
    "ainda não é dessa vez..." deixa a porta aberta, que é o que a frase seguinte promete.
  - **Pendente e revalidar não levam cor.** Não deram errado, estão esperando. Ganham só o selo.
- **O selo do "não deu certo" não é um X.** X é veredito final, e este não é: os critérios são de
  tempo e de corridas, coisas que a pessoa acumula. A seta em círculo diz o que a tela diz por
  escrito. Sucesso leva tique em círculo, espera leva relógio.
- **Só o tique se desenha.** Os outros dois selos entram prontos: movimento é reforço, e reforçar
  "ainda não deu" com animação de chegada seria comemorar a recusa. O traço é `stroke-dashoffset` em
  CSS com `pathLength="1"`, não `svg.createDrawable` — é um traço só, de comprimento conhecido, sem
  laço nem recolhimento, e não justifica puxar o anime.js.
- **O motivo não tem rótulo.** A frase se apresenta como motivo sozinha; "Motivo" ocupava uma linha
  para anunciar a linha seguinte.
- **Os números vêm em cartões só de traço**, um por fato numérico que os hooks trouxerem.
- **O próximo passo é cartão verde com ícone de informação** — o único uso de fundo colorido na
  tela, reservado para o que a pessoa precisa fazer depois de sair daqui.
- **O CPF aparece parcial** (`•••.222.333-••`). A tela pode estar sendo vista por cima do ombro no
  balcão, e os dígitos do meio já bastam para reconhecer o número e para o vendedor conferir.
- **Uma ação só, com divisor acima: "Finalizar".** Não há segunda decisão a tomar aqui, e "ver como
  o vendedor enxerga" era porta de bastidor aberta para quem responde.
- **Nada de `RuleSet v1 · regra r_ok · <data>`.** É rastro de motor, e quem responde não tem o que
  fazer com ele. Quem precisa auditar a decisão são o vendedor e o gestor, nas telas deles.

## Recusar tem tela, e tem trava

Responder "Não autorizo" **encerra a jornada ali**. Antes disso o fluxo seguia como se nada: puxava
crédito, perguntava modelo e concessionária, e entregava um veredito calculado com os dados que a
pessoa acabara de recusar. O campo era gravado e ignorado.

A tela final da recusa não mostra número nenhum. Não pode: exibir meses e corridas de quem negou a
consulta é usar o dado assim mesmo, com outra roupa. Ela diz o que não aconteceu, e oferece os dois
caminhos que restam — voltar e autorizar, ou resolver no balcão.

Selo neutro, sem cor. Recusar não é falha nem espera: o relógio prometeria que alguém está
analisando, e não está. Vermelho puniria uma escolha legítima.

**A trava não é a tela.** O condicional em `seed.ts` é conveniência de fluxo; quem recusa a decisão
é a regra `r_sem_consentimento`, prioridade 5, primeira do RuleSet. Um POST em `/api/decidir` que
não passe pelo formulário chega com o consentimento vazio, e sem a regra o motor decidiria com dados
que ninguém autorizou. Trava de negócio mora no servidor, como todas as outras.

Detalhe de ordem que custa caro: o condicional vem **depois** da pergunta. `falsy` também vale para
"ainda não respondeu", e colocado antes ele encerraria a jornada antes de alguém ter dito nada.

## Telas de painel: faixa de saudação

As quatro telas do gestor (`/gestor`, `/gestor/dashboard`, `/gestor/central`, `/gestor/aprovacoes`)
e a home do vendedor (`/vendedor`) abrem com **saudação à esquerda e data à direita**, num filete
acima do bloco de título. Orienta a pessoa, não a página — por isso vem antes das migalhas.

A forma veio da home do projeto **toven**, com duas correções para caber aqui: a data em caixa de
frase, porque a regra 4 proíbe caixa alta, e sem monoespaçada, que é banida. `/vendedor/consulta`
fica de fora: é resposta sobre um CPF, não painel.

O arranjo mora em `Corpo`, no `Cabecalho.tsx`, e não dentro de um dos shells: `ShellGestor` e
`ShellFluxo` precisam do mesmo miolo, e duplicar era garantir que divergissem na primeira alteração.

### Coluna "Precisa de você": construída e removida

Junto com a saudação veio, do mesmo toven, uma coluna de 20rem à direita listando o que pedia
atenção — aprovações na fila, pedidos bloqueados, exceções, verba estourando; no vendedor, pedido
bloqueado e elegível sem pedido montado. Foi removida a pedido.

Fica registrado o que ela custava, caso a ideia volte:

- **A coluna tira ~360px do conteúdo**, e toda grade interna precisa descer um degrau junto. Seis
  tiles viram 145px com o rótulo quebrado, três cartões de campanha viram 277px com o título em
  quatro linhas, e duas tabelas lado a lado cortam o cabeçalho "Conversão". Sem esse ajuste, ela
  estraga as telas que decora.
- **O estado vazio precisa continuar verdadeiro.** Cada tela escondia da coluna o tipo que ela
  própria lista, senão a fila aparecia duas vezes e a ação apontava para a página onde a pessoa já
  estava. Só que aí "tudo em dia" virava mentira ao lado de uma tela mostrando pedidos bloqueados —
  o texto do vazio teve que mudar quando o filtro escondia algo.
- **Nada de "dispensar"** enquanto o store for de memória: o item volta na primeira recarga, e botão
  que mente é pior que botão ausente.

Do toven, em nenhum momento vieram roxo, tema escuro, cartão de vidro, blobs ou a home
conversacional. Vidro já tinha sido tentado e revertido aqui; o resto é a marca de outro produto.

## A escala de papel é quente; a estrutural não

`ink-0/50/100` são branco-quentes de propósito — servem de papel. Numa **faixa cheia** (cabeçalho de
tabela, linha de lista) esse quente lê como bege e destoa do resto. Faixa estrutural usa do `ink-200`
para cima, que é cinza-frio: é o que o cabeçalho de tabela e o realce de linha usam agora
(`bg-ink-200` e `hover:bg-ink-200/40`). Vale para toda tabela do produto, não só a da carteira.

## Autoria não se digita

Todo registro guarda **o id de quem o fez**, carimbado no servidor a partir da sessão. O que o corpo
da requisição mandar é ignorado. Vale para a proposta e a aprovação de RuleSet (`propostoPor`,
`aprovadoPor`) e agora também para o pedido (`vendedor`).

O pedido era a exceção, e a exceção tinha consequência: o campo "Vendedor" vinha com um nome fixo no
código e **editável**, então dava para lançar em nome de outra pessoa. Preencher o campo pela sessão
não bastaria — quem soubesse montar um POST continuaria assinando como quisesse. A recusa mora no
servidor, como toda trava de negócio deste projeto.

Guardar **id e não nome** é o que torna a autoria utilizável: dá para filtrar a carteira por quem
vendeu e agrupar o painel por vendedor. Enquanto era um nome digitado, agrupar por ele daria a soma
de quem escreveu o quê.

**A loja segue o mesmo caminho.** Quem vende, vende pela concessionária onde trabalha — o campo saiu
da tela e vem do `Usuario`. E `podeVender` decide quem registra: a tela esconde o formulário de quem
não tem o papel, mas esconder é conveniência.

**"Minha carteira" passou a ser de alguém.** Ela chamava `listarPedidos()` sem filtro: o título
afirmava uma coisa que a tela não fazia, e todo vendedor via os pedidos de todos.

O seletor de pessoa entrou no cabeçalho do vendedor porque lá a identidade mudou o que a tela faz.
Na área do respondente ele continua fora — não há login nenhum.

## Quem nomeia o fato é o hook, não a interface

Cada hook declara como seus fatos devem aparecer na tela (`rotulos: { temRestricao: "Tem
restrição" }`), e o gestor edita isso na tela de hooks.

Existe porque a chave é identificador de código e **não leva acento**. Enquanto a interface só podia
separar o camelCase e subir a inicial, `temRestricao` virava "Tem Restricao" — errado em português, e
sem conserto possível do lado de cá: a função de rótulo não adivinha ortografia.

O campo é opcional e parcial. O que não estiver declarado continua caindo na regra mecânica, e o
motor segue sem conhecer campo nenhum por nome: quem nomeia é o hook.

**O rótulo é indexado pelo caminho completo** (`credito.temRestricao`), não pela chave solta. Sem o
prefixo, dois hooks com um campo de mesmo nome trocariam de rótulo entre si. Por isso o contexto da
jornada passou a carregar o prefixo junto, em vez de achatar os fatos numa lista só.

Vale nas quatro telas que mostram fato: perfil e resultado da jornada, critérios e dados coletados da
consulta. O `/api/lookup` manda o mapa junto com as mensagens de carregamento, pelo mesmo critério —
é texto que a tela precisa escrever, e não revela nada além do que ela já mostra.

## Os dois lados do balcão veem o mesmo veredito

A consulta do vendedor e o fim da jornada do motorista desenham a mesma decisão do motor com as
mesmas peças: cartão do assunto, selo, título colorido, motivo e os números que pesaram. As peças
moram em `ResultadoDecisao.tsx`.

Antes, o vendedor via uma faixa de semáforo e quem respondia via um cartão de campanha — o mesmo
fato em duas linguagens, e nenhuma conversa possível entre as duas pessoas quando uma perguntasse à
outra "o que apareceu para você?".

O que muda entre os dois é só o **vocabulário**: o motorista lê sobre a condição dele ("você está
elegível"), o vendedor lê sobre o que pode fazer ("pedido liberado", "pedido bloqueado"). E o cartão
do topo troca de assunto junto — campanha lá, motorista aqui.

**A consulta tem cortina e marca**, como a jornada. É o mesmo momento visto do outro lado: digita-se
um CPF e espera-se um veredito. A cortina vive no `layout.tsx` do vendedor pelo mesmo motivo de
sempre — layout não desmonta na troca de rota. Fora daí, o gestor continua sem cena: quem alterna
entre telas de trabalho dezenas de vezes por dia não quer uma a cada clique.

A marca da consulta **não espera nada** — o dado vem no render do servidor. Ela existe porque o
veredito é a única coisa que a tela faz, e chegar de estalo tira o peso da resposta.

## Home do vendedor

- **O título é o cumprimento**: "Olá, Ana". "Vendedor" nomeava a área para quem já sabe em que área
  está — o cabeçalho e a URL dizem isso — e gastava a linha mais forte da tela repetindo o óbvio.
- **A data vive na barra da marca**, não numa faixa de saudação. Duas linhas de contexto seguidas
  empurram o trabalho da tela para baixo.
- **Tile sem filete grosso** (`acento={false}`). O filete ordena a leitura quando os tiles competem;
  com quatro contadores lado a lado, quatro traços coloridos viram enfeite disputando com o número.
- **A carteira tem tela própria** (`/vendedor/pedidos`) e a home mostra os dez mais recentes. O link
  para ela aparece **sempre**, mesmo quando os dez cabem: condicionar ao estouro deixaria a tela
  inalcançável enquanto a carteira fosse pequena, e tela que só existe depois do décimo primeiro
  pedido é tela que ninguém descobre.
- **O botão de consulta é o primário navy com a seta**, igual ao da tela do motorista. Era verde
  `go`, que na nossa escala quer dizer "aprovado" — cor de resultado num botão que só faz a pergunta.

## Regra: o teclado do celular combina com o campo

Todo campo declara `inputMode`, e não só `type`. É o `inputMode` que decide qual teclado o celular
abre; `type` sozinho não resolve.

| Pergunta | `type` | `inputMode` |
| --- | --- | --- |
| CPF | `text` | `numeric` |
| Telefone | `tel` | `tel` |
| Número | `text` | `numeric` |
| E-mail | `email` | `email` |

**`type="number"` não entra em nenhum deles.** Ele traz setinha de incremento, recusa zero à
esquerda e deixa a roda do mouse alterar o valor — comportamento de quantidade, e CPF e telefone
são sequências de dígitos, não quantidades.

## Regra: nenhuma troca de tela é seca

Toda mudança de tela na área do respondente tem passagem — inclusive a que a pessoa provoca pelo
botão de voltar do navegador. Isso se sustenta em **duas** peças, e é preciso as duas porque
nenhuma cobre sozinha:

1. **Cortina, para a navegação que nós disparamos.** Sobe antes de navegar e desce depois. Só serve
   quando o clique passa por nós.
2. **Entrada de elemento, para toda montagem de tela.** Cada bloco entra com opacidade e um
   deslocamento de 14px, escalonado por `animation-delay`. É o que cobre voltar, avançar, recarregar
   e link colado na barra — casos em que não há como levantar cortina antes, porque a navegação já
   aconteceu quando descobrimos dela.

**A entrada é CSS, não anime.js, e a razão é de segurança.** Animação por JS que não roda deixa o
conteúdo preso em `opacity: 0` — página em branco. Em CSS, se a animação não rodar, o elemento fica
no estado natural, que é visível. O pior caso vira ausência de movimento, nunca ausência de
conteúdo. `prefers-reduced-motion` desliga e cai no mesmo estado seguro.

Movimento por JS fica só onde ele é o próprio conteúdo — o símbolo que se desenha — e ali a marca
também aparece parada se o script falhar.
- **Navegação nunca depende de animação terminar.** O anime.js avança por `requestAnimationFrame`,
  que é estrangulado em aba de fundo — sem rede de segurança, quem clica e troca de aba volta para
  um botão morto. A saída do formulário navega pelo `onComplete` **ou** por um `setTimeout`; o que
  vier primeiro vale. Isso não é teórico: apareceu no primeiro teste, num painel que não compunha
  quadros, e o formulário travou com o botão desabilitado.

**Progresso só onde existe total real.**

O cartão de CPF **não** tem medidor. Ele já teve, marcando "passo 1 de 4" para casar com a seção
"Como funciona" — e estava mentindo: o número de perguntas depende do que os hooks trouxerem, e a
jornada conta 3 ou 5 conforme o caminho. Medido na base do exemplo, mesma campanha: `111.222.333-44`
entra em 1/5 e `999.888.777-66` entra em 1/3. O CPF é a porta de entrada, não o passo 1 de N.

Na jornada o medidor é traço contínuo, porque o total é recalculado a cada resposta. Ponto que
aparece e some no meio do preenchimento confunde mais do que informa.

## Momento de entrada da jornada

Entre o CPF e a primeira pergunta existe uma cena: o símbolo se desenhando (`MarcaCarregando`) com
a mensagem que **o autor do hook escreveu**, não texto fixo no código. Isso não é enfeite novo — o
campo `mensagemCarregando` já existia no modelo, o gestor já o editava na tela de hooks, o seed já
trazia três mensagens diferentes, e nenhuma jamais tinha chegado a uma tela. A cena só ligou o que
estava morto.

Três decisões que sustentam isso:

- **A mensagem trava assim que aparece.** O hook responde em milissegundos; seguir o estado ao vivo
  faria o texto do gestor piscar e a tela voltar para a frase neutra — sobraria em cena justamente
  o texto que não interessa.
- **Piso de 2400ms na entrada.** Loader que aparece e some antes de ser lido passa impressão de
  falha, não de carregamento. O valor cobre um ciclo inteiro do desenho: o símbolo leva 2000ms e o
  escalonamento entre as três formas empurra o fim para 2280ms. Em produção, com o hook batendo em
  bureau de crédito, o piso não chega a valer.
- **Só na entrada.** As consultas do meio da jornada não trazem a cena de volta.

### A jornada tem duas cenas de marca, não uma

A segunda fica **entre a última resposta e o veredito**, com piso de 2000ms e a mensagem "Aplicando
as regras". Sem ela, a última pergunta virava a tela de resultado em corte seco, justamente no
momento em que a pessoa mais espera alguma cerimônia. A terceira aparição é o "Finalizar", que
mostra a marca antes de devolver para a home.

O piso da segunda é menor porque a marca já foi apresentada: aqui ela cobre uma emenda, não faz uma
entrada.

**Armadilha, encontrada rodando:** a condição da cena é `passo === null`, nunca `!pergunta`. Um
bloco de consulta no meio do caminho também deixa a pergunta nula, e por `!pergunta` a camada subia
no meio do fluxo e travava lá, esperando um veredito que ainda tinha três perguntas pela frente.

**Segunda armadilha, do mesmo dia:** a camada vai para o `body` por portal, e não é renderizada onde
foi chamada. `position: fixed` mede a partir da viewport, exceto quando algum ancestral tem
`transform`, `filter` ou `will-change` — aí ele vira o bloco de contenção e o `inset-0` passa a medir
a partir dele. Quando o "Finalizar" nasceu dentro do bloco que carrega a animação de entrada do
passo, a camada de tela cheia virou um retângulo do tamanho do conteúdo, com o rodapé aparecendo
embaixo.

O detalhe que engana: **não adianta a animação já ter terminado.** Com `fill: both` ela continua
aplicando o valor final, e o Chrome mantém o elemento promovido mesmo com o valor sendo
`transform: none`. Sair da árvore resolve de uma vez, em vez de exigir que cada tela que use a camada
saiba em que ponto do DOM pode montá-la.

Com o portal, o efeito que anima a marca precisa de `montado` nas dependências: na primeira passada
o portal ainda não existe, a ref é nula e o efeito sai sem animar nada.

O `/api/lookup` manda **só o mapa de `hookId → mensagem`**, nunca o hook inteiro: dentro dele estão
o código-fonte e os anexos, e o CSV da base de parceiros tem documento de gente de verdade.

O traço é animado pelo `svg.createDrawable` do anime.js, pela propriedade `draw` — dois valores de
0 a 1 marcando início e fim do trecho visível. `['0 0', '0 1', '1 1']` desenha da ponta e recolhe
pela mesma ponta, o que dá laço contínuo sem corte.

Duas armadilhas que custaram um ciclo cada:

- **`createDrawable` não aceita `circle`** (só `line`, `path`, `polyline` e `rect`). O anel da marca
  virou `path` de dois semiarcos. A geometria é idêntica — o comprimento medido dá 283, e 2π×45 é
  282,7.
- **Nada de `pathLength` junto.** Ele normaliza a geometria e reescalaria justamente os valores que
  o `createDrawable` calcula a partir do comprimento real. Por isso o traço começa escondido por
  opacidade, e não por `stroke-dasharray` no CSS.
- **Transição de passo da jornada: fica.** É funcional, não decorativa — o sentido do deslize
  comunica avançar ou voltar. Vive em `globals.css`.
- **Estado de controle:** transição de cor e de borda, até 200ms.
- `prefers-reduced-motion: reduce` corta tudo que desloca.

## Duas armadilhas de entrada, ambas dando piscada

**`animate()` com atraso não esconde nada durante o atraso.** O anime só aplica o valor inicial
quando o atraso termina; até lá o elemento fica com o que o CSS disser. O logo da Uber entrava com
`opacity: [0, 1]` e `delay: 620` e por isso aparecia no primeiro quadro, sumia aos 620ms quando a
animação enfim começava do zero, e voltava. Entrada com atraso é caso de `.entra`, que tem
`animation-fill-mode: both` e aplica o estado inicial durante o atraso. De quebra sobrevive sem JS,
coisa que a versão com anime não fazia.

**Camada de WebGL não pode nascer opaca.** O canvas monta vazio e só tem imagem um ou dois quadros
depois. Aparecendo já em `opacity-70` por cima do `bg-profundo`, o que se via era o gradiente CSS
por um instante e as persianas surgindo — a dobra piscava de um fundo para o outro. Entra em
`transition-opacity`, ligada depois de dois `requestAnimationFrame`, com `setTimeout` de rede: rAF é
estrangulado em aba de fundo, e sem ele quem abre a página em segundo plano volta para um fundo
invisível para sempre.

## Explicação mora no título, não no pé da página

Texto que explica **o que a tela é** vive num painel encostado no h1, aberto por um botão de "?".
Antes eram blocos no rodapé — abaixo de duas tabelas, onde só chega quem rola até o fim, e
justamente quem já entendeu a tela. A dúvida acontece na chegada.

**Abre por clique, não por passar o mouse.** Passar o mouse não existe no celular, e conteúdo com
título e lista não cabe num rótulo flutuante que some quando o ponteiro sai do caminho. Fecha por
Esc e por clique fora, como toda camada sobreposta daqui.

**A linha entre o que vai e o que fica:** explicação de conceito vai para a ajuda ("como o motor
decide", "o que a central resolve"). **Instrução para agir fica visível** — "copie um CPF e cole na
tela inicial" é o que a pessoa veio fazer, e esconder atrás de um botão seria esconder a tela.
Conteúdo que muda com o estado (o que mudou da v1 para a v2) também fica: não é explicação, é dado.

## Navegação do gestor é lateral

A forma veio da sidebar do **toven**: marca no topo, menu agrupado, perfil no pé, e um estado
recolhido só de ícones. A linguagem visual é a nossa — filete de 1px, navy, Inter, sem caixa alta.

Ela substituiu o menu horizontal porque a área deixou de caber nele. Com a **Biblioteca** entrando ao
lado de Campanhas, Aprovações, Central e Indicadores, a fileira de pílulas viraria régua de rolagem.
Menu vertical cresce para baixo, que é para onde sobra espaço.

**Dois grupos, porque são duas naturezas.** O primeiro é o trabalho do dia; a Biblioteca é o que
pertence ao sistema e não à campanha — fontes de dado, pesquisas, réguas, simulador. Os quatro estão
marcados como "breve": hoje moram dentro de cada campanha, copiados, e movê-los é refatoração de
modelo que ainda não foi feita. A navegação mostra o destino e admite que não chegou lá, em vez de
esconder o plano.

**O filete navy do topo saiu, e depois a barra de topo e o rodapé inteiros.** Com a lateral
carregando marca, navegação e perfil, as duas faixas horizontais não tinham o que dizer — sobrava
numa a data e na outra o crédito, e as duas roubavam altura de tela de trabalho. A área do gestor é
só barra lateral e conteúdo.

**A marca na lateral não escreve o nome da área.** "Gestor" nomeava para quem já está dentro; o
`aria-label` do link continua dizendo, para quem usa leitor de tela. Vale a mesma regra do cabeçalho
do vendedor.

**A data saiu das duas áreas.** No gestor, junto com a barra que a segurava; no vendedor, só ela — o
cabeçalho continua, com a marca e o perfil.

**Duas armadilhas de layout, ambas medidas:**

- **Valor arbitrário que não chega a existir.** `w-[4.5rem]` não foi gerado, e a barra recolhia os
  itens sem recolher a si mesma. Degrau da escala (`w-20`) resolve e não depende do scanner.
- **Item de flex tem largura mínima automática igual ao conteúdo**, e ela vence a largura declarada.
  Sem `min-w-0`, a barra ficava nos 256px do item mais largo mesmo com `w-20` aplicado.

Medir isso exigiu **desligar a transição antes de ler**: com `transition-[width]`, o painel de
preview reporta o valor inicial enquanto não compõe quadros, e a barra parecia travada em 256px
quando já estava em 80.

## A área do gestor tem um eixo só

Todas as telas do gestor correm no mesmo container de 1280px. Não existe mais `largura="ampla"`.

As telas de construção corriam a 1600 enquanto o resto corria a 1280 — então a marca, a navegação e o
perfil **pulavam 73px na horizontal** a cada ida de Campanhas para Pesquisa. Medido: cabeçalho
começando em 73px numa tela e em 0 na outra. É o mesmo defeito que a jornada do motorista teve entre
cabeçalho e conteúdo, agora entre telas vizinhas.

Os 1600 se justificavam por "as telas de construção precisam de espaço", e não precisam: o construtor
é uma lista vertical de blocos, e linha longa demais atrapalha a leitura em vez de ajudar. O
gerenciador de hooks tem lista e editor lado a lado, e a proporção de 1 para 3 continua confortável
em 1280.

## Sem migalha, em lugar nenhum

A migalha saiu do produto inteiro, e o componente foi apagado junto. Ela repetia o caminho que a
navegação do topo e a barra de endereço já dizem, e no gestor chegava a repetir o próprio título da
tela duas linhas acima dele: "Gestor / Dashboard" seguido de "Indicadores".

## Cabeçalho: só marca, data e perfil

O mesmo arranjo nas duas áreas. Nome da área não se escreve — a navegação ao lado e a URL já dizem
onde a pessoa está, e o `aria-label` do link da marca cobre quem usa leitor de tela.

**O cumprimento é o título da tela de entrada de cada área** ("Olá, Ana"), não uma faixa própria
acima do h1. Nas telas internas o h1 é o nome da tela, e o cumprimento não se repete: ele orienta na
chegada, não a cada clique.

## O sinal mora no número, não num filete

O `Stat` não tem mais o filete de 4px no topo. Ele era a coisa mais pesada do tile e disputava com o
valor — quatro ou seis lado a lado viravam uma fileira de traços coloridos antes de virarem números.
A cor foi para o próprio valor, que diz o mesmo com o peso certo. Todos os degraus de sinal passam de
4,5:1 sobre papel branco, então nada se perde em legibilidade nem em informação.

## Filete é de 1px, em tudo

Não existe `border-2` no produto. Abas, cartões de lista, campo de código, pílulas de seleção e
molduras tracejadas passaram todos para o filete de 1px. A régua de 2px lia como caixa, não como
separação, e a queixa apareceu primeiro nos botões vazados — mas o problema era geral.

Exceção única: o `border-b-2` do cabeçalho de tabela, que separa cabeçalho de corpo dentro de uma
mesma caixa e precisa de mais peso que as linhas.

## Feedback: campo é inline, ação é aviso

**Erro de campo mora colado ao campo** — a correção é ali, e a mensagem precisa estar onde os olhos
já estão.

**Resultado de ação é aviso (toast)** — salvou, criou, aprovou, falhou ao enviar. Não é texto ao lado
do botão: ali ele fica preso no meio do formulário, some quando a tela rola e desaparece de vez em
telas longas. `Avisos` vive na raiz, e qualquer tela dispara com `useAviso()`.

- **Canto inferior direito no desktop, faixa no pé do celular.** No topo ele cobre o cabeçalho e, no
  celular, disputa com a barra de endereço.
- **Erro fica mais tempo que o sucesso** (7s contra 4s; atenção, 6s). Um deu certo e a pessoa segue a vida; o
  outro pede leitura. Os dois têm botão de fechar.
- **`role="alert"` para erro, `role="status"` para o resto.** O leitor de tela interrompe no primeiro
  e espera uma pausa no segundo, que é a diferença entre "deu ruim" e "pronto".
- **Quatro tons, cada um com cor e forma.** Sucesso verde com tique em círculo, atenção âmbar com
  triângulo, erro vermelho com X em círculo, informação navy com "i". Cor sozinha não informa: quem
  não distingue verde de vermelho precisa do ícone, e quem lê rápido reconhece a silhueta antes da
  frase. Fundo tinto do próprio tom, borda na mesma cor, e **o texto em `ink-900`** — texto colorido
  sobre fundo tinto perde contraste, e a frase é o que precisa ser lido.
- **O X aqui é legítimo**, ao contrário do selo de "ainda não elegível": lá o veredito não era final
  e a seta em círculo dizia "volte depois"; aqui a ação falhou de fato.
- **Portal para o `body`.** `position: fixed` mede a partir da viewport, exceto sob um ancestral com
  transform — a mesma armadilha que já custou uma sessão com a camada de carregamento.
- **A pilha não rouba clique:** `pointer-events-none` no contêiner, `auto` em cada aviso.

## Microinterações

- Sucesso é silencioso. Nada de toast comemorativo.
- Anel de foco aparece instantâneo, nunca animado, com contraste mínimo de 3:1.
- Só `transform` e `opacity` animam. Nunca propriedade de layout.

## Voz de CTA

- **Primário:** pílula preenchida em `vw-deep`, texto branco, `rounded-full`, altura 48px.
- **Secundário:** pílula vazada com borda de 2px em `vw-deep`.
- **Recusa:** pílula vazada em `signal-stop`, texto vermelho, preenchendo no hover. Vermelho
  **preenchido** ao lado do primário deixaria os dois com o mesmo peso, e quem varre a tela é
  atraído pelo bloco de cor mais quente — acabaria clicando em "não" por reflexo. Vazado ele
  continua inequivocamente vermelho e continua sendo o segundo botão da linha.
- **Terciário:** link tipográfico com seta, sem caixa.
- O rótulo é um verbo na primeira pessoa de quem clica: "Autorizo", "Começar agora". Nunca
  "Saiba mais", nunca "Clique aqui".

## Arquétipos

**Nav — escolhido por número de destinos, não por área:**

- `N9 · Edge-aligned minimal` — marca à esquerda, ação única à direita, silêncio no meio. Usado em
  `/`, `/motorista` e no vendedor, onde existe uma coisa a fazer.
- `N1b · Canonical SaaS three-section` — marca, cluster de links, identidade à direita. Só no
  gestor, que tem quatro destinos e o seletor de pessoa.
- **Jornada não tem nav.** Uma pergunta por vez significa nenhuma saída competindo com ela.

**Rodapé:** `Ft2 · Inline single line` em tudo — uma linha, filete acima. `Ft3` (quatro colunas de
links + fileira de social) está **banido**: é a impressão digital de IA mais reconhecível que
existe em rodapé.

**Cabeça de seção:** `S2 · Hanging` — título flutuando em espaço negativo, sem filete e sem rótulo
acima. Aqui os dois sistemas chegaram no mesmo lugar sozinhos: a regra 4 do `docs/design-system.md`
baniu eyebrow e caixa alta, e o gate 54 do Hallmark reprova exatamente o padrão rótulo-em-cima.

## Escopo de campanha

A home do respondente responde por **uma** campanha, que chega pelo link que o gestor compartilha
(`/motorista?campanha=<id>`) e dá o título da página. Quem responde não escolhe campanha: escolher
é trabalho de quem montou a oferta. Enquanto isso era um seletor dentro do formulário, a primeira
coisa que a tela pedia era uma decisão que não pertence a quem está ali.

O título é construído a partir dos modelos da campanha, não do nome interno dela — "T-Cross Uber SP
· 1º Semestre" é rótulo de gestão e não diz nada a um motorista.

## Ferramenta de teste mora fora da jornada

Os CPFs de demonstração vivem em `/documentos`, com botão de copiar, e **não aparecem em nenhuma
tela do respondente**. São instrumento de quem testa o produto; quem responde não tem por que ver
documento de terceiro. O caminho até lá sai da tela da campanha, no gestor, junto do link de teste.

## Honestidade de conteúdo

**Não se inventa prova.** Sem depoimento, sem parede de logos, sem métrica fabricada — o produto é
um protótipo com dados em memória e não tem cliente para citar. Onde uma landing normalmente
colocaria depoimento, esta coloca os **cenários de CPF de demonstração**: seis documentos que fazem
o motor decidir de seis jeitos diferentes, incluindo os que reprovam. É prova melhor que elogio,
porque o leitor pode conferir na hora.

**Sem cromo redesenhado.** Nada de moldura de celular, barra de navegador falsa ou janela de código
com bolinhas de semáforo. Se for preciso mostrar o produto, é captura real dentro de `<figure>` com
no máximo um filete.

## Trama de pontos

A dobra do respondente traz uma trama de pontos no fundo (`PadraoPontos`), a 14% de branco, com
máscara elíptica que a apaga subindo — ela vive no pé da dobra, longe do título e do cartão.
Um `<pattern>` de SVG, que o navegador repete sozinho; nada de gerar centenas de elementos.

Tentei `mix-blend-mode: soft-light` primeiro, para o ponto acompanhar o gradiente em vez de ficar
como camada por cima. Sobre navy escuro ele levanta tão pouco que a trama sumia — opacidade direta
é previsível e chega no mesmo lugar.

Detalhe de empilhamento que custou caro: um `absolute` pinta **acima** de irmão não posicionado.
Sem `relative` nos irmãos, a trama passa por cima do texto em vez de ficar atrás dele.

## Marca

A marca aparece em dois lugares e nenhum deles é decoração de fundo: o símbolo com a palavra
"Volkswagen" no topo da dobra, e o favicon (`src/app/icon.svg`), que usa a mesma geometria sobre
um disco navy — em 16px, traço navy some na aba clara e traço branco some na escura; o disco
resolve os dois.

**Marca gigante atrás do texto foi tentada e removida.** Havia uma versão com o símbolo em traço
no fundo da dobra e uma janela que o revelava sob o cursor. Não ficou bom. Se a ideia voltar,
começa do zero — o componente saiu inteiro, junto com os keyframes que o animavam.

## Permissões por família

- **Marketing** pode usar enriquecimento — mas só Tier A (CSS puro: os gradientes) ou Tier B (SVG
  desenhado à mão). Nada gerado, nada de banco de imagens.
- **Fluxo** é tipografia e nada mais. A tela existe para uma pergunta ser respondida.
- **Decisão** e **Ferramenta** não usam enriquecimento nenhum. A função carrega a tela.

## O que toda página compartilha

- O símbolo VW e a palavra "Volkswagen".
- Inter, a escala de nove níveis, e o mono só no papel técnico.
- A voz de CTA (pílula, altura, verbo em primeira pessoa).
- O filete visível como divisor — nunca sombra pesada no lugar de linha.
- As quatro regras de interface do `docs/design-system.md`, com destaque para: **título nunca é
  colorido** e **nada em caixa alta**.

## O que pode variar entre páginas

- A macroestrutura, dentro da família da rota.
- O arquétipo de hero, dentro do que a família permite.
- A densidade do Bento — número e tamanho dos blocos muda com o que a tela tem para contar.

## O que não pode variar

Tema, tipografia, voz de CTA, arquétipo de rodapé. Páginas que fogem deste arquivo são slop, mesmo
quando bonitas isoladamente — o `hallmark audit` trata divergência daqui como achado estrutural
crítico.
