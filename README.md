# Wolks · Motor de Elegibilidade Uber × Volkswagen

Protótipo ponta a ponta de uma plataforma de **jornadas de elegibilidade**: a empresa cria campanhas,
conecta a base Uber, monta uma pesquisa dinâmica e o motor decide se o motorista avança na jornada
de compra Volkswagen.

O produto não é um formulário. É um motor onde **cada campanha tem suas próprias perguntas, condições,
regras e resultados** — e a regra vive fora da tela.

## Rodar

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:3000.

Dados ficam em memória e voltam ao estado inicial quando o servidor reinicia.
Para resetar sem reiniciar: `POST /api/reset`.

## Rotas por perfil

| Perfil | Rota | O que faz |
| --- | --- | --- |
| Portal | `/` | Escolha do perfil |
| Admin | `/admin` | Campanhas, verba, KPIs |
| Admin | `/admin/campanhas/nova` | Cria campanha (herda perguntas + RuleSet v1) |
| Admin | `/admin/campanhas/[id]` | Visão da campanha e sessões |
| Admin | `/admin/campanhas/[id]/base` | Sobe/inspeciona a base Uber |
| Admin | `/admin/campanhas/[id]/perguntas` | Perguntas e suas condições de exibição |
| Gestor | `/gestor/campanhas/[id]/fontes` | Bases externas: CSV, API e script de tratamento |
| Admin | `/admin/campanhas/[id]/regras` | RuleSet ativo, histórico de versões e diff |
| Admin | `/admin/campanhas/[id]/regras/editar` | Edita critérios e publica nova versão |
| Admin | `/admin/campanhas/[id]/simulador` | Roda um caso e mostra qual regra dispara |
| Admin | `/admin/aprovacoes` | Fila de propostas e trilha de decisões |
| Motorista | `/motorista` | Início da jornada |
| Motorista | `/motorista/jornada?campanha=&cpf=` | Pesquisa dinâmica + resultado |
| Vendedor | `/vendedor` | Carteira de pedidos |
| Vendedor | `/vendedor/consulta?cpf=` | Liberado/bloqueado, motivo, próxima ação |
| Central | `/central` | Exceções, divergências, jornadas em aberto |
| Diretoria | `/dashboard` | Funil, motivos, conversão por concessionária |

## Como o motor funciona

**Fatos.** A base Uber e as respostas do motorista viram um único dicionário:
`uber.mesesUber`, `uber.corridas`, `uber.status`, `uber.encontrado`, `resposta.modelo`, etc.

**Lógica de exibição.** Cada pergunta tem uma `condicao` opcional. Se ela não bate, a pergunta não
aparece. É isso que faz a pesquisa encolher de 5 para 3 perguntas quando o CPF não está na base.

**Lógica de decisão.** As regras são avaliadas por prioridade crescente e **a primeira que casar vence**.
O resultado carrega motivo, próxima ação, id da regra e versão do RuleSet — a trilha de auditoria.

**Bloqueio real.** `POST /api/pedidos` reavalia a elegibilidade no servidor e responde `409` se o
motorista não for elegível. A trava não está na UI.

Regra base (RuleSet v1): 6 meses ou mais de Uber **e** 500 corridas ou mais **e** conta ativa.

## Editor e simulador

O time de negócio muda a regra **pela tela**, sem tocar em código.

**Simulador** (`/simulador`) — cole um CPF da base ou monte um caso hipotético (meses, corridas,
status, CPF fora da base). O motor roda o RuleSet inteiro sem parar na primeira regra que casa e
devolve o rastro: cada regra, cada termo, o valor esperado ao lado do **observado**, e qual venceu.
Numa regra com grupo E, você vê que 2 de 3 critérios passaram e exatamente qual falhou.
Simular não grava sessão nem pedido.

**Editor** (`/regras/editar`) — altera limiares, mensagens, prioridade (setas ↑↓), adiciona e remove
regras. Publicar cria uma **nova versão**; a anterior nunca é sobrescrita e continua explicando as
decisões já tomadas. Da tela de regras dá para voltar a qualquer versão anterior com um clique.

Duas travas que valem citar:

- **Prioridades duplicadas são recusadas** pela API — sem elas a ordem de avaliação fica ambígua.
- **Aviso de texto fora de sincronia.** A mensagem ao motorista é texto livre e não acompanha o
  limiar. Se você baixa "corridas" de 500 para 400 e esquece o texto, o motorista leria uma
  explicação que não bate com a regra aplicada. O editor detecta o número órfão e avisa antes de
  publicar.

## Sistema visual

Paleta e formas extraídas do site oficial da Volkswagen Brasil (vw.com.br):

