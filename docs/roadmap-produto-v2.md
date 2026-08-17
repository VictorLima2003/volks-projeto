# Roadmap v2 — o construtor como produto

> Derivado do briefing de 05/08/2026 (segundo áudio). Nada foi removido do pedido; o texto foi
> reorganizado, priorizado e transformado em critérios verificáveis. Onde eu tenho recomendação
> técnica, ela está marcada como **recomendação** — é opinião, não decisão tomada.

## Regra de execução

**Cada passo é isolado.** Implementado e verificado por vez, sem que um quebre o outro. A ordem
abaixo vai do mais contido (layout) ao mais estrutural (genericização, exportação).

---

## Duas implicações que atravessam tudo

O áudio contém dois pedidos que não são "mais uma tela" — eles mudam premissas do que já existe.
Registro aqui porque afetam todos os passos seguintes.

### A. O produto deixa de ser sobre a Uber

> *"Não quero que faça algo focado na Uber, quero que faça algo voltado na Volkswagen que pode
> aplicar essa pesquisa de várias e várias formas."*

Hoje o motor tem a Uber **cravada no código**:

| Onde | O que está preso |
| --- | --- |
| `Fatos.uber` | Namespace embutido, com `mesesUber`, `corridas`, `rating` |
| `UberDriver` | Tipo de domínio, base mockada, `/api/uber-base` |
| `FATOS_DISPONIVEIS` | Lista fixa de fatos "uber.*" oferecida nos seletores |
| Seed | Pesquisas, perguntas e régua escritas para o caso Uber |

Para o produto ser genérico, **tudo isso vira dado, não código**: os fatos disponíveis passam a
ser os identificadores das perguntas mais os retornos dos hooks. A Uber vira apenas *um hook de
exemplo*, igual a qualquer outra integração.

### B. O sistema não opina sobre aprovado/negado

> *"O sistema não deve saber o que deu certo e o que deu errado, porque essa é uma lógica que o
> usuário vai colocar."*

Hoje o motor tem opinião embutida: `ResultadoTipo` é `elegivel | nao_elegivel |
pendente_validacao | revalidar | erro`. Isso é vocabulário do caso Uber×VW, não de um produto
de pesquisas.

E há uma **colisão de nomes** que explica a confusão relatada — a palavra "aprovação" hoje
significa duas coisas diferentes no sistema:

| "Aprovação" | O que é | Onde aparece |
| --- | --- | --- |
| Governança | Uma pessoa revisa a **versão da regra** antes de ir a produção | `/gestor/revisoes` |
| Elegibilidade | O motor decide se o **respondente** passa | Resultado da jornada |

São coisas sem relação, com o mesmo rótulo. Precisam de nomes distintos.

**Recomendação:** o resultado da pesquisa passa a ser um **desfecho nomeado pelo autor** (ele
escreve o rótulo e escolhe o tipo visual), e o sistema só registra qual desfecho ocorreu. Governança
passa a se chamar **publicação/revisão de versão**, nunca "aprovação".

*Feito nos passos 4b e 4c.* O desfecho virou dado com `efeito` (`libera | segura | recusa`), e a
governança virou **revisão**: fila em `/gestor/revisoes`, status `em_revisao`, ações **publicar** e
**recusar**, papel `revisa`. A palavra "aprovação" não existe mais no código nem nas telas.

---

## 1. Layout da tela de construção

**Problema:** o construtor divide espaço com simulador e exemplos de respondente. A tela é de
construir questionário — tem que ser sobre isso.

**Entregas:**

- **Largura total** para a área de edição; simulador e exemplos saem daqui
- **Abas**: `Definição` e `Simulação`. A simulação roda o fluxo **ponta a ponta**, não só a lista
- **Estado do item legível**: hoje é difícil ver o que está aberto e o que está fechado. Aberto e
  fechado precisam ser inequívocos à distância

**Nota:** este é o passo mais barato e o de maior efeito percebido. Vai primeiro.

---

## 2. Condicionais genéricas

**Entregas:**

- Nenhuma amarra a Uber, Volkswagen ou qualquer marca — **todo input vem do usuário**
- Comparação contra:
  - **outra variável** da pesquisa (resposta de pergunta anterior)
  - **valor livre** digitado (texto ou número)
  - **retorno de hook**
- Operadores incluindo `maior que`, `igual a`, `contém`
- **Identificadores internos** por pergunta, para referência fácil nas condicionais

> A associação pergunta → condicional precisa ser **muito fácil**. É o critério de aceite real
> deste passo, não a lista de operadores.

---

## 3. Hooks de código — substituem CSV e API

> *"Ao invés de a gente criar mecanismo de CSV, criar mecanismo de API, a gente crie um mecanismo
> de código."*

O modelo atual de `Fonte` (tipo `csv` **ou** `api`) **colapsa em um só conceito: o hook.** O código
decide se faz `fetch`, se lê um CSV por URL, ou se processa um CSV que foi subido.

