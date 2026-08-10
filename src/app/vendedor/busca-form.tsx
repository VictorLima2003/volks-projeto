"use client";

import { useTransicao } from "@/components/Transicao";
import { Button, Input, Label, SetaCta } from "@/components/ui";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function Inner() {
  const { irPara } = useTransicao();
  const sp = useSearchParams();
  const [cpf, setCpf] = useState(sp.get("cpf") ?? "");
  const [indo, setIndo] = useState(false);

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
        if (!cpf || indo) return;
        // `irPara` e não `router.push`: a cortina do layout cobre a troca, e a
        // marca desenha por cima dela até o veredito estar na tela.
        setIndo(true);
        irPara(`/vendedor/consulta?cpf=${encodeURIComponent(cpf)}`);
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
      {/* Mesmo botão da tela do motorista: pílula navy com a seta que corre no
          hover. Era verde `go`, que na nossa escala quer dizer "aprovado" — cor
          de resultado num botão que só faz a pergunta. */}
      <Button type="submit" disabled={indo}>
        Consultar
        <SetaCta />
      </Button>
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
