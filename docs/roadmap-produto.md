# Roadmap de produto — Wolks

> Documento derivado do briefing de 05/08/2026. Nada foi removido do pedido original;
> o texto foi reorganizado em blocos, priorizado e transformado em critérios verificáveis.

## Regra de execução

**Cada item desta lista é um passo isolado.** Um passo não altera o que outro entrega, é
implementado e verificado por vez, e só então seguimos para o próximo. Nada de agrupar
entregas "porque dá no mesmo" — se um passo quebrar, os outros continuam de pé.

A ordem abaixo é a de execução proposta. Ela vai do mais barato e mais visível (tipografia,
navegação) para o mais estrutural (construtor de questionário, dados externos), porque cada
passo posterior se apoia no anterior.

---

## Progresso

- [x] **1. Tipografia dos títulos** — concluído em 05/08/2026
- [x] **2. Estrutura de navegação e URLs** — concluído em 05/08/2026
- [x] **3. Motor do formulário** — concluído em 05/08/2026
- [x] **4. Área do gestor e questionário de campanha** — concluído em 05/08/2026
- [x] **5. Construtor de questionários** — concluído em 05/08/2026
- [x] **6. Dados externos e elegibilidade** — concluído em 05/08/2026
- [x] **7. Componente de tela final** — concluído em 05/08/2026
- [ ] 8. Visualização em fluxograma *(fase 2)*
- [ ] 9. Dashboard e exportação *(fase posterior)*

---

## 1. Tipografia dos títulos

**Problema:** os H1 estão em negrito com traço grosso. O resultado tem "cara de inteligência
artificial" — genérico, pesado.

**Entrega:** substituir por uma tipografia mais **fina, minimalista e sofisticada**.

> Nota: o site da Volkswagen usa peso 200 nos títulos. Ir mais leve aproxima da marca em vez
> de afastar.

---

## 2. Estrutura de navegação e URLs

**Problema:** o header concentra todas as visões ao mesmo tempo, e isso gera confusão. Todos os
personagens do tabuleiro aparecem lado a lado para qualquer pessoa.

**Entrega:**

- **Remover o header global.**
- Separar as áreas por perfil, cada uma com **URL própria**:
  - URL exclusiva do **usuário** (motorista)
  - URL exclusiva do **vendedor**
  - URL exclusiva do **gestor**

**Escopo:** somente esses três. As visões continuam existindo, mas em áreas distintas.

> "Pelo menos por agora" — a separação por URL é a decisão desta fase, não necessariamente
> definitiva.

Uma vez com isso no lugar, fica fácil trabalhar o restante.

---

## 3. Motor do formulário (preenchimento)

O formulário já é 100% step-by-step. O que falta é acabamento.

**Entrega:**

- Motor step-by-step **mais fácil e mais elegante**.
- **Animação de transição** entre as etapas.
- **Cards bem minimalistas**, que de fato reflitam essa intenção.

---

## 4. Área do gestor e questionário de campanha

**Entrega:**

- Ver as **pesquisas já criadas em grid**.
- Dar um tapa no questionário de criação de campanha, que hoje está **extremamente limitado**:
  - mais **idades** (faixas etárias)
  - mais **estados**
  - mais **carros** — não pode ser só um tipo de veículo

**Nota do briefing:** "isso aí é básico, quero que você só dê um tapa no questionário."

---

## 5. Construtor de questionários (página própria)

O ponto mais estrutural do pedido.

**Referência:** o **Chartness** — produto já trabalhado em React, com construção de
questionários e uma profundidade muito maior, focado em *interview*. **Não queremos chegar
nesse nível**, porque ele tem um pouco de tudo. O alvo aqui é construir questionários de
**forma simplificada, com tipos simples**.

**Entregas:**

- **Página própria** para o motor de construção do questionário.
- **Condicional deixa de ser subtipo de um item.** Ela vira **um item da própria lista**:
  ```
  pergunta
  pergunta
  pergunta
  condicional  ──▶ se resolvida, abre mais perguntas dentro da árvore
  ```
  Ou seja: adicionar perguntas na cadeia, adicionar condicionais na cadeia, e a condicional
  ramifica sub-perguntas na árvore. *"Essa é a forma mais interessante que eu acho."*
- **Drag and drop** para trocar a ordem das perguntas.
- **Identificadores** nas perguntas — interessante e necessário.

---

## 6. Dados externos e elegibilidade

**Objetivo:** é aqui que se resolve o consumo da API da Uber.

**Entregas:**

- **Triggers de consulta** na pergunta. Provavelmente **GET, não PUSH**: o motorista coloca o
  CPF e o sistema dispara a busca.
