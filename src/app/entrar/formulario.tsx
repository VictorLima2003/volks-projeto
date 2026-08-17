"use client";

import { Button, Input, Label } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { destinoSeguro } from "./destino";

export function FormularioDeEntrada({
  destino,
  conhecidos,
}: {
  destino: string;
  conhecidos: { id: string; nome: string; onde: string }[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(id: string) {
    setEntrando(true);
    setErro(null);
    const res = await fetch("/api/identidade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuarioId: id.trim().toLowerCase() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setEntrando(false);
      /* A recusa não diz "este e-mail não existe": quem tenta adivinhar
         endereços aprenderia com a diferença entre as duas respostas. */
      setErro("E-mail não confere com nenhum cadastro.");
      return;
    }
    /* `refresh` antes de navegar: as telas são renderizadas no servidor e leem o
       cookie de lá — sem isso, a primeira pintura ainda seria a de deslogado. */
    router.refresh();
    router.push(destinoSeguro(destino, json.area));
  }

  return (
    <>
      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          entrar(email);
        }}
      >
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={email}
          autoComplete="username"
          placeholder="nome.area@volkswagen"
          onChange={(e) => setEmail(e.target.value)}
        />
        {erro && <p className="mt-2 text-sm text-signal-stop font-semibold">{erro}</p>}

        <Button type="submit" disabled={entrando || !email.trim()} className="w-full mt-4">
          {entrando ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t hairline">
        <h2 className="text-sm font-semibold mb-3">Cadastros desta demonstração</h2>
        <div className="space-y-2">
          {conhecidos.map((u) => (
            <button
              key={u.id}
              type="button"
              disabled={entrando}
              onClick={() => entrar(u.id)}
              className="w-full text-left border hairline rounded-md px-4 py-3 bg-ink-0
                         hover:border-vw-deep transition disabled:opacity-50"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base font-semibold">{u.nome}</span>
                <span className="text-xs text-ink-600 shrink-0">{u.onde}</span>
              </div>
              <span className="text-sm text-ink-600 break-all">{u.id}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
