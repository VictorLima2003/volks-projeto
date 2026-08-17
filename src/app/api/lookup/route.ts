import { NextResponse } from "next/server";
import { mapaDeRotulos } from "@/lib/engine";
import { podePropor } from "@/lib/identidade";
import { usuarioAtual } from "@/lib/identidade-server";
import { listarHooks, obterPesquisa } from "@/lib/store";
import { blocosParaResponder, desfechosDa } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get("cpf") ?? "";
  const pesquisaId = searchParams.get("pesquisa") ?? "";

  const pesquisa = obterPesquisa(pesquisaId);
  if (!pesquisa) {
    return NextResponse.json({ erro: "pesquisa_nao_encontrada" }, { status: 404 });
  }

  /*
   * A mesma porta da tela de entrada, na API.
   *
   * Sem isto a trava seria de fachada: o link direto da jornada
   * (`/motorista/jornada?pesquisa=...`) pula a capa, e uma pesquisa fora do ar
   * continuaria respondendo por ele. Quem monta a pesquisa passa, porque é
   * assim que se confere antes de publicar.
   */
  /* Sem ninguém entrado não há prévia: `podePropor` de `undefined` é não. */
  const quem = usuarioAtual();
  const previa = searchParams.get("previa") === "1" && !!quem && podePropor(quem);
  if (pesquisa.status !== "ativa" && !previa) {
    return NextResponse.json(
      { erro: "pesquisa_fora_do_ar", status: pesquisa.status },
      { status: 403 },
    );
  }

  return NextResponse.json({
    pesquisa: {
      id: pesquisa.id,
      nome: pesquisa.nome,
      /*
       * O respondente percorre o que está no ar; a prévia percorre o rascunho.
       *
       * É o que faz a prévia valer alguma coisa: ela mostra o que está prestes
       * a ser publicado, e não a versão que já está lá — que é justamente o que
       * quem vai publicar quer conferir.
       */
      /* A etapa de consentimento entra aqui, e não na árvore gravada: é o que
         faz toda pesquisa ter a autorização sem ela poder ser apagada por
         engano no construtor. */
      blocos: blocosParaResponder({
        blocos: previa ? (pesquisa.blocosRascunho ?? pesquisa.blocos) : pesquisa.blocos,
        consentimento: pesquisa.consentimento,
      }),
      /**
       * O identificador que a capa colheu, quando ela colheu algo.
       *
       * A jornada precisa dele para saber qual parâmetro da URL já é resposta —
       * e não pode adivinhar: hoje é `cpf`, amanhã é `matricula`. Só o nome do
       * campo vai; o valor a pessoa carrega na própria URL.
       */
      campoDaCapa:
        pesquisa.apresentacao?.entrada === "convite"
          ? undefined
          : pesquisa.apresentacao?.pergunta?.campo?.trim() || "cpf",
      /**
       * Só a mensagem de carregamento de cada hook, indexada pelo id. O hook
       * inteiro não vai: dentro dele estão o código-fonte e os anexos, e o CSV
       * da base de parceiros tem documento de gente de verdade. Nada disso tem
       * o que fazer no navegador de quem responde.
       */
      carregamentos: Object.fromEntries(
        listarHooks().map((h) => [h.id, h.mensagemCarregando]),
      ),
      /**
       * E os rótulos de exibição dos fatos, pelo mesmo critério: é texto que a
       * tela precisa escrever, e não revela nada além do que ela já mostra.
       */
      rotulos: mapaDeRotulos(listarHooks()),
      /**
       * Os fins possíveis desta pesquisa — título, texto e tom da tela final.
       *
       * Vão inteiros porque são texto de tela, como os rótulos acima: nada aqui
       * revela mais do que a própria tela mostra quando o percurso termina.
       */
      desfechos: desfechosDa(pesquisa),
    },
  });
}