- **Fontes de dados plugáveis:**
  - API da Uber
  - arquivo **CSV** subido como base de conhecimento
- **Tratamento do retorno:** um **JavaScript** (ou equivalente) que trata o resultado da
  consulta e traz a informação de volta para a pergunta.
- **Validação multinível:** ligar **uma, duas ou três bases diferentes** para avaliar a
  elegibilidade do motorista.

**Ponto em aberto do briefing:** *"Não sei se essa é a forma mais ideal, mais indicada da gente
fazer esse tipo de modificação, mas eu acho que fica legal."* — a arquitetura de triggers +
bases + script de tratamento é uma proposta a validar, não uma decisão fechada.

### Como ficou implementado

A **consulta virou um bloco da cadeia**, igual à condicional. Quando o fluxo chega nela, dispara a
busca usando uma resposta já coletada, roda o script e injeta os fatos.

Cada fonte tem um **prefixo**, e é o prefixo que permite o cruzamento: a Uber escreve `uber.*`, o
CSV de crédito escreve `credito.*`, uma API parceira escreveria `parceiro.*`. Uma regra pode ler de
quantas quiser.

**Risco conhecido e aceito nesta fase:** o script de tratamento roda como JavaScript no servidor
via `new Function`. Isso não é sandbox — é execução de código arbitrário. Aceitável enquanto quem
escreve é o próprio time num protótipo; em produção exige isolamento real (`isolated-vm`, worker
com timeout) ou uma linguagem de expressão restrita no lugar de JS livre. A tela avisa isso ao
usuário.

---

## 7. Componente de tela final (feedback)

**Racional:** a pesquisa é um fluxograma, e todo fluxograma tem um final. Esse final pode ser
condicionado — pode ser um final feliz, um final bom, ou simplesmente o registro de que a
pesquisa foi resolvida.

**Entrega:** um **componente de feedback** que encerra o fluxo. **Nenhum bloco vem depois
dele.**

Configurável:

| Propriedade | Valores |
| --- | --- |
| Título | texto livre |
| Imagem | — |
| Cor | — |
| Tipo | `info`, `warning` ou `error` |

### Como ficou implementado

O feedback é um **bloco terminal** da árvore, ao lado de pergunta, condicional e consulta.
Vive tipicamente dentro de um ramo — é assim que o final fica condicionado.

Além dos três tipos pedidos, incluí **`sucesso`** (verde): o briefing falava em "um final feliz",
e mapear isso para `info` perderia a intenção. Se preferir só os três, é remover uma linha.

Cada tipo tem cor padrão, e o autor pode sobrescrever com um seletor de cor. A tela do construtor
mostra uma **prévia** do que o motorista verá.

**Trava:** nenhum bloco pode existir depois de um feedback na mesma lista — a API recusa com a
contagem do que ficaria inalcançável. A decisão de elegibilidade continua sendo gravada em segundo
plano, para o dashboard e a auditoria não perderem o caso.

---

## 8. Visualização em fluxograma — **fase 2**

O formulário é montado **em forma de bloco**: vai-se criando bloco a bloco.

Além disso, seria muito interessante ver **em forma de fluxograma** como o formulário está
sendo resolvido. *"Eu acho que é uma visão também muito interessante."*

**Status:** explicitamente marcado como possível fase 2, e com pedido de opinião —
*"veja o que você acha"*.

---

## 9. Dashboard, tratamento e exportação — **fase posterior**

**Entrega:** olhar com carinho a parte de dashboard. Como lidar com a informação e tratar os
dados será desenhado depois.

**Hipótese de mecanismo:** exportar **da forma mais fácil possível**, **normalizando os
valores** antes de exportar.

**Status:** *"isso a gente consegue ver com tranquilidade depois."*

---

## Quadro de prioridade

| # | Passo | Peso | Fase |
| --- | --- | --- | --- |
| 1 | Tipografia dos H1 | baixo | agora |
| 2 | Remover header · URLs por perfil | médio | agora |
| 3 | Motor step-by-step: cards e animação | médio | agora |
| 4 | Gestor: grid + questionário de campanha | médio | agora |
| 5 | Construtor de questionário (página própria, árvore, drag and drop, IDs) | **alto** | agora |
| 6 | Dados externos: triggers, CSV, API, script, multibase | **alto** | agora |
| 7 | Componente de tela final (feedback) | médio | agora |
| 8 | Visão em fluxograma | alto | fase 2 |
| 9 | Dashboard: normalizar e exportar | médio | fase posterior |
