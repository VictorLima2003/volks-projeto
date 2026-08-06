"use client";

import { Button, Input, Label, Select } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CriarPedidoForm({
  cpf,
  campanhas,
}: {
  cpf: string;
  campanhas: { id: string; nome: string; modelos: string[]; concessionaria: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [campanhaId, setCampanhaId] = useState(campanhas[0]?.id ?? "");

  const campanha = campanhas.find((c) => c.id === campanhaId);

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
            campanhaId,
            vendedor: fd.get("vendedor"),
            concessionaria: fd.get("concessionaria"),
            modelo: fd.get("modelo"),
          }),
        });
        const json = await res.json();
        setLoading(false);
        setOk(json.pedido?.id ?? null);
        router.refresh();
      }}
      className="grid gap-4"
    >
      <div>
        <Label htmlFor="camp">Campanha</Label>
        <Select id="camp" value={campanhaId} onChange={(e) => setCampanhaId(e.target.value)}>
          {campanhas.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="modelo">Modelo</Label>
          <Select id="modelo" name="modelo" key={campanha?.id}>
            {(campanha?.modelos ?? []).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="conc">Concessionária</Label>
          <Input id="conc" name="concessionaria" defaultValue={campanha?.concessionaria} key={campanha?.concessionaria} />
        </div>
      </div>
      <div>
        <Label htmlFor="vend">Vendedor</Label>
        <Input id="vend" name="vendedor" defaultValue="Ana P. (VW Barra Funda)" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="go" disabled={loading}>
          {loading ? "Registrando..." : "Registrar pedido"}
        </Button>
        {ok && <span className="text-sm text-signal-go mono">Pedido {ok} criado.</span>}
      </div>
    </form>
  );
}
