# Volkswagen

Plataforma para **construir pesquisas com lógica condicional e decisão automatizada**.

---

## O conceito

### O problema que originou

A Volkswagen quer vender com condição especial para motorista de aplicativo, e precisa decidir quem
tem direito. A decisão depende de dados que estão **fora** da VW (base do parceiro, bureau de
crédito) e de critérios que mudam por praça, por trimestre, por oferta.

O caminho comum é escrever um formulário e cravar os critérios no código. Aí toda mudança de regra
vira demanda de desenvolvimento, e quem entende do negócio fica na fila.

### A inversão

Volkswagen não é o formulário. É a ferramenta com que o time de negócio **constrói** o formulário e a
lógica junto. Três peças se encaixam:

**A pesquisa é uma árvore, não uma lista.** Perguntas, condicionais, consultas e telas finais são
blocos da mesma cadeia. Uma condicional abre um ramo; o que está dentro dele só existe naquele
caminho. A estrutura do fluxo fica legível na indentação, sem ninguém precisar ler código.

**Dados externos entram por hook.** Um hook é código JavaScript escrito num editor embutido
(Monaco, o mesmo do VS Code). Ele faz `fetch` numa API, lê um CSV anexado, cruza os dois — e
devolve fatos. A base do parceiro não é uma funcionalidade do sistema: é um hook de 15 linhas.

**A regra decide, não a tela.** As regras vivem fora da interface, versionadas, com trilha de
auditoria e revisão em duas pessoas — quem propõe não pode aprovar. Mudar "500 corridas" para "400"
é editar um campo e pedir revisão, não abrir um pull request.

### Por que o motor é agnóstico

O motor **não conhece Uber, Volkswagen, motorista ou elegibilidade**. Ele conhece exatamente dois
tipos de fato:

| Origem | Forma | Exemplo |
| --- | --- | --- |
| Resposta da pesquisa | `resposta.<identificador>` | `resposta.modelo` |
| Retorno de hook | `<prefixo>.<chave>` | `credito.score` |

Não existe terceiro. Um caminho como `uber.mesesUber` funciona porque **existe um hook com prefixo
`uber`**, não porque o código sabe o que é Uber.

Isso custou uma refatoração grande — foi preciso arrancar um namespace tipado de dentro do motor.
O sinal de que deu certo: quando a base do parceiro virou hook, **nenhuma regra precisou mudar**.

A consequência prática é que a mesma ferramenta serve para a próxima pesquisa, seja sobre
concessionária, pós-venda, frota ou qualquer coisa que não tenha a ver com carro.

### O que isso muda na prática

O respondente vê 4 perguntas em vez de 12, porque o que os hooks já trouxeram não precisa ser
perguntado. O gestor muda um critério sem abrir chamado. E a auditoria consegue reconstruir, meses
depois, qual versão de qual regra decidiu cada caso — e com que dados.

### Onde o caso de uso mora

Todo o vocabulário do caso Uber × VW está em **dados**: `seed.ts`, os hooks, os metadados de cada
pesquisa e os textos das telas. Nada disso está em tipos ou lógica.

Se você for escrever "uber", "volkswagen" ou "elegível" dentro de `src/lib/`, provavelmente é o
caminho errado — quase sempre o certo é um campo configurável.

A única lista fechada que sobrou é o `EfeitoDoDesfecho` (`libera | segura | recusa`) — e ela é do
sistema, não do negócio: é o que o vendedor e a central precisam saber para agir. O nome do
desfecho é do autor.

---

## Rodar

```bash
npm install
```

```bash
npm run dev
```

http://localhost:3000

**Os dados são em memória.** Reiniciar o servidor devolve tudo ao seed. Para resetar sem reiniciar:

```bash
curl -X POST http://localhost:3000/api/reset
```

---

## Publicar

A imagem de produção sai do `Dockerfile` da raiz — três estágios, `output: standalone`, ~3,4 MB de
aplicação sobre o `node:22-alpine`, rodando como usuário sem privilégio.

```bash
docker build -t volkswagen . && docker run -p 3000:3000 volkswagen
```