**Anatomia de um hook:**

| Campo | Descrição |
| --- | --- |
| Nome | Ex.: "Motor consumir API Uber" |
| Parâmetros | 1..N, definidos livremente; chegam como argumentos da função |
| Mensagem de carregamento | Texto exibido enquanto executa |
| Código | O corpo da função |
| Retorno | Associado ao hook e usável nas condicionais e perguntas |

**Tela dedicada** para gerenciar hooks.

**Editor com experiência de VS Code:** destaque de sintaxe, cores, linter, snippets.

- **Recomendação: Monaco.** É literalmente o editor do VS Code, então "similar ao VS Code" deixa de
  ser aproximação. Custa peso no bundle; fica isolado na tela de hooks, carregado sob demanda.

**JavaScript ou Python?** O briefing deixou em aberto e pediu avaliação.

- **Recomendação: JavaScript.** Roda no mesmo runtime do servidor, `fetch` é nativo, `async/await`
  natural, zero infraestrutura nova. Python exigiria Pyodide (~10MB no navegador, sem acesso de
  rede real) ou um serviço separado com fila e sandbox. O ganho não paga o custo agora.
- Se Python virar requisito depois (time de dados escrevendo os hooks), o caminho é um runner
  isolado — decisão que dá para tomar sem refazer o resto.

### Restrições verificadas (não teóricas)

Executar código do usuário no servidor tem **dois** problemas, e eles têm a mesma cura:

1. **Sem isolamento.** O código enxerga o processo. `require`, `process` e afins ficam sombreados,
   o que dificulta mas não impede.
2. **O limite de tempo não segura laço síncrono.** `Promise.race` só interrompe espera assíncrona
   (um `fetch` pendurado). Contra `while (true) {}` ele é inútil: o event loop trava e o próprio
   timer nunca dispara. **Testado — derruba o servidor inteiro.**

Correção para os dois: rodar em worker isolado com limite de CPU (`isolated-vm`, ou
`worker_threads` com `terminate()`). Enquanto isso não existir, o editor é ferramenta de time
interno. O aviso está na própria tela, não só aqui.

---

## 4. Submissões — visão agnóstica

**Entregas:**

- Tela com **100% das submissões, sem exceção**: as que retornaram falha e as que retornaram sucesso
- **Status técnico** do fluxo (executou, falhou, em andamento), não julgamento de negócio
- O sistema **não classifica** o resultado — só registra qual desfecho a lógica do autor produziu

Deve servir para qualquer pesquisa, não para o caso Uber.

---

## 5. Exportação e acesso externo

**Entregas:**

- **API REST** expondo os dados da pesquisa, com **credenciais próprias** e configuráveis
- Consumível por Python, R, Power BI
- **Exportação CSV** por download direto
- **Dashboard por pesquisa**: estruturar o modelo agora, construir depois

---

## Progresso

**Esta tabela é o único registro de onde o projeto parou.** O README aponta para cá em vez de
repetir o estado — enquanto existiam duas tabelas, elas divergiram (o README já marcava 4a como
feito enquanto aqui o passo 4 inteiro seguia em aberto).

O passo 4 foi quebrado em três porque as partes têm dependências diferentes: 4a era pré-requisito
dos hooks, 4b destrava a tela de submissões, e 4c é renomeação sem efeito no motor.

O 4a2 e o 4a4 não estavam previstos, e o segundo desfez parte do primeiro.

O 4a2 tirou de dentro da oferta as coisas que eram do sistema: cada oferta carregava a própria
cópia dos hooks, dos blocos e das versões de régua, e o efeito estava verificado na mão — editar o
hook num lugar não chegava no outro, e o que ficou para trás seguia consultando o endereço antigo
sem avisar ninguém.

O 4a4 foi mais fundo: **"campanha" era só um tipo de pesquisa**, a que tem verba e vigência. Uma
pesquisa de satisfação não tem nenhuma das duas, e manter duas entidades obrigava a criar dois
cadastros para publicar uma pergunta. Hoje existe `Pesquisa`, com `reguaId` opcional (quem só
coleta não decide) e `metadados` livres para o vocabulário do caso. Fonte e régua continuam na
**Biblioteca**, porque essas são compartilhadas por natureza.

O reuso do questionário morreu junto, de propósito: duas pesquisas parecidas se resolvem
duplicando e ajustando o que difere — é mais barato do que manter sincronizado o que é comum.

O 4a5 fechou o mesmo raciocínio nas regras. Elas chegaram a virar uma seção do sistema chamada
"réguas" — nome inventado e lugar errado. Regra é condição sobre o que **esta** pesquisa coletou:
editá-la longe das perguntas obrigava a ir e voltar para lembrar quais fatos existem, e o catálogo
de fatos tinha que juntar os campos de todas as pesquisas, oferecendo condição sobre pergunta que
aquela ali nunca faz. Hoje as versões moram em `Pesquisa.versoes`, e a aba **Regras** fica ao lado
do Fluxo. O rito continua igual: proposta, duplo-check por outra pessoa, histórico. Só a
`Biblioteca` sobrou no menu, com as fontes — que são endereço no mundo e servem a qualquer
pesquisa.

