import { Transicao } from "@/components/Transicao";
import { ReactNode } from "react";

/**
 * Existe para a cortina de transição sobreviver à troca de rota: o layout não
 * desmonta ao navegar entre `/motorista` e `/motorista/jornada`, só o miolo.
 *
 * Fica só na área do respondente. Gestor e vendedor são telas de trabalho —
 * quem alterna entre elas dezenas de vezes por dia não quer uma cena a cada
 * clique.
 */
export default function LayoutMotorista({ children }: { children: ReactNode }) {
  return <Transicao>{children}</Transicao>;
}