| Token | Hex | Uso |
| --- | --- | --- |
| `vw-deep` | `#001E50` | Azul da marca: botão primário, marca, aba ativa, filete |
| `ink-900` | `#1B2236` | Texto e **todos os títulos** |
| `ink-800` | `#293043` | Navy secundário (hover) |
| `ink-600` | `#606574` | Texto de apoio |
| `ink-300` | `#DFE4E8` | Linhas e divisores |
| `ink-100` | `#F6F5F2` | Fundo quente de bloco |

Três regras que valem para a interface inteira:

1. **Título nunca é colorido.** O estado se comunica por filete, selo ou faixa — nunca tingindo a
   headline. Um "Pedido bloqueado" é navy com uma faixa vermelha acima, não um texto vermelho.
2. **Botão é pílula** (`rounded-full`), como no site da VW. Campos e cartões usam raio discreto.
3. **Linha é visível.** Divisores em `#DFE4E8`, bordas de destaque em `#B9C2CB` — o desenho se apoia
   na grade, não em sombras pesadas.

Tipografia: Inter, carregada via `next/font` (sem CDN em runtime). A escala foi ampliada em relação
ao padrão do Tailwind — corpo a 17px, títulos até 88px, rótulos em maiúsculas com peso 700.

## Construtor de pesquisa

`/admin/campanhas/[id]/perguntas` — o time monta a pesquisa pela tela: adicionar, remover,
reordenar (↑↓), trocar tipo, editar opções e definir **quando cada pergunta aparece**.

A condição de exibição aceita dois tipos de fato: o contexto da Uber (`uber.encontrado`,
`uber.status`…) e **respostas anteriores** da própria pesquisa. O seletor só oferece respostas de
perguntas que vêm antes — não dá para depender de algo ainda não perguntado.

**Preview ao vivo.** O painel à direita mostra o que um motorista específico veria. Escolha alguém
da base ou "CPF fora da base" e a lista recalcula na hora, separando o que aparece do que é pulado
e por quê:

```
Patrícia Lima (18m, 3010 corridas)  →  6 perguntas
CPF fora da base                    →  3 perguntas, 4 puladas
                                       ✗ Qual modelo VW te interessa?  exige uber.encontrado truthy
```

É aqui que o "perguntar menos" fica visível para quem elabora, não só para quem responde.

**Validações**, rodando no cliente (feedback imediato) e no servidor (a trava real):

| Situação | Resultado |
| --- | --- |
| Duas perguntas com a mesma chave | Erro: cada resposta precisa de chave própria |
| Escolha com menos de duas opções | Erro |
| Chave inválida (`2-modelo!`) | Erro: deve começar com letra |
| Condição depende de resposta que vem **depois** | Erro: a pergunta nunca apareceria |
| Condição depende de campo inexistente | Aviso |

A terceira e a quarta são as que pegam gente experiente: uma pergunta condicionada a uma resposta
ainda não coletada some da pesquisa sem erro nenhum — só não aparece.

Perguntas **não** passam por aprovação, diferente das regras: elas mudam o que se pergunta, não
quem é elegível. A decisão continua vindo do RuleSet aprovado. Quem só tem papel de aprovação
(Compliance) vê a tela em modo leitura.

## Tela final: o fluxo tem fim

A pesquisa é um fluxograma, e todo fluxograma termina. O **feedback** é um bloco terminal da
árvore — normalmente dentro de um ramo, o que deixa o final condicionado:

```
condicional  CPF encontrado na base Uber
  ├─ então:  ...perguntas comerciais...       → resultado padrão pelas regras
  └─ senão:  Seu e-mail para análise manual
             fim  "Vamos analisar seu caso"   ← tela desenhada pelo autor
```

Configurável: **tipo** (`sucesso`, `info`, `warning`, `error`), **título**, **mensagem**,
**imagem** por URL e **cor** — cada tipo tem uma cor padrão que pode ser sobrescrita. O construtor
mostra uma prévia ao lado.

Nenhum bloco pode vir depois: a API recusa e diz quantos ficariam inalcançáveis. A decisão de
elegibilidade segue sendo gravada em segundo plano — o motorista vê a mensagem desenhada, e o
dashboard e a auditoria continuam recebendo o caso.

## Dados externos: fontes e consultas

`/gestor/campanhas/[id]/fontes` — cada fonte é uma base plugada na campanha.

| Tipo | Como funciona |
| --- | --- |
| **CSV** | Cole ou suba o arquivo. A busca casa pela coluna escolhida, ignorando pontuação de CPF |
| **API** | GET em `https://.../{chave}`, com cabeçalhos. `{chave}` vira o valor de entrada |