No EasyPanel: serviço **App**, origem no repositório, método de build **Dockerfile**, porta **3000**.
Nenhuma variável de ambiente é necessária — não há banco nem chave.

**O que precisa ser dito antes de mostrar para alguém:** o store é em memória. Todo deploy,
reinício ou queda do contêiner devolve os dados ao seed. Pesquisa criada some, submissão respondida
some, credencial de API some. Isso é adequado para demonstração e não é adequado para piloto com
gente real respondendo — o próximo passo, quando for a hora, é trocar o store por um banco.

E o de sempre: o editor de fontes **executa JavaScript no servidor sem isolamento**. Num endereço
público, quem entrar na área do gestor executa código na sua VPS. Como não há senha, "quem entrar"
é qualquer um que saiba um e-mail da lista. Enquanto for demonstração, mantenha o endereço restrito.

---

## Os três conceitos

Entender estes três resolve 90% do código.

### 1. A pesquisa é uma árvore de blocos

Não é uma lista de perguntas com `if` escondido dentro. São quatro tipos de bloco em cadeia:

| Bloco | O que faz |
| --- | --- |
| `pergunta` | Coleta uma resposta. Tem um **identificador** (`campo`) usado nas condições |
| `condicional` | Avalia uma condição e abre o ramo `entao` ou `senao` |
| `consulta` | Dispara um hook, injetando o retorno como fatos |
| `feedback` | Encerra o caminho. Nada pode vir depois dele |

```
pergunta     Confirme seu CPF                    → resposta.cpf
consulta     Localizar na base de parceiros      → uber.*
pergunta     Autoriza a consulta?                → resposta.consentimento
consulta     Consultar restrições de crédito     → credito.*
condicional  Encontrado na base
  ├─ então:  Qual modelo te interessa?
  │          Concessionária preferida
  └─ senão:  Seu e-mail para análise
             feedback  "Vamos analisar seu caso"
```

O percurso é recalculado a cada resposta — uma resposta nova pode abrir ou fechar ramos adiante.

### 2. Fatos são um dicionário plano, montado em tempo de execução

```js
{
  resposta: { cpf: "111...", modelo: "T-Cross" },   // o que foi respondido
  uber:     { encontrado: true, mesesUber: 14 },     // veio do hook de prefixo "uber"
  credito:  { encontrado: true, score: 842 }         // veio do hook de prefixo "credito"
}
```

Condições e regras leem por caminho: `resposta.modelo`, `credito.score`, `uber.mesesUber`.

**O motor não conhece nenhum prefixo por nome.** `uber` está aí porque existe um hook com esse
prefixo, não porque o código sabe o que é Uber.

### 3. Hooks são código que traz dados de fora

Um hook tem nome, prefixo, parâmetros, mensagem de carregamento, código e anexos. O código é o
**corpo de uma função assíncrona** e decide sozinho se faz `fetch`, se lê um CSV anexado, ou os dois.

```js
const linhas = await csv('parceiros.csv');            // anexo ou URL
const achado = linhas.find(l => chave(l.documento) === chave(documento));
if (!achado) return null;                              // null = não encontrou
return { nome: achado.nome, mesesUber: Number(achado.mesesUber) };
// → uber.nome, uber.mesesUber
```

No escopo do código: os parâmetros que você definiu, mais `csv()`, `log()`, `chave()` e `fetch`.

Editado em `/gestor/fontes` com Monaco (o editor do VS Code).

Uma **pesquisa** também viaja por arquivo: **Exportar**, no popover do nome dentro do construtor,
baixa o que está na tela — capa, blocos, desfechos e os critérios que decidem. **Importar pesquisa**,
na lista, cria sempre uma **nova** em rascunho, nunca sobrescreve, e avisa quando o arquivo cita
fonte que não existe nesta instalação. As fontes não vão dentro da pesquisa: são da instalação, e
o código delas pode ler bases que só existem lá.