O que continua valendo dos dois: aprovar uma versão nova muda a decisão de quem está no ar — travar
a pesquisa na versão do dia em que nasceu faria aprovar uma correção não corrigir nada. E o que já
foi decidido não muda: cada sessão grava `ruleSetVersao`, e a auditoria continua sabendo qual
critério valeu para cada pessoa. Verificado: aprovar a v2 no piloto do Rio não mexeu na decisão de
São Paulo, que seguiu na v1.

| # | Passo | Estado | Quando |
| --- | --- | --- | --- |
| 1 | Layout do construtor: largura total, abas, estados | feito | 05/08/2026 |
| 2 | Condicionais genéricas + identificadores | feito | 05/08/2026 |
| 3 | Hooks de código com Monaco | feito | 06/08/2026 |
| 4a | Fatos dinâmicos — a Uber virou hook | feito | 07/08/2026 |
| 4a2 | Biblioteca: fonte e régua viraram coleções do sistema | feito | 10/08/2026 |
| 4a3 | Construtor em fluxograma (React Flow) ao lado da lista | feito | 10/08/2026 |
| 4a4 | Campanha deixou de existir: a pesquisa é a unidade | feito | 10/08/2026 |
| 4a5 | Regras voltaram para dentro da pesquisa | feito | 10/08/2026 |
| 4a6 | Capa configurável: fundo com prévia e cartão como sub-nó do fluxo | feito | 11/08/2026 |
| 4a7 | Tela de fim: um modelo só, configurável pelo bloco do fluxo | feito | 11/08/2026 |
| 4a8 | Publicar como ação: link para compartilhar e situação virando porta | feito | 11/08/2026 |
| 4a9 | Rascunho separado do que está no ar, com publicar e descartar | feito | 11/08/2026 |
| 4b.1 | Desfecho vira dado: texto sai do código, sistema passa a ler o `efeito` | feito | 11/08/2026 |
| 4b.2 | Editor de desfechos: folha própria, com prévia e trava de remoção | feito | 11/08/2026 |
| 4b.3 | Limpeza: `ResultadoTipo` saiu; sobrou `EfeitoDoDesfecho` | feito | 11/08/2026 |
| 4c | Separar os dois sentidos de "aprovação": governança virou **revisão** | feito | 12/08/2026 |
| 5 | Submissões: 100% delas, com estado técnico e a sessão nascendo no início | feito | 12/08/2026 |
| 6 | Exportação: CSV do recorte + API por credencial da pesquisa | feito | 12/08/2026 |
| 7a | Histórico sintético: o gerador sorteia fatos e o motor decide | feito | 17/08/2026 |
| 7b | `analise.ts`: recorte e agregação puros, servindo tela, CSV e API | feito | 17/08/2026 |
| 7c | Gráficos próprios em SVG (rosca, barras, colunas, linha, cruzada) | feito | 17/08/2026 |
| 7d | Indicadores em Bento, com filtros na URL e comparação de período | feito | 17/08/2026 |
| 7e | CSV do recorte inteiro + `/api/publico/agregado` + exemplos colar-e-usar | feito | 17/08/2026 |
| 7f | Visualizações montadas pelo gestor e guardadas na pesquisa | a fazer | — |
| — | Fluxograma como grafo de verdade (caminhos que se juntam) | fase 2 | — |

### Duas ordens que não são negociáveis

**4b antes de 5.** A tela de submissões precisa mostrar qual desfecho ocorreu; enquanto o desfecho
for um enum fixo, ela nasce presa ao vocabulário errado e teria que ser refeita.

**Persistência antes de 6.** Exportar dados que somem no restart do servidor é meio vazio.

---

## Ordem proposta

| # | Passo | Peso | Depende de |
| --- | --- | --- | --- |
| 1 | Layout: largura total, abas, estado dos itens | médio | — |
| 2 | Condicionais genéricas + identificadores | médio | 1 |
| 3 | Hooks: modelo, tela e editor Monaco | **alto** | 2 |
| 4 | Genericização (tirar Uber do código, desfechos nomeados) | **alto** | 2, 3 |
| 5 | Submissões: visão completa e agnóstica | médio | 4 |
| 6 | Exportação: CSV + API com credenciais | médio | 5 |
| 7 | Dashboard por pesquisa | — | fase posterior |

A genericização (passo 4) vem **depois** dos hooks porque é o hook que substitui os fatos `uber.*`
embutidos. Fazer antes deixaria o motor sem fonte de dados nenhuma.
