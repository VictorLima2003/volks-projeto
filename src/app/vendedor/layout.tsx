import { Transicao } from "@/components/Transicao";
import { ReactNode } from "react";

/**
 * Mesma cortina da área do respondente, pelo mesmo motivo: o layout não desmonta
 * ao navegar de `/vendedor` para `/vendedor/consulta`, então ela atravessa a
 * troca e cobre a tela vazia entre uma página e outra.
 *
 * Só a consulta usa. As outras telas do vendedor navegam sem cena — a cortina
 * sobe quando `irPara` é chamado, e nada mais o chama aqui.
 */
export default function LayoutVendedor({ children }: { children: ReactNode }) {
  return <Transicao>{children}</Transicao>;
}