Uma fonte sai e entra por arquivo: **Exportar** baixa `fonte-<prefixo>.json` com código,
parâmetros, rótulos e anexos; **Importar JSON** põe o arquivo na tela, desligado, para ser lido
antes de valer. O arquivo se identifica em `formato`, então trocar pesquisa por fonte é recusado
com uma frase e não com erro de campo faltando.

---

## Áreas e rotas

Cada perfil tem sua área. **Não existe header global** — quem está numa área não vê as outras.

`/gestor` e `/vendedor` exigem sessão: sem cookie, o middleware desvia para `/entrar` guardando o
endereço pretendido, e quem entra na área errada é mandado para a sua. As APIs que mudam alguma
coisa respondem `401` sem sessão — o middleware é a primeira tranca, não a única. **A área do
respondente continua aberta**, e é o ponto dela: o link da pesquisa vai para quem não tem conta aqui.

**Não há senha.** O e-mail é conferido contra a lista de cadastros e a sessão vira um cookie. Isso
separa papéis; não protege contas. Antes de sair de demonstração, entra autenticação de verdade.

| Rota | Área | O que é |
| --- | --- | --- |
| `/` | — | Escolha de área |
| `/entrar` | Gestor e vendedor | Login por e-mail; manda cada perfil para a sua área |
| `/motorista` | Respondente | Entrada da jornada |
| `/motorista/jornada?pesquisa=&cpf=` | Respondente | A pesquisa, passo a passo |
| `/vendedor` | Vendedor | Carteira de pedidos |
| `/vendedor/consulta?cpf=` | Vendedor | Situação, motivo, próxima ação |
| `/gestor/pesquisas` | Gestor | Lista de pesquisas com perguntas e respostas (a porta do gestor) |
| `/gestor/pesquisas/nova` | Gestor | Criação (nome e descrição) |
| `/gestor/pesquisas/[id]` | Gestor | **Construtor** — Fluxo, Definição, Regras, Simulação, Configuração |
| `/gestor/pesquisas/[id]/regras-editar` | Gestor | Edita os critérios e propõe nova versão |
| `/gestor/pesquisas/[id]/indicadores` | Gestor | Indicadores daquela pesquisa: funil, desfechos, motivos |
| `/gestor/fontes` | Gestor | **Editor de código** das fontes |
| `/gestor/revisoes` | Gestor | Fila de versões em revisão e trilha de decisões |
| `/gestor/submissoes` | Gestor | Todas as submissões, com estado técnico, CSV e credenciais de API |
| `/gestor/central` | Gestor | Fila de exceções: o gestor libera ou recusa o que o motor segurou |

APIs internas: `pesquisa`, `hooks`, `executar-hook`, `rulesets`, `decidir`, `pedidos`,
`lookup`, `identidade`, `sessao`, `central`, `exportar`, `tokens`, `reset`.

**API externa** — a única rota pensada para ser chamada de fora:

```
GET /api/publico/submissoes?pesquisa=<id>[&formato=csv]
Authorization: Bearer <token da pesquisa>
```

Devolve as submissões da pesquisa com as mesmas colunas do CSV. Sem token válido, `401` — o mesmo
`401` para pesquisa inexistente, de propósito: responder `404` ali deixaria qualquer um mapear
quais pesquisas existem. As credenciais nascem e morrem em `/gestor/submissoes`, uma por destino.

Duas limitações deste protótipo, ditas em voz alta porque valem uma decisão antes de ir a sério:
o token é **comparado em texto** (não há hash) e **não existe limite de requisições**.

---

## O construtor de pesquisa

A tela principal do produto. Duas abas:

**Definição** — a árvore em largura total. Cada bloco abre em acordeão; fechado mostra um resumo
de uma linha (`Escolha única · 5 opções`), aberto ganha borda azul, elevação e cabeçalho tingido.
Reordena por **arrasto** ou pelas setas ↑↓.

**Simulação** — responde de verdade, os hooks **executam de verdade**, e um painel lateral mostra o
percurso e os fatos se acumulando. É a mesma máquina da jornada real.

### Condições

O lado esquerdo é um fato; o direito é **um valor digitado ou outro fato**. Comparar resposta com
resposta dispensa número fixo no meio da regra.

