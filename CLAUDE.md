# Instruções do projeto

Leia o [README](README.md) primeiro — ele explica o produto. Este arquivo é sobre **como trabalhar
neste código sem quebrá-lo**.

## O princípio que governa tudo

**O motor não pode conhecer nenhum domínio de negócio pelo nome.**

Isto foi uma decisão explícita e custou uma refatoração grande. Antes, `uber` era um namespace
tipado dentro de `engine.ts`, com `UberDriver`, base mockada e lista fixa de fatos. Hoje a Uber é
apenas um hook com prefixo `"uber"` — e as regras continuaram funcionando sem uma linha alterada,
justamente porque o caminho `uber.mesesUber` nunca precisou saber de onde vinha.

Na prática:

- Se você for escrever `"uber"`, `"volkswagen"`, `"motorista"` ou `"elegível"` dentro de `src/lib/`,
  pare e pense. Quase sempre o certo é um campo configurável.
- Fatos só entram por dois caminhos: resposta de pergunta (`resposta.*`) ou retorno de hook
  (`<prefixo>.*`). Não existe terceiro.
- O vocabulário do caso de uso mora em `seed.ts`, nos textos das telas, e nos dados — nunca em tipos
  ou lógica.

Exceção conhecida e mapeada: `ResultadoTipo` ainda é um enum fixo (`elegivel | nao_elegivel | ...`).
É dívida, está no roadmap como passo 4b. Não construa nada novo em cima dele.

## Idioma e estilo

O código é **em português**: nomes, tipos, comentários, mensagens de erro. `perguntasVisiveis`,
`ehCondicional`, `montarFatos`. Mantenha — misturar idiomas aqui piora a leitura.

Comentários explicam **por quê**, não o quê. Compare:

```ts
// ruim: incrementa o contador
// bom:  Mesmo sem achar registro, marcamos a consulta como feita — senão o
//       fluxo trava tentando de novo para sempre.
```

Os comentários existentes que registram armadilhas são deliberados. Não os remova ao refatorar.

## Antes de mexer

### Sempre

```bash
npx tsc --noEmit
```

O TypeScript é o guia de refatoração deste projeto. As migrações grandes (lista plana → árvore,
fontes → hooks, remover a Uber) foram feitas mudando o tipo primeiro e deixando o compilador
listar os pontos. Funciona bem — use.

### Nunca rode `npm run build` com o dev server ligado

Os dois brigam pelo diretório `.next` e o build falha com `ENOENT` ou o dev server passa a
responder 500. Pare o servidor, limpe, builde:

```bash
rm -rf .next && npm run build
```

Aconteceu três vezes. Não é teórico.

### Depois de mudar qualquer tipo do domínio

```bash
curl -X POST http://localhost:3000/api/reset
```

O store é um singleton no `globalThis` e **sobrevive ao hot-reload**. Sem o reset, ele guarda
objetos no formato antigo e as telas quebram com `Cannot read properties of undefined`. Isso já
gerou duas caçadas a bugs que não existiam.

Ao ler campos novos em telas existentes, use `?? []` / `?? {}` — o store pode estar velho.

## Armadilhas do ambiente

### Um hook com laço infinito derruba o servidor

O limite de tempo em `hooks-runtime.ts` usa `Promise.race`, que só interrompe espera assíncrona.
`while (true) {}` trava o event loop e o timer nunca dispara. Se o servidor parar de responder
depois de você testar um hook, é isso — reinicie.

Não "conserte" esse timeout com outro `setTimeout`. A cura é worker isolado com `terminate()`.

### Pastas com `[id]` e o PowerShell

`Remove-Item "src/app/gestor/campanhas/[id]/x"` **não funciona** — o PowerShell trata `[id]` como
classe de caracteres e não casa nada, silenciosamente. Use `-LiteralPath`.

### Pastas com `_` são invisíveis para o Next

`src/app/api/_teste/route.ts` dá 404. O Next trata `_` como pasta privada.

## Convenções que valem manter

### Validação roda dos dois lados, pela mesma função

`validacao-pesquisa.ts` é importada pelo cliente (feedback imediato) e pela API (a trava real).
Se você adicionar uma regra de validação, adicione ali — não duplique no componente.

### Travas de negócio ficam no servidor

Autoaprovação, prioridade duplicada, prefixo repetido, bloco depois do feedback: tudo é recusado
pela API com um código e um `detalhe` legível. A UI desabilita botões por conveniência, mas a
decisão é do servidor.

### Regras de interface

- **Título nunca é colorido.** O estado vai em filete, selo ou faixa acima. Há um `h1,h2,h3 { color }`
  no `globals.css` para segurar isso.
- **Botão é pílula** (`rounded-full`).
- **Nada abaixo de `ink-600`** em texto — é o piso para contraste 4.5:1. Ícone decorativo que não
  alcance o piso deve ser escondido, não clareado.

### `server-only`

`hooks-runtime.ts` e `identidade-server.ts` importam `server-only`. Isso existe porque o `Shell`
é usado por Client Components — sem a marca, `next/headers` vazava para o bundle do navegador e o
build quebrava. Se criar módulo que lê cookie ou executa código, marque igual.

## Como verificar o que você fez

Não existe suíte de testes. A verificação é por execução real:

1. `npx tsc --noEmit`
2. Subir o dev server e bater nas rotas afetadas esperando 200
3. Exercitar o fluxo de verdade — a jornada do respondente é o teste de integração deste projeto
4. `rm -rf .next && npm run build` no fim

Para testar lógica pura (motor de condições, por exemplo), o caminho que funcionou foi criar uma
rota temporária em `src/app/api/<nome>/route.ts` que exercita o módulo compilado, chamar por
`curl`, e apagar depois. Node não importa `.ts` direto.

Ao verificar CSS por `getComputedStyle`, atenção: **propriedades em transição podem reportar o
valor inicial** se o navegador não estiver compositando frames. Se um valor animado parecer errado,
force `element.style.transition = 'none'` antes de medir.

## Ao terminar um passo

O roadmap em `docs/roadmap-produto-v2.md` tem uma tabela de progresso. Marque o passo concluído
ali — é o único registro de onde o projeto parou.

Trabalhe **um passo por vez**, verificado antes do próximo. Foi como o projeto inteiro foi
construído e é o que mantém as migrações grandes reversíveis.
