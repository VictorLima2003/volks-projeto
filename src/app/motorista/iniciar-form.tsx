"use client";

import { useTransicao } from "@/components/Transicao";
import { Button, Input, Label, Select, SetaCta } from "@/components/ui";
import { BlocoPergunta } from "@/lib/types";
import { animate, stagger } from "animejs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** Curto de propósito: é uma passagem, não uma cena. */
const DUR_SAIDA = 260;

/**
 * A partida para a jornada, comum às duas formas de entrada.
 *
 * A dobra recua um pouco enquanto a cortina sobe, para a cena ter profundidade
 * em vez de um corte seco. Quem leva à próxima tela é a cortina do layout —
 * esta animação é só o que acontece por baixo dela.
 */
function usarPartida() {
  const router = useRouter();
  const { irPara } = useTransicao();
  const [saindo, setSaindo] = useState(false);

  // Puxa a rota da jornada enquanto a pessoa lê: sem isso, os 340ms da saída
  // seriam gastos esperando o bundle em vez de cobrir a troca de tela.
  useEffect(() => {
    router.prefetch("/motorista/jornada");
  }, [router]);

  const partir = useCallback(
    (destino: string) => {
      if (saindo) return;
      setSaindo(true);

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animate("[data-sai]", {
          opacity: [1, 0],
          translateY: [0, -14],
          duration: DUR_SAIDA,
          delay: stagger(50),
          ease: "inQuad",
        });
      }

      irPara(destino);
    },
    [irPara, saindo],
  );

  return { partir, saindo };
}

/** Máscara e teclado por formato. Nada aqui sabe o que a pergunta significa. */
const FORMATOS: Record<
  string,
  { tipo: string; inputMode?: "numeric" | "email" | "tel"; exemplo?: string; mascara?: (v: string) => string }
> = {
  cpf: {
    tipo: "text",
    inputMode: "numeric",
    exemplo: "000.000.000-00",
    mascara: (v) =>
      v
        .replace(/\D/g, "")
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
  },
  email: { tipo: "email", inputMode: "email", exemplo: "voce@email.com" },
  telefone: { tipo: "tel", inputMode: "tel", exemplo: "(00) 00000-0000" },
  numero: { tipo: "text", inputMode: "numeric" },
  data: { tipo: "date" },
  texto: { tipo: "text" },
};

/**
 * Entrada por pergunta: o cartão colhe uma informação antes de a jornada começar.
 *
 * Qual informação é escolha do gestor — CPF, e-mail, telefone, um código. Por
 * isso nada aqui é fixo: o rótulo, o formato e o nome do parâmetro saem da
 * pergunta configurada na capa. O parâmetro leva o identificador dela
 * (`?cpf=`, `?matricula=`), que é como a jornada sabe qual fato já chegou
 * respondido sem precisar combinar um nome à parte.
 *
 * A pesquisa não é escolha de quem responde — ela vem no link que o gestor
 * compartilha (`/motorista?pesquisa=<id>`) e aparece no título da página.
 *
 * A trilha de progresso não mora aqui: ela abre o cartão, acima do título, e é
 * a página que a monta — daqui de dentro não dá para saber quantos passos o
 * processo tem.
 */
export function IniciarJornadaForm({
  pesquisaId,
  pergunta,
  previa = false,
}: {
  pesquisaId: string;
  pergunta: BlocoPergunta;
  /** Repassa a prévia adiante: sem isso a jornada bate na trava de situação. */
  previa?: boolean;
}) {
  const [valor, setValor] = useState("");
  const { partir, saindo } = usarPartida();

  const formato = FORMATOS[pergunta.tipo] ?? FORMATOS.texto;
  const escolhas = pergunta.tipo === "opcao" ? pergunta.opcoes ?? [] : [];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valor || !pesquisaId) return;
        partir(
          `/motorista/jornada?${new URLSearchParams({
            pesquisa: pesquisaId,
            [pergunta.campo]: valor,
            ...(previa ? { previa: "1" } : {}),
          })}`,
        );
      }}
    >
      <h2 className="text-xl font-semibold tracking-tight mb-6">{pergunta.rotulo}</h2>

      <div>
        {/* O enunciado já é o título do cartão. Um rótulo genérico embaixo dele
            só repetiria a mesma linha em corpo menor — então ou o rótulo diz
            algo a mais (o texto de apoio), ou fica só para leitor de tela. */}
        <Label htmlFor="entrada" className={pergunta.ajuda?.trim() ? undefined : "sr-only"}>
          {pergunta.ajuda?.trim() || pergunta.rotulo}
        </Label>
        {escolhas.length > 0 ? (
          <Select
            id="entrada"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          >
            <option value="">Selecione</option>
            {escolhas.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            id="entrada"
            type={formato.tipo}
            inputMode={formato.inputMode}
            autoComplete="off"
            placeholder={formato.exemplo}
            value={valor}
            onChange={(e) =>
              setValor(formato.mascara ? formato.mascara(e.target.value) : e.target.value)
            }
            required
          />
        )}
      </div>

      {/* Largura total: é a única ação do cartão, e um botão que para no meio
          divide a atenção com o espaço vazio ao lado dele. */}
      <Button type="submit" disabled={saindo} className="mt-6 w-full">
        Continuar
        <SetaCta />
      </Button>
    </form>
  );
}

/**
 * Entrada por convite: o cartão só abre a jornada.
 *
 * Nada de identificação aqui — ela vira a primeira pergunta lá dentro, como
 * qualquer outra. Por isso o link não leva `cpf`: é a ausência dele que faz a
 * jornada perguntar em vez de dar por respondido.
 *
 * O cartão continua existindo, e não vira um botão solto sobre o fundo: ele é o
 * alvo grande e claro num fundo escuro, e quem chega pelo celular acha a ação
 * sem procurar.
 */
export function ConviteJornada({
  pesquisaId,
  rotulo,
  previa = false,
}: {
  pesquisaId: string;
  rotulo?: string;
  previa?: boolean;
}) {
  const { partir, saindo } = usarPartida();

  return (
    <Button
      type="button"
      disabled={saindo}
      className="w-full"
      onClick={() =>
        partir(
          `/motorista/jornada?${new URLSearchParams({
            pesquisa: pesquisaId,
            ...(previa ? { previa: "1" } : {}),
          })}`,
        )
      }
    >
      {rotulo?.trim() || "Começar"}
      <SetaCta />
    </Button>
  );
}