Os operadores são filtrados pelo tipo: numérico oferece `maior que`; texto oferece `contém`,
`começa com`; booleano oferece `é verdadeiro`.

O catálogo de fatos é montado na hora, agrupado por origem, e **só oferece o que já foi coletado
antes daquele ponto da árvore**.

### Validações

Rodam no cliente (feedback imediato) e no servidor (a trava real), pela mesma função.

| Situação | Resultado |
| --- | --- |
| Identificador repetido em qualquer ponto da árvore | Erro |
| Identificador inválido (`2-modelo!`) | Erro |
| Escolha com menos de duas opções | Erro |
| Condição depende de resposta que vem **depois** | Erro |
| Bloco depois de um `feedback` | Erro, com a contagem do que ficaria inalcançável |
| Condição usa campo que não existe | Aviso |

As duas do meio são as que pegam gente experiente: nos dois casos nada quebra — o ramo
simplesmente nunca abre, em silêncio.

---

## Regras e governança

As regras são avaliadas **por prioridade crescente, e a primeira que casar vence**. O resultado
carrega motivo, próxima ação, id da regra e versão do RuleSet — a trilha de auditoria.

Publicar uma regra não ativa nada: **propõe**.

```
Ana (Produto) edita → v4 em aprovação → Marina (Compliance) aprova → v4 em produção
                                      ↘ rejeita com motivo → fica registrada como rejeitada
```

Travas no servidor, não só na tela:

| Situação | Resposta |
| --- | --- |
| Quem propôs tenta aprovar a própria proposta | `403 autoaprovacao` |
| Usuário sem papel de aprovação | `403 sem_permissao` |
| Segunda proposta com uma já pendente | `409 ja_existe_pendente` |
| Rejeição sem motivo | `400 motivo_obrigatorio` |
| Prioridades duplicadas | `400 prioridades_duplicadas` |

O diff mostrado ao aprovador compara com **o que está em produção hoje**, não com a versão de
número anterior — uma versão rejeitada nunca valeu e não serve de referência.

Não há login: a identidade vive num cookie, com um seletor no canto superior direito. Quatro
pessoas — duas que só propõem, uma que só aprova, uma que faz as duas coisas. Troque de pessoa para
ver os dois lados.

---

## Arquitetura

```
src/lib/
  types.ts               Domínio inteiro: Bloco, Hook, Regra, RuleSet, Pesquisa, Sessao
  engine.ts              Puro, sem I/O. Condições, decisão, percurso da árvore, catálogo de fatos
  hooks-runtime.ts       Executor dos hooks (server-only)
  store.ts               Estado em memória (singleton no globalThis)
  seed.ts                Pesquisas, hooks e regras de exemplo
  identidade.ts          Usuários e papéis (puro, cliente + servidor)
  identidade-server.ts   Leitura do cookie (server-only)
  validacao-pesquisa.ts  Validação da árvore + utilidades de manipulação
  fluxo.ts               Árvore de blocos → grafo do construtor visual
  catalogo.ts            Rótulos de status da esteira comercial

src/components/
  ShellGestor / ShellFluxo   Cromo por área (gestor tem nav, fluxo não)
  EditorCondicao             Editor de comparação, usado na pesquisa e nas regras
  EditorCodigo               Monaco
  Abas, Cabecalho, ui.tsx    UI kit
```

`engine.ts` não conhece React nem o store. Roda no cliente (decidir qual pergunta mostrar) e no
servidor (decidir o resultado) com o mesmo código.

---

## Sistema visual

Paleta extraída do site da Volkswagen Brasil:

| Token | Hex | Uso |
| --- | --- | --- |
| `vw-deep` | `#001E50` | Azul da marca: botão primário, aba ativa, filete |
| `ink-900` | `#1B2236` | Texto e **todos os títulos** |
| `ink-600` | `#606574` | Texto de apoio (piso de contraste) |
| `ink-300` | `#DFE4E8` | Linhas e divisores |
| `ink-100` | `#F6F5F2` | Fundo de bloco |

