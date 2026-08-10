import { ShellGestor } from "@/components/ShellGestor";
import { Badge, Card, Stat, Table, TD, TH, THead, TR } from "@/components/ui";
import { dataPorExtenso } from "@/lib/painel";
import { listarSessoes, listarCampanhas } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function Central() {
  const sessoes = listarSessoes();
  const campanhas = listarCampanhas();
  const nomeCampanha = (id: string) => campanhas.find((c) => c.id === id)?.nome ?? id;

  const excecoes = sessoes.filter(
    (s) => s.resultado?.tipo === "pendente_validacao" || s.resultado?.tipo === "revalidar" || s.resultado?.tipo === "erro",
  );
  // "Sem registro" agora significa: nenhum hook achou o respondente.
  const semCpfNaBase = excecoes.filter((s) =>
    Object.values(s.externos ?? {}).every((f) => f?.encontrado !== true),
  );
  const divergentes = excecoes.filter((s) => s.resultado?.tipo === "revalidar");
  const abandonadas = sessoes.filter((s) => s.status === "em_andamento");

  return (
    <ShellGestor
      secao="central"
      title="Central de exceções"
      data={dataPorExtenso()}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat label="Na fila de análise" value={excecoes.length} tone="warn" />
        <Stat label="CPF fora da base" value={semCpfNaBase.length} tone="stop" />
        <Stat label="Divergências" value={divergentes.length} tone="warn" />
        <Stat label="Jornadas abertas" value={abandonadas.length} />
      </div>

      <h2 className="text-xl font-semibold tracking-tight mb-4">Fila de tratamento</h2>
      {excecoes.length === 0 ? (
        <Card>
          <div className="text-ink-600">
            Nenhuma exceção no momento. Rode uma jornada com um CPF fora da base
            (ex.: <span className="mono text-ink-900">999.888.777-66</span>) para ver a fila preencher.
          </div>
        </Card>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>CPF</TH>
              <TH>Campanha</TH>
              <TH>Tipo</TH>
              <TH>Motivo</TH>
              <TH>Ação sugerida</TH>
              <TH>Atualizada</TH>
              <TH></TH>
            </tr>
          </THead>
          <tbody>
            {excecoes.map((s) => (
              <TR key={s.id}>
                <TD className="mono text-xs">{s.cpf}</TD>
                <TD className="text-xs">{nomeCampanha(s.campanhaId)}</TD>
                <TD>
                  <Badge tone={s.resultado?.tipo === "erro" ? "stop" : "warn"}>
                    {s.resultado?.tipo.replace("_", " ")}
                  </Badge>
                </TD>
                <TD className="text-xs text-ink-700 max-w-xs">{s.resultado?.motivo}</TD>
                <TD className="text-xs text-ink-700 max-w-xs">{s.resultado?.proximaAcao ?? "-"}</TD>
                <TD className="mono text-xs text-ink-600">{s.atualizadaEm.slice(0, 16).replace("T", " ")}</TD>
                <TD>
                  <Link href={`/vendedor/consulta?cpf=${encodeURIComponent(s.cpf)}`} className="text-xs underline text-ink-700 hover:text-ink-900">
                    abrir
                  </Link>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <h2 className="text-xl font-semibold tracking-tight mt-12 mb-4">Jornadas em aberto</h2>
      {abandonadas.length === 0 ? (
        <Card><div className="text-ink-600">Nenhuma jornada pendente.</div></Card>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>CPF</TH>
              <TH>Campanha</TH>
              <TH>Iniciada</TH>
              <TH>Respostas coletadas</TH>
            </tr>
          </THead>
          <tbody>
            {abandonadas.map((s) => (
              <TR key={s.id}>
                <TD className="mono text-xs">{s.cpf}</TD>
                <TD className="text-xs">{nomeCampanha(s.campanhaId)}</TD>
                <TD className="mono text-xs text-ink-600">{s.iniciadaEm.slice(0, 16).replace("T", " ")}</TD>
                <TD className="text-xs text-ink-700">{Object.keys(s.respostas).length} campo(s)</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <div className="mt-12 border hairline rounded-md p-7 bg-ink-100">
        <div className="text-sm font-semibold text-ink-600 mb-2">O que a central resolve</div>
        <div className="grid md:grid-cols-3 gap-6 mt-4 text-sm text-ink-700">
          <div>
            <div className="text-ink-900 font-medium mb-1">CPF fora da base</div>
            Confere se a base Uber está desatualizada ou se o motorista usa outro documento.
          </div>
          <div>
            <div className="text-ink-900 font-medium mb-1">Divergência de dados</div>
            Nome/cidade não batem. Valida cadastro antes de liberar a jornada comercial.
          </div>
          <div>
            <div className="text-ink-900 font-medium mb-1">Elegibilidade expirada</div>
            Motorista aprovado há muito tempo precisa revalidar antes do pedido.
          </div>
        </div>
      </div>
    </ShellGestor>
  );
}
