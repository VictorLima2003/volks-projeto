"use client";

import { useAviso } from "@/components/Avisos";
import { ShellGestor } from "@/components/ShellGestor";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * A criação da pesquisa acontece na mesa onde ela vai ser montada.
 *
 * O formulário não é uma página à parte: é o primeiro cartão sobre a superfície
 * de trabalho, e o que vier depois — os blocos do fluxo — aparece nessa mesma
 * mesa. Um formulário centrado em fundo branco, seguido de um salto para outra
 * tela com outro fundo, faria parecer que criar e montar são duas ferramentas.
 *
 * Por isso a faixa aqui é cheia (`telaCheia`) enquanto o topo continua no grid
 * do resto do sistema: a mesa é a exceção, não a navegação.
 */
export default function NovaPesquisa() {
  const router = useRouter();
  const { avisar } = useAviso();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const pronto = nome.trim().length > 0;

  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    if (!pronto || salvando) return;
    setSalvando(true);
    const res = await fetch("/api/pesquisa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome, descricao }),
    });
    const json = await res.json();
    if (!res.ok) {
      setSalvando(false);
      avisar(json.detalhe ?? json.erro ?? "Não deu para criar a pesquisa.", "stop");
      return;
    }
    /* `salvando` fica ligado até a navegação: desligar aqui devolveria o botão
       ao normal por um instante, no meio da troca de tela. */
    router.push(`/gestor/pesquisas/${json.id}`);
    router.refresh();
  }

  return (
    <ShellGestor telaCheia>
      {/* Desconta o topo (5rem) para a mesa ocupar exatamente o resto da tela —
          sem isso a página ganha uma rolagem de 80px que não leva a nada. */}
      <div className="mesa-pontos flex-1 min-h-[calc(100vh-5rem)] flex items-center justify-center px-6 py-16">
        <form
          onSubmit={continuar}
          className="w-full max-w-xl bg-ink-0 border hairline-strong rounded-md shadow-lift p-8 lg:p-10"
        >
          <h1 className="text-2xl font-semibold tracking-tight">Nova pesquisa</h1>
          <p className="mt-2 text-base text-ink-700">
            Comece pelo nome. As perguntas entram na etapa seguinte, aqui mesmo nesta mesa.
          </p>

          <div className="mt-8 grid gap-5">
            <div>
              <Label htmlFor="nome">Nome da pesquisa</Label>
              <Input
                id="nome"
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Elegibilidade motorista de aplicativo"
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="O que esta pesquisa apura, em uma frase."
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t hairline flex items-center gap-4">
            <Button type="submit" disabled={!pronto || salvando}>
              {salvando ? "Criando..." : "Continuar"}
            </Button>
            <button
              type="button"
              onClick={() => router.push("/gestor/pesquisas")}
              className="text-sm font-semibold text-ink-600 hover:text-ink-900 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </ShellGestor>
  );
}
