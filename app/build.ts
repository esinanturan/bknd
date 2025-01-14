import { $ } from "bun";
import * as tsup from "tsup";

const args = process.argv.slice(2);
const watch = args.includes("--watch");
const minify = args.includes("--minify");
const types = args.includes("--types");
const sourcemap = args.includes("--sourcemap");
const clean = args.includes("--clean");

if (clean) {
   console.log("Cleaning dist (w/o static)");
   await $`find dist -mindepth 1 ! -path "dist/static/*" ! -path "dist/static" -exec rm -rf {} +`;
}

let types_running = false;
function buildTypes() {
   if (types_running) return;
   types_running = true;

   Bun.spawn(["bun", "build:types"], {
      stdout: "inherit",
      onExit: () => {
         console.log("Types built");
         Bun.spawn(["bun", "tsc-alias"], {
            stdout: "inherit",
            onExit: () => {
               console.log("Types aliased");
               types_running = false;
            }
         });
      }
   });
}

let watcher_timeout: any;
function delayTypes() {
   if (!watch || !types) return;
   if (watcher_timeout) {
      clearTimeout(watcher_timeout);
   }
   watcher_timeout = setTimeout(buildTypes, 1000);
}

if (types && !watch) {
   buildTypes();
}

/**
 * Building backend and general API
 */
await tsup.build({
   minify,
   sourcemap,
   watch,
   entry: ["src/index.ts", "src/data/index.ts", "src/core/index.ts", "src/core/utils/index.ts"],
   outDir: "dist",
   external: ["bun:test", "@libsql/client"],
   metafile: true,
   platform: "browser",
   format: ["esm"],
   splitting: false,
   treeshake: true,
   loader: {
      ".svg": "dataurl"
   },
   onSuccess: async () => {
      delayTypes();
   }
});

/**
 * Building UI for direct imports
 */
const ui_splitting = false;
await tsup.build({
   minify,
   sourcemap,
   watch,
   entry: ["src/ui/index.ts", "src/ui/client/index.ts", "src/ui/main.css"],
   outDir: "dist/ui",
   external: [
      "bun:test",
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "use-sync-external-store",
      /codemirror/
   ],
   metafile: true,
   platform: "browser",
   format: ["esm"],
   splitting: ui_splitting,
   treeshake: true,
   loader: {
      ".svg": "dataurl"
   },
   esbuildOptions: (options) => {
      options.logLevel = "silent";
      if (ui_splitting) {
         options.chunkNames = "chunks/[name]-[hash]";
      }
   },
   onSuccess: async () => {
      delayTypes();
   }
});

/**
 * Building adapters
 */
function baseConfig(adapter: string): tsup.Options {
   return {
      minify,
      sourcemap,
      watch,
      entry: [`src/adapter/${adapter}/index.ts`],
      format: ["esm"],
      platform: "neutral",
      outDir: `dist/adapter/${adapter}`,
      define: {
         __isDev: "0"
      },
      external: [
         /^cloudflare*/,
         /^@?(hono|libsql).*?/,
         /^(bknd|react|next|node).*?/,
         /.*\.(html)$/
      ],
      metafile: true,
      splitting: false,
      treeshake: true,
      onSuccess: async () => {
         delayTypes();
      }
   };
}

await tsup.build(baseConfig("remix"));
await tsup.build(baseConfig("bun"));
await tsup.build(baseConfig("astro"));
await tsup.build(baseConfig("cloudflare"));

await tsup.build({
   ...baseConfig("vite"),
   platform: "node"
});

await tsup.build({
   ...baseConfig("nextjs"),
   platform: "node"
});

await tsup.build({
   ...baseConfig("node"),
   platform: "node"
});
