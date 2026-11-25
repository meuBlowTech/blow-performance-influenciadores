// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Server functions leem segredos de process.env (SUPABASE_SERVICE_ROLE_KEY etc.).
// O Vite só expõe VITE_* por conta própria, então carregamos o .env.local aqui
// sem sobrescrever o que já veio do ambiente.
for (const [key, value] of Object.entries(
  loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), ""),
)) {
  process.env[key] ??= value;
}

// Opt-in static build for GitHub Pages (`DEPLOY_TARGET=github-pages npm run build`).
// Only applies outside the Lovable sandbox — inside it, preset/base overrides are
// force-reset to the Cloudflare target regardless of what's set here, so this can't
// affect the normal Lovable publish flow.
const isGithubPagesBuild = process.env.DEPLOY_TARGET === "github-pages";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...(isGithubPagesBuild
    ? {
        vite: { base: "/blow-performance-influenciadores/" },
        nitro: { preset: "node-server" },
      }
    : {
        // Acesso externo via Cloudflare Tunnel (blow-influenciadores).
        vite: {
          server: { allowedHosts: ["influencers.blow.ia.br"] },
          preview: { allowedHosts: ["influencers.blow.ia.br"] },
        },
        // Build roda como servidor Node nesta máquina (scripts/start-site.cmd).
        nitro: { preset: "node-server" },
      }),
});
