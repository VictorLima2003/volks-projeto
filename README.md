# Wolks

Plataforma para **construir pesquisas com lógica condicional e decisão automatizada**.

---

## O conceito

### O problema que originou

A Volkswagen quer vender com condição especial para motorista de aplicativo, e precisa decidir quem
tem direito. A decisão depende de dados que estão **fora** da VW (base do parceiro, bureau de
crédito) e de critérios que mudam por campanha, por região, por trimestre.

O caminho comum é escrever um formulário e cravar os critérios no código. Aí toda mudança de regra
vira demanda de desenvolvimento, e quem entende do negócio fica na fila.

### A inversão

Wolks não é o formulário. É a ferramenta com que o time de negócio **constrói** o formulário e a
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

Todo o vocabulário do caso Uber × VW está em **dados**: `seed.ts`, os hooks da campanha e os textos
das telas. Nada disso está em tipos ou lógica.

Se você for escrever "uber", "volkswagen" ou "elegível" dentro de `src/lib/`, provavelmente é o
caminho errado — quase sempre o certo é um campo configurável.

Exceção conhecida: `ResultadoTipo` ainda é um enum fixo (`elegivel | nao_elegivel | ...`). É dívida
declarada, mapeada como próximo passo (4b). Não construa nada novo em cima dela.

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

Editado em `/gestor/campanhas/[id]/hooks` com Monaco (o editor do VS Code).

---

## Áreas e rotas

Cada perfil tem sua área. **Não existe header global** — quem está numa área não vê as outras.

| Rota | Área | O que é |
| --- | --- | --- |
| `/` | — | Escolha de área |
| `/motorista` | Respondente | Entrada da jornada |
| `/motorista/jornada?campanha=&cpf=` | Respondente | A pesquisa, passo a passo |
| `/vendedor` | Vendedor | Carteira de pedidos |
| `/vendedor/consulta?cpf=` | Vendedor | Situação, motivo, próxima ação |
| `/gestor` | Gestor | Grid de campanhas |
| `/gestor/campanhas/nova` | Gestor | Criação (modelos, UFs, faixas etárias) |
| `/gestor/campanhas/[id]` | Gestor | Visão da campanha |
| `/gestor/campanhas/[id]/pesquisa` | Gestor | **Construtor** — abas Definição e Simulação |
| `/gestor/campanhas/[id]/hooks` | Gestor | **Editor de código** |
| `/gestor/campanhas/[id]/regras` | Gestor | RuleSet ativo, histórico, diff |
| `/gestor/campanhas/[id]/regras/editar` | Gestor | Edita e propõe nova versão |
| `/gestor/aprovacoes` | Gestor | Fila de propostas e trilha |
| `/gestor/central` | Gestor | Exceções |
| `/gestor/dashboard` | Gestor | Indicadores |

APIs: `campanhas`, `pesquisa`, `hooks`, `executar-hook`, `rulesets`, `decidir`, `pedidos`,
`lookup`, `identidade`, `reset`.

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
  types.ts               Domínio inteiro: Bloco, Hook, Regra, Campanha, Sessao
  engine.ts              Puro, sem I/O. Condições, decisão, percurso da árvore, catálogo de fatos
  hooks-runtime.ts       Executor dos hooks (server-only)
  store.ts               Estado em memória (singleton no globalThis)
  seed.ts                Campanhas, hooks e RuleSet de exemplo
  identidade.ts          Usuários e papéis (puro, cliente + servidor)
  identidade-server.ts   Leitura do cookie (server-only)
  validacao-pesquisa.ts  Validação da árvore + utilidades de manipulação
  catalogo.ts            Modelos, UFs, faixas etárias, concessionárias

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

### O vocabulário ainda é do caso Uber×VW

O tipo `ResultadoTipo` é um enum fixo: `elegivel | nao_elegivel | pendente_validacao | revalidar |
erro`. Isso é opinião do sistema sobre o negócio, e contraria o princípio de que o autor define a
lógica. Está mapeado como próximo passo (4b).

### "Aprovação" significa duas coisas

| "Aprovação" | O que é | Onde |
| --- | --- | --- |
| Governança | Alguém aprova a **versão da regra** | `/gestor/aprovacoes` |
| Elegibilidade | O motor decide se o **respondente** passa | Resultado da jornada |

Sem relação entre si, mesmo rótulo. Foi apontado como confuso e está mapeado (4c).

---

## Onde parou e o que vem

O plano vive em [`docs/roadmap-produto-v2.md`](docs/roadmap-produto-v2.md), com os pedidos
originais preservados. Estado:

| # | Passo | Estado |
| --- | --- | --- |
| 1 | Layout do construtor: largura total, abas, estados | feito |
| 2 | Condicionais genéricas + identificadores | feito |
| 3 | Hooks de código com Monaco | feito |
| 4a | Fatos dinâmicos — a Uber virou hook | feito |
| **4b** | **Desfechos nomeados pelo autor** | **próximo** |
| 4c | Separar os dois sentidos de "aprovação" | pendente |
| 5 | Submissões: ver 100% delas, com status técnico | pendente |
| 6 | Exportação: CSV + API com credenciais | pendente |
| 7 | Dashboard por pesquisa | fase posterior |
| — | Visualização em fluxograma | fase 2 |

[`docs/roadmap-produto.md`](docs/roadmap-produto.md) tem a fase anterior, já concluída.

### Sugestão de ordem

**4b antes de 5.** As submissões precisam mostrar "qual desfecho ocorreu"; enquanto o desfecho for
um enum fixo, a tela nasce presa ao vocabulário errado.

**Persistência antes de 6.** Exportar dados que somem no restart é meio vazio.

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
