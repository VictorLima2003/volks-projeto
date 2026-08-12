import { FundoDaCapa } from "./types";

/**
 * O catálogo de fundos da capa: só os dados.
 *
 * Separado do componente que os desenha porque quem só precisa do **nome** —
 * o nó da capa no canvas, por exemplo — não deveria arrastar junto o WebGL das
 * persianas para o bundle.
 */
export const FUNDOS: { id: FundoDaCapa; nome: string; descricao: string; claro?: boolean }[] = [
  {
    id: "persianas",
    nome: "Persianas",
    descricao: "Gradiente animado que segue o cursor.",
  },
  {
    id: "gradiente",
    nome: "Gradiente",
    descricao: "Um clarão diagonal, parado.",
  },
  {
    id: "trama",
    nome: "Trama",
    descricao: "Pontos por toda a área, sem movimento.",
  },
  {
    id: "liso",
    nome: "Liso",
    descricao: "Só o azul da marca.",
  },
  {
    id: "malha",
    nome: "Malha clara",
    descricao: "Grade fina e um brilho azul, sobre branco. Texto escuro.",
    claro: true,
  },
];

export const NOME_DO_FUNDO = (fundo: string) =>
  FUNDOS.find((f) => f.id === fundo)?.nome ?? fundo;

/**
 * Se a capa é clara, e portanto o texto sobre ela é escuro.
 *
 * A informação mora junto do catálogo porque é consequência do fundo, não uma
 * segunda escolha do gestor: quem escolhe "malha clara" não deveria precisar
 * lembrar de virar a cor do título — e poder deixar branco sobre branco.
 */
export function capaEhClara(fundo: FundoDaCapa) {
  return FUNDOS.find((f) => f.id === fundo)?.claro === true;
}
