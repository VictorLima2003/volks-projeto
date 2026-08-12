"use client";

import { useAviso } from "@/components/Avisos";
import { Button, Label, Select } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CriarPedidoForm({
  cpf,
  pesquisas,
  vendedor,
  concessionaria,
}: {
  cpf: string;
  pesquisas: { id: string; nome: string; modelos: string[] }[];
  /** Quem está logado. Só para mostrar — quem grava a autoria é o servidor. */
  vendedor: string;
  /** Loja de quem está logado, pelo mesmo motivo. */
  concessionaria: string;
}) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [loading, setLoading] = useState(false);
  const [pesquisaId, setPesquisaId] = useState(pesquisas[0]?.id ?? "");

  const pesquisa = pesquisas.find((p) => p.id === pesquisaId);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const res = await fetch("/api/pedidos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            cpf,
            pesquisaId,
            modelo: fd.get("modelo"),
          }),
        });
        const json = await res.json();
        setLoading(false);

        /*
         * Resultado de ação é aviso, não texto ao lado do botão. O antigo
         * "Pedido X criado" ficava preso no meio do formulário e sumia junto com
         * ele na rolagem — e o caminho do erro nem existia: a tela engolia um
         * 403 sem dizer nada.
         */
        if (!res.ok) {
          avisar(json.detalhe ?? json.motivo ?? "Não foi possível registrar o pedido.", "stop");
          return;
        }
        avisar(`Pedido ${json.pedido?.id} registrado.`, "go");
        router.refresh();
      }}
      className="grid gap-4"
    >
      <div>
        <Label htmlFor="camp">Pesquisa de origem</Label>
        <Select id="camp" value={pesquisaId} onChange={(e) => setPesquisaId(e.target.value)}>
          {pesquisas.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="modelo">Modelo</Label>
        <Select id="modelo" name="modelo" key={pesquisa?.id}>
          {(pesquisa?.modelos ?? []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>
      </div>
      {/*
       * Quem registra não é campo: é quem está logado.
       *
       * O input de antes vinha com um nome fixo e editável, ou seja, dava para
       * lançar um pedido em nome de outra pessoa. A autoria agora é carimbada no
       * servidor a partir da sessão, e aqui só se diz quem vai assinar.
       */}
      <p className="text-sm text-ink-600">
        Registrando como <span className="font-semibold text-ink-900">{vendedor}</span>, na{" "}
        <span className="font-semibold text-ink-900">{concessionaria}</span>.
      </p>
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Registrando..." : "Registrar pedido"}
        </Button>
      </div>
    </form>
  );
}