Três regras válidas para a interface inteira:

1. **Título nunca é colorido.** O estado se comunica por filete, selo ou faixa. "Pedido bloqueado"
   é navy com uma faixa vermelha acima, não texto vermelho.
2. **Botão é pílula** (`rounded-full`), como no site da VW.
3. **Linha é visível.** O desenho se apoia na grade, não em sombra pesada.

Tipografia Inter via `next/font`. Títulos usam `.display` (peso 500). Nada abaixo de `ink-600` em
texto — é o piso para 4.5:1.

---

## Restrições em aberto

Leia antes de assumir que algo está pronto.

### Dados em memória

Tudo vive num singleton no `globalThis`. Reiniciar perde tudo.

**Consequência prática:** toda mudança de schema exige `POST /api/reset`, senão o store guarda
objetos do formato antigo e as telas quebram com `undefined`. Isso já aconteceu duas vezes durante
o desenvolvimento — não é hipótese.

### Hooks rodam sem isolamento

O código do hook executa no servidor via `AsyncFunction`. Dois problemas, com a mesma cura:

1. **Sem sandbox.** `require`, `process` e afins estão sombreados, o que dificulta mas não impede.
2. **Laço síncrono infinito derruba o servidor.** O limite de 10s usa `Promise.race`, que só
   interrompe espera *assíncrona*. Contra `while (true) {}` é inútil: o event loop trava e o próprio
   timer nunca dispara. **Testado — o processo para de responder e precisa ser reiniciado.**

A correção dos dois: worker isolado com limite de CPU (`isolated-vm`, ou `worker_threads` com
`terminate()`).

### O vocabulário do desfecho — resolvido

Era um enum fixo (`elegivel | nao_elegivel | ...`) com o texto das telas escrito em código. Hoje
cada pesquisa tem seus `desfechos`, editáveis na folha **Desfechos** do construtor: nome, título,
texto, quadro de próximo passo, cor e `efeito`. As pesquisas nascem com os cinco de sempre, com os
mesmos ids — por isso as regras já gravadas continuaram valendo.

### "Aprovação" significava duas coisas — resolvido

A palavra fazia dois trabalhos sem relação: governança da versão de regra e veredito sobre quem
responde. Hoje são duas palavras.

| O que é | Como se chama | Onde |
| --- | --- | --- |
| Governança | **Revisão** de versão — publicar ou recusar | `/gestor/revisoes` |
| Veredito | **Desfecho**, nomeado por quem monta a pesquisa | Fim da jornada |

O desfecho carrega um `efeito` (`libera | segura | recusa`), e é ele — não o nome — que o vendedor,
o painel e a central leem.

---

## Onde parou e o que vem

Os passos 1 a 6 estão fechados. O que resta do roadmap é o **7 — dashboard por pesquisa**, marcado
como fase posterior, e o fluxograma como grafo de verdade, na fase 2.

As restrições em aberto continuam as mesmas e estão descritas acima: hook sem isolamento real,
store em memória, token de API guardado em texto e sem limite de requisições.

A tabela de progresso, a ordem dos passos e o porquê de cada dependência vivem em
[`docs/roadmap-produto-v2.md`](docs/roadmap-produto-v2.md), com os pedidos originais preservados —
**é o único registro de estado**, e este README não o repete de propósito.
[`docs/roadmap-produto.md`](docs/roadmap-produto.md) tem a fase anterior, já concluída.

---

## Dados de exemplo

Documentos no CSV do hook `Base de parceiros`:

| Documento | Cenário |
| --- | --- |
| `111.222.333-44` | Passa (14 meses, 2.380 corridas) |
| `666.777.888-99` | Passa (18 meses, 3.010) |
| `555.666.777-88` | Barrado por corridas (7 meses, 480) |
| `444.555.666-77` | Barrado por tempo **e** restrição de crédito |
| `777.888.999-00` | Conta suspensa **e** restrição de crédito |
| `999.888.777-66` | Fora da base → cai na tela final de análise |

O último é o mais interessante: mostra o ramo `senao` e o bloco de feedback funcionando.
