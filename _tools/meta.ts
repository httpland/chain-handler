import { BuildOptions } from "https://deno.land/x/dnt@0.33.1/mod.ts";

export const makeOptions = (version: string): BuildOptions => ({
  test: false,
  shims: {},
  compilerOptions: {
    lib: ["esnext", "dom"],
  },
  typeCheck: true,
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  package: {
    name: "@httpland/chain-handler",
    version,
    description:
      "Chainable and immutable HTTP handler for standard Request and Response",
    keywords: [
      "http",
      "handler",
      "chain",
      "chainable",
      "sequential",
      "request",
      "response",
    ],
    license: "MIT",
    homepage: "https://github.com/httpland/chain-handler",
    repository: {
      type: "git",
      url: "git+https://github.com/httpland/chain-handler.git",
    },
    bugs: {
      url: "https://github.com/httpland/chain-handler/issues",
    },
    sideEffects: false,
    type: "module",
    publishConfig: {
      access: "public",
    },
  },
  packageManager: "pnpm",
});
