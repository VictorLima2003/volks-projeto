"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useCallback } from "react";

/**
 * Editor de código com a experiência do VS Code — é literalmente o mesmo
 * motor (Monaco). Carrega só nesta tela, sob demanda.
 */
export function EditorCodigo({
  valor,
  onChange,
  parametros,
  altura = 380,
  somenteLeitura = false,
}: {
  valor: string;
  onChange: (v: string) => void;
  /** Nomes que existem no escopo, para o editor não marcá-los como indefinidos. */
  parametros: string[];
  altura?: number;
  somenteLeitura?: boolean;
}) {
  const aoMontar: OnMount = useCallback(
    (_editor, monaco) => {
      // O código do hook é o CORPO de uma função assíncrona. Sem declarar o
      // escopo, o editor acusaria `await` fora de função e variáveis fantasma.
      const assinaturas = [
        "declare function csv(nomeOuUrl: string): Promise<Record<string, string>[]>;",
        "declare function log(...partes: unknown[]): void;",
        "declare function chave(valor: unknown): string;",
        ...parametros.map((p) => `declare const ${p}: any;`),
      ].join("\n");

      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        // 1108: 'return' fora de função — esperado, o código é um corpo.
        // 1378: top-level await — idem.
        diagnosticCodesToIgnore: [1108, 1375, 1378],
      });
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        lib: ["es2020", "dom"],
      });
      monaco.languages.typescript.javascriptDefaults.setExtraLibs([
        { content: assinaturas, filePath: "ts:hook-escopo.d.ts" },
      ]);
    },
    [parametros],
  );

  return (
    <div className="border-2 hairline-strong rounded-sm overflow-hidden">
      <Editor
        height={altura}
        defaultLanguage="javascript"
        theme="vs-dark"
        value={valor}
        onChange={(v) => onChange(v ?? "")}
        onMount={aoMontar}
        options={{
          readOnly: somenteLeitura,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 14, bottom: 14 },
          renderLineHighlight: "line",
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
        }}
        loading={
          <div className="h-full flex items-center justify-center text-sm text-ink-600">
            Carregando editor...
          </div>
        }
      />
    </div>
  );
}
