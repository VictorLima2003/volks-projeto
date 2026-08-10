"use client";

import { useTransicao } from "@/components/Transicao";
import { Button, Input, Label, SetaCta } from "@/components/ui";
import { animate, stagger } from "animejs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Curto de propósito: é uma passagem, não uma cena. */
const DUR_SAIDA = 260;

/**
 * Só o CPF. A campanha não é escolha de quem responde — ela vem no link que o
 * gestor compartilha (`/motorista?campanha=<id>`) e aparece no título da página.
 * Enquanto era um seletor aqui, a tela pedia à pessoa uma decisão que não é dela.
 *
 * A trilha de progresso não mora aqui: ela abre o cartão, acima do título, e é
 * a página que a monta — daqui de dentro não dá para saber quantos passos o
 * processo tem.
 */
export function IniciarJornadaForm({ campanhaId }: { campanhaId: string }) {
  const router = useRouter();
  const { irPara } = useTransicao();
  const [cpf, setCpf] = useState("");
  const [saindo, setSaindo] = useState(false);

  // Puxa a rota da jornada enquanto a pessoa digita: sem isso, os 340ms da
  // saída seriam gastos esperando o bundle em vez de cobrir a troca de tela.
  useEffect(() => {
    router.prefetch("/motorista/jornada");
  }, [router]);

  function normalizeCpf(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!cpf || !campanhaId || saindo) return;

        const q = new URLSearchParams({ campanha: campanhaId, cpf }).toString();
        const destino = `/motorista/jornada?${q}`;

        setSaindo(true);

        // A dobra recua um pouco enquanto a cortina sobe, para a cena ter
        // profundidade em vez de um corte seco. Quem leva à próxima tela é a
        // cortina do layout — esta animação é só o que acontece por baixo dela.
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
      }}
    >
      <div>
        <Label htmlFor="cpf">Seu CPF</Label>
        <Input
          id="cpf"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(normalizeCpf(e.target.value))}
          required
        />
      </div>

      {/* Largura total: é a única ação do cartão, e um botão que para no meio
          divide a atenção com o espaço vazio ao lado dele. */}
      <Button type="submit" disabled={saindo} className="mt-6 w-full">
        Ver minha condição
        <SetaCta />
      </Button>
    </form>
  );
}
