# Design system — Volkswagen

> Referência de cor, gradiente e tipografia. Todo valor aqui é rastreável até um token real em
> `tailwind.config.ts` — nada neste documento é decorativo, e nada nele é específico do caso
> Uber×VW. Versão navegável (com swatches clicáveis e copiáveis):
> [artifact publicado](https://claude.ai/code/artifact/6bce7bb1-b2d8-41dc-8778-11a9eee57879).

---

## Regras de interface

Valem para o sistema inteiro, não só para telas novas. As três primeiras já estavam no README; a
quarta foi adicionada nesta revisão.

1. **Título nunca é colorido.** O estado se comunica por filete, selo ou faixa acima — nunca pela
   cor do texto.
2. **Botão é sempre pílula** (`rounded-full`), como no site da marca.
3. **Linha é visível.** O desenho se apoia na grade, não em sombra pesada.
4. **Sem eyebrow e sem caixa alta.** Nenhum rótulo pequeno acima de título, nenhum texto com todas
   as letras maiúsculas em lugar nenhum do sistema. A hierarquia se resolve por tamanho, peso e
   posição — não por decoração em cima do texto. Isso vale para rótulos de seção, badges, legendas
   e qualquer `text-transform: uppercase`.

---

## Grid

Duas famílias de grid — nunca uma terceira. Mas a escolha entre elas segue o **formato da tarefa**,
não quem está de frente pra tela. Essa distinção existia errada numa versão anterior deste
documento (dizia "toda tela do motorista" — errado, ver nota no fim da seção).

### Fluxo (captura de campo — jornada do motorista)

Para telas onde a pessoa resolve uma coisa de cada vez, sem nada mais competindo por atenção. Hoje
é só `/motorista/jornada`.

- **Colunas:** 1, sempre.
- **Container:** 672px (`max-w-2xl`), centralizado. Aqui a largura *é* o conteúdo — não sobra
  espaço por preencher, porque não há mais nada na tela além do campo atual.
- **Gutter:** 24px (`px-6`), fixo em qualquer largura de tela.
- **Componente:** `<ShellFluxo largura="estreita">`.
- **O cabeçalho acompanha este container, e não o de 1280px.** Enquanto ele era sempre largo, a
  marca ficava colada na borda esquerda da tela e o questionário centrado a 672px no meio — dois
  eixos na mesma página, o que lê como desalinhamento. A correção é alinhar o cabeçalho, nunca
  alargar o questionário: aqui a medida estreita **é** o conteúdo, e esticá-la para 1280px
  estouraria a medida de leitura pela qual ela existe.
- **Por quê 672px:** ~65-75 caracteres por linha a 19px é a medida de leitura confortável — e como
  a largura não muda entre uma pergunta e outra, a pessoa não sente o layout "pular" a cada tela
  (o mesmo princípio que serviços de elegibilidade como o GOV.UK Design System usam).

### Dashboards e telas de decisão (gestor, vendedor, e a home do motorista)

Para telas onde a pessoa está avaliando informação ou decidindo o próximo passo — não preenchendo
um campo por vez. Inclui todo o gestor, todo o vendedor, e a home do motorista (`/motorista`),
porque ali a pessoa ainda não começou a responder nada: está lendo o que é a oferta, vendo "como
funciona", decidindo se começa. Isso é mais parecido com a tela de um dashboard do que com uma
pergunta da jornada.

- **Colunas:** 12 em desktop (`lg:`, ≥1024px), compostas em múltiplos de 12 — `lg:grid-cols-2`
  (span 6), `lg:grid-cols-3` (span 4), `lg:grid-cols-4` (span 3), `lg:grid-cols-6` (span 2). 2
  colunas em tablet (`md:`, ≥768px). Empilhado (1 coluna) abaixo disso.
- **Container:** 1280px (`max-w-7xl`) — `ShellGestor` e `<ShellFluxo largura="larga">` (vendedor e a
  home do motorista, que é o valor padrão do componente) usam o mesmo valor para as três áreas
  ficarem visualmente no mesmo grid sem duplicar constante nenhuma.
- **Não há exceção de largura.** Existiu uma de 1600px (`largura="ampla"`) para as telas de
  construção, e ela foi removida: a marca e a navegação pulavam 73px na horizontal a cada ida de
  Campanhas para Pesquisa, e nenhuma das telas precisava do espaço extra. Tela nova não ganha
  largura própria — se precisar, o problema é do layout dela.
- **Gutter:** 24px (`px-6`), fixo.
- **Texto corrido continua com medida de leitura estreita por dentro** (`max-w-2xl` envolvendo só o
  parágrafo, não a página) — o container de 1280px é a moldura da tela, não o tamanho da linha de
  texto. É por isso que a home do motorista usa esse container largo (tem card de formulário ao
  lado do "Como funciona") mas o parágrafo do topo ainda quebra numa faixa estreita.

| Gap | Valor | Uso |
| --- | --- | --- |
| `gap-3` | 12px | Tiras densas de KPI/estatística |
| `gap-4` | 16px | Campos de formulário relacionados, dentro de um card |
| `gap-6` | 24px | Composição de cards/painéis no nível da página |

`grid-cols-12` explícito fica reservado para alinhar campos dentro de uma única linha ou card (ex.:
`EditorCondicao`, o editor de hooks) — não para compor a página inteira.

> **Correção em relação à primeira versão desta seção:** a versão anterior definia o grid por
> *quem* acessa a tela ("toda tela do motorista usa o grid estreito") e empurrou a home do
> motorista para 672px em coluna única. No desktop isso deixava sobrando espaço vazio nas laterais
> sem tratamento nenhum, e empurrava "Como funciona" e os CPFs de demonstração pra baixo da dobra
> sem necessidade — a home tem conteúdo de sobra pra ocupar a largura, diferente da jornada, onde a
> coluna estreita *é* o conteúdo inteiro. A regra certa é por **formato da tarefa** (uma pergunta
> por vez vs. avaliar informação e decidir), não por área do produto.

---

## Escala azul

950 → 50, ancorada nos dois tokens de marca já usados no produto: `#001E50` (900, `vw.deep`) e
`#1B57C4` (600, `vw.blue`). É a cor de ação, ênfase e superfície escura.

| Passo | Hex | Uso sugerido |
| --- | --- | --- |
| azul-950 | `#00112C` | Fundo de tela escura, base de gradiente |
| azul-900 | `#001E50` | **Marca** — botão primário, filete, aba ativa |
| azul-800 | `#093177` | Superfície escura secundária (cartão sobre fundo escuro) |
| azul-700 | `#12449D` | Borda/divisor sobre fundo escuro |
| azul-600 | `#1B57C4` | **Interativo** — link, ícone ativo, foco |
| azul-500 | `#3E71CE` | Hover de interativo |
| azul-400 | `#628CD7` | Acento leve, gráfico, destaque secundário |
| azul-300 | `#85A6E1` | Fundo tingido para estado ativo em superfície clara |
| azul-200 | `#A8C0EB` | Borda tingida |
| azul-100 | `#CCDBF4` | Fundo tingido bem sutil |
| azul-50 | `#EFF5FE` | Fundo quase branco, com leve tom de marca |

**Piso de texto:** de 950 a 500, texto branco. De 400 a 50, texto em cinza-900 — abaixo de azul-500
o branco perde contraste suficiente (< 4.5:1).

---

## Escala cinza

950 → 50, com leve viés azulado em vez de cinza neutro puro — a mesma família por trás dos tokens
`ink-*` já existentes no código, estendida com um degrau 950 que faltava para fundos escuros.

| Passo | Hex | Uso sugerido |
| --- | --- | --- |
| cinza-950 | `#121623` | Fundo escuro alternativo (sem ser azul de marca) |
| cinza-900 | `#1B2236` | **Texto principal** e todos os títulos (`ink-900`) |
| cinza-800 | `#293043` | Texto secundário forte, ícone ativo em fundo claro |
| cinza-700 | `#484E5F` | Texto de apoio forte |
| cinza-600 | `#606574` | **Piso de contraste** — nada abaixo disso em texto (`ink-600`) |
| cinza-500 | `#9AA0AC` | Placeholder, ícone inativo (não usar em texto de leitura) |
| cinza-400 | `#C3C8D0` | Borda de destaque, divisor forte |
| cinza-300 | `#DFE4E8` | Linha e divisor padrão (`--line`) |
| cinza-200 | `#E9EBEE` | Fundo de bloco sutil |
| cinza-100 | `#F6F5F2` | Fundo de bloco (`ink-100`) |
| cinza-50 | `#FBFAF8` | Fundo de página |

---

## Cores semânticas

Sucesso, alerta e erro — cada uma com faixa própria de 50 a 900, para dar conta de selo, filete,
fundo tingido e texto com contraste seguro sem depender da escala azul ou cinza. Ancoradas nos
tokens `signal.go/warn/stop` já existentes.

### Sucesso — elegível, aprovado, concluído

| Passo | Hex |
| --- | --- |
| 50 | `#ECF5EF` |
| 100 | `#CAE2D4` |
| 300 | `#87BE9D` |
| 500 | `#0E7C3A` (`signal.go`) |
| 700 | `#0B632E` |
| 900 | `#084420` |

### Alerta — pendente de validação, revisar, atenção

| Passo | Hex |
| --- | --- |
| 50 | `#F7F1EB` |
| 100 | `#E8DAC9` |
| 300 | `#CBAB85` |
| 500 | `#96560B` (`signal.warn`) |
| 700 | `#784509` |
| 900 | `#532F06` |

### Erro — não elegível, bloqueado, falha técnica

| Passo | Hex |
| --- | --- |
| 50 | `#FAECED` |
| 100 | `#F0C9CE` |
| 300 | `#DD8591` |
| 500 | `#BB0B22` (`signal.stop`) |
| 700 | `#96091B` |
| 900 | `#670613` |

**Convenção comum às três:** 50/100 para fundo tingido de selo ou faixa; 300 para borda; 500 para
ícone e ponto de destaque; 700 para texto sobre fundo claro (contraste seguro); 900 reservado para
fundo escuro ou ênfase máxima.

---

## Gradientes

Cinco gradientes com função definida — nenhum é "decoração livre". **Cada um caminha em degraus da
própria escala** (um stop por vizinho na escala, nunca dois extremos direto um no outro), porque
saltar de um tom muito escuro para um muito claro em poucos stops lê como emenda, não como
gradiente. `Sinal` e `Glow` foram revisados nesta versão por causa exatamente disso — as versões
anteriores concentravam a mudança de luz em um ou dois stops e ficavam com uma transição dura entre
a parte clara e a escura.

| Nome | CSS | Uso |
| --- | --- | --- |
| **Profundo** | `linear-gradient(160deg, #00112C 0%, #001E50 55%, #093177 100%)` | Fundo de tela escura, cartão de destaque, cabeçalho de app |
| **Sinal** | `linear-gradient(120deg, #001E50 0%, #12449D 30%, #1B57C4 60%, #3E71CE 85%, #628CD7 100%)` | Marca em movimento — azul-900 a azul-400 em 5 paradas, sem salto pro claro. CTA principal, estado ativo |
| **Glow** | `radial-gradient(circle at 28% 22%, #3E71CE 0%, #1B57C4 35%, #12449D 65%, #001E50 100%)` | Spotlight de produto — faixa mais estreita (azul-500 a azul-900) e mais degraus entre centro e borda. Hero, tela de elegível |
| **Névoa** | `linear-gradient(160deg, #FBFAF8 0%, #EFF5FE 55%, #E9EBEE 100%)` | Superfície clara, fundo de seção neutra, painel lateral |
| **Scrim** | `linear-gradient(0deg, rgba(0,17,44,0.92) 0%, rgba(0,17,44,0.55) 45%, rgba(0,17,44,0) 100%)` | Sobreposição para legibilidade de texto sobre foto de veículo |

---

## Tipografia

Inter em todos os níveis, sem par de família (`var(--font-inter)`, com fallback de sistema já
configurado). H1–H3 usam peso 500 (o "display" fino da marca VW); H4–H6 sobem para 600 para não
perder presença em corpo menor; B1/B2 ficam em 400; legenda em 500. Nenhum nível usa caixa alta —
ver regra 4 acima.

| Nível | Desktop | Mobile | Peso | Altura de linha | Tracking |
| --- | --- | --- | --- | --- | --- |
| D0 (dobra) | 72px / 4.5rem | 44px / 2.75rem | 500 | 1.05 | -0.03em |
| H1 | 56px / 3.5rem | 36px / 2.25rem | 500 | 1.1 | -0.025em |
| H2 | 44px / 2.75rem | 30px / 1.875rem | 500 | 1.15 | -0.02em |
| H3 | 34px / 2.125rem | 26px / 1.625rem | 500 | 1.2 | -0.015em |
| H4 | 28px / 1.75rem | 22px / 1.375rem | 600 | 1.25 | -0.01em |
| H5 | 22px / 1.375rem | 19px / 1.1875rem | 600 | 1.3 | -0.005em |
| H6 | 19px / 1.1875rem | 17px / 1.0625rem | 600 | 1.35 | 0em |
| B1 (corpo padrão) | 17px / 1.0625rem | 16px / 1rem | 400 | 1.6 | 0em |
| B2 (corpo secundário) | 15px / 0.9375rem | 14px / 0.875rem | 400 | 1.55 | 0em |
| Legenda | 13px / 0.8125rem | 12px / 0.75rem | 500 | 1.4 | 0.01em |

**Mapeamento com o `fontSize` do Tailwind:** D0→`6xl`, H1→`5xl`, H2→`4xl`, H3→`3xl`, H4→`2xl`,
H5→`xl`, H6→`lg`, B1→`base`, B2→`sm`, Legenda→`xs`.

**D0 é o degrau de dobra e só as telas de marketing usam** (`/` e `/motorista`). Ele existe porque
um hero que preenche a dobra não cabe em H1 — e a alternativa era um tamanho solto no meio do JSX,
que é como escalas tipográficas morrem. Nenhuma tela de decisão ou de ferramenta pode usá-lo.

**Está implementado.** Cada nível é um `clamp()` que interpola entre a coluna mobile (a 375px) e a
desktop (a 1280px), então não há breakpoint de tipografia para manter. O `rem` no meio do clamp é
deliberado: com o tamanho puramente em `vw`, o texto pararia de responder ao zoom do navegador.

Altura de linha e tracking também vivem no token, por nível. Antes ficavam na classe `.display` do
`globals.css`, que vencia por ordem de cascata e achatava H1, H2 e H3 no mesmo 1.1/-0.025em —
`.display` hoje cuida só do peso (500, e 600 em `.display-sm`).

---

## Tokens de engenharia

**Está implementado** em `tailwind.config.ts`, dentro de `theme.extend.colors`, ao lado dos tokens
`ink`, `vw` e `signal` já existentes.

```ts
azul: {
  950: "#00112C", 900: "#001E50", 800: "#093177", 700: "#12449D",
  600: "#1B57C4", 500: "#3E71CE", 400: "#628CD7", 300: "#85A6E1",
  200: "#A8C0EB", 100: "#CCDBF4", 50: "#EFF5FE",
},
cinza: {
  950: "#121623", 900: "#1B2236", 800: "#293043", 700: "#484E5F",
  600: "#606574", 500: "#9AA0AC", 400: "#C3C8D0", 300: "#DFE4E8",
  200: "#E9EBEE", 100: "#F6F5F2", 50: "#FBFAF8",
},
sucesso: { 50: "#ECF5EF", 100: "#CAE2D4", 300: "#87BE9D", 500: "#0E7C3A", 700: "#0B632E", 900: "#084420" },
alerta:  { 50: "#F7F1EB", 100: "#E8DAC9", 300: "#CBAB85", 500: "#96560B", 700: "#784509", 900: "#532F06" },
erro:    { 50: "#FAECED", 100: "#F0C9CE", 300: "#DD8591", 500: "#BB0B22", 700: "#96091B", 900: "#670613" },
```

`cinza` e `sucesso`/`alerta`/`erro` sobrepõem parcialmente `ink` e `signal` — a ideia é que eles
substituam esses tokens (mesma paleta, faixa completa) conforme as telas forem migrando, não que
convivam com eles indefinidamente. **A migração das telas ainda não aconteceu:** o que está no
código hoje continua usando `ink` e `signal`; os tokens novos existem e estão disponíveis, à espera
de quem os adote. Trocar tudo de uma vez seria um diff grande sem nada verificável no fim.

Os cinco gradientes da seção anterior também estão no config, em `theme.extend.backgroundImage`:
`bg-profundo`, `bg-sinal`, `bg-glow`, `bg-nevoa`, `bg-scrim`. Nenhuma tela usa ainda.
