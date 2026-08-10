"use client";

import { MarcaCarregando, PISO_MARCA } from "@/components/MarcaCarregando";
import { useCallback, useEffect, useState } from "react";

/**
 * Camada de marca sobre a consulta recém-aberta.
 *
 * A resposta já veio junto com a página — é render de servidor, o dado está
 * pronto. A camada não espera nada: ela existe porque o resultado é a única
 * coisa que essa tela faz, e aparecer de estalo tira o peso da resposta.
 *
 * É a mesma cena da jornada do motorista, do outro lado do balcão: o vendedor
 * digita o CPF, a cortina cobre, a marca desenha, e o veredito aparece por
 * baixo. Os dois passam a ver o mesmo momento.
 *
 * Some sozinha e não volta: recarregar a página mostra de novo, ir e voltar
 * dentro da tela não.
 */
export function EsperaDaConsulta({ nome }: { nome?: string }) {
  const [montado, setMontado] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const desmontar = useCallback(() => setMontado(false), []);

  useEffect(() => {
    const t = setTimeout(() => setSaindo(true), PISO_MARCA);
    return () => clearTimeout(t);
  }, []);

  if (!montado) return null;

  return (
    <MarcaCarregando
      mensagem={nome ? `Consultando ${nome}` : "Consultando o CPF"}
      saindo={saindo}
      aoSair={desmontar}
    />
  );
}