O retorno passa por um **script de tratamento** que devolve um objeto — cada propriedade vira um
fato sob o **prefixo** da fonte:

```js
// dado = { cpf: "444...", score: "530", restricao: "sim" }
return { score: Number(dado.score), temRestricao: dado.restricao === 'sim' };
// → credito.score = 530, credito.temRestricao = true
```

O prefixo é o que permite **cruzar bases**: Uber escreve `uber.*`, crédito escreve `credito.*`, e
uma regra lê de quantas quiser. Prefixos duplicados são recusados — uma fonte apagaria os fatos da
outra.

Na pesquisa, a consulta é um **bloco da cadeia**, ao lado de perguntas e condicionais:

```
pergunta     Confirme seu CPF
pergunta     Autoriza a consulta?
busca        Consultar restrições de crédito   ← dispara aqui, alimentada pelo CPF
condicional  CPF encontrado na base Uber
```

A tela de fontes tem um **testador**: informe um valor e veja o registro bruto e os fatos gerados
lado a lado.

> **Aviso de segurança.** O script roda como JavaScript no servidor via `new Function`. Não é
> sandbox. Aceitável num protótipo em que quem escreve é o próprio time; em produção precisa de
> isolamento real ou de uma linguagem de expressão restrita.

## Governança: quem propõe não aprova

Mudar uma regra muda quem compra carro com desconto. Por isso publicar não ativa nada — **propõe**.

```
Ana (Produto) edita → v4 em aprovação → Marina (Compliance) aprova → v4 em produção
                                      ↘ rejeita com motivo → v4 fica registrada como rejeitada
```

Enquanto a proposta está na fila, a versão atual continua valendo. A tela de aprovação mostra o
diff **em relação ao que está em produção hoje**, não à versão de número anterior — uma versão
rejeitada nunca valeu e não serve de referência.

Travas aplicadas no servidor, não só na tela:

| Situação | Resposta |
| --- | --- |
| Quem propôs tenta aprovar a própria proposta | `403 autoaprovacao` |
| Usuário sem papel de aprovação | `403 sem_permissao` |
| Segunda proposta com uma já pendente | `409 ja_existe_pendente` |
| Rejeição sem motivo | `400 motivo_obrigatorio` |
| Prioridades duplicadas entre regras | `400 prioridades_duplicadas` |

Toda versão guarda quem propôs, quem decidiu, quando e (se rejeitada) por quê — visível no painel
de histórico e na trilha de decisões.

O protótipo não tem login: a identidade vive num cookie e há um seletor no canto superior direito
com quatro pessoas (duas que só propõem, uma que só aprova, uma que faz as duas coisas). Troque de
pessoa para ver os dois lados. Em produção isso viria do SSO — o que já está pronto é o motor
tratar "quem propõe" e "quem aprova" como pessoas distintas.

## Arquitetura

```
src/lib/types.ts    Domínio: campanha, pergunta, condição, regra, sessão, pedido
src/lib/seed.ts     Base Uber mockada, campanhas, RuleSet v1
src/lib/engine.ts   Avaliação de condições, decisão, fluxo de perguntas (puro, sem I/O)
src/lib/store.ts    Estado em memória (singleton no globalThis)
src/lib/identidade.ts  Usuário atual (cookie) e papéis propõe/aprova
src/lib/validacao-perguntas.ts  Validação da pesquisa (cliente + servidor)
src/app/api/*       lookup, decidir, pedidos, campanhas, uber-base, reset
src/components/*    Shell (navegação por perfil) e UI kit
```

`engine.ts` não conhece React nem o store — é testável isoladamente e roda tanto no cliente
(para decidir qual pergunta mostrar) quanto no servidor (para decidir elegibilidade).

## CPFs de demonstração

| CPF | Cenário |
| --- | --- |
| `111.222.333-44` | Elegível (14 meses, 2.380 corridas) |
| `555.666.777-88` | Bloqueado por corridas (7 meses, 480) |
| `444.555.666-77` | Bloqueado por tempo (4 meses, 320) |
| `777.888.999-00` | Conta suspensa |
| `121.232.343-45` | Conta inativa |
| `999.888.777-66` | Fora da base → fila da Central |

## Formato do CSV da base Uber

```
cpf,nome,cidade,uf,mesesUber,corridas,status,rating
123.456.789-00,Maria Silva,São Paulo,SP,10,780,ativo,4.85
```

## Próximos passos

- Expiração de elegibilidade com revalidação antes do pedido
- Notificar o aprovador quando uma proposta entra na fila
- Persistência real (hoje tudo é memória) e SSO no lugar do seletor de usuário
