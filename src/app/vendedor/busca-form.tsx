"use client";

import { Button, Input, Label } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [cpf, setCpf] = useState(sp.get("cpf") ?? "");

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
        if (!cpf) return;
        router.push(`/vendedor/consulta?cpf=${encodeURIComponent(cpf)}`);
      }}
      className="flex items-end gap-3"
    >
      <div className="flex-1">
        <Label htmlFor="cpf-v">CPF do motorista</Label>
        <Input
          id="cpf-v"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(normalizeCpf(e.target.value))}
          required
        />
      </div>
      <Button type="submit" variant="go">Consultar</Button>
    </form>
  );
}

export function BuscaCpfForm() {
  return (
    <Suspense fallback={<div className="h-11" />}>
      <Inner />
    </Suspense>
  );
}
