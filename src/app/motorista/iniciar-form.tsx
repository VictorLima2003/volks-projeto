"use client";

import { Button, Input, Label, Select } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function IniciarJornadaForm({
  campanhas,
  preSelecionada,
}: {
  campanhas: { id: string; nome: string; modelos: string[] }[];
  preSelecionada?: string;
}) {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [campanhaId, setCampanhaId] = useState(preSelecionada ?? campanhas[0]?.id ?? "");

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
        if (!cpf || !campanhaId) return;
        const q = new URLSearchParams({ campanha: campanhaId, cpf }).toString();
        router.push(`/motorista/jornada?${q}`);
      }}
      className="space-y-5"
    >
      <div>
        <Label htmlFor="campanha">Campanha</Label>
        <Select
          id="campanha"
          value={campanhaId}
          onChange={(e) => setCampanhaId(e.target.value)}
          required
        >
          {campanhas.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="cpf">Seu CPF</Label>
        <Input
          id="cpf"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(normalizeCpf(e.target.value))}
          required
        />
      </div>
      <Button type="submit">Continuar</Button>
    </form>
  );
}
