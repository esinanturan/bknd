import { createRuntimeApp } from "adapter";
import { App } from "bknd";
import type { CloudflareBkndConfig, Context } from "../index";

export async function getCached(config: CloudflareBkndConfig, { env, ctx }: Context) {
   const { kv } = config.bindings?.(env)!;
   if (!kv) throw new Error("kv namespace is not defined in cloudflare.bindings");
   const key = config.key ?? "app";

   const cachedConfig = await kv.get(key);
   const initialConfig = cachedConfig ? JSON.parse(cachedConfig) : undefined;

   async function saveConfig(__config: any) {
      ctx.waitUntil(kv!.put(key, JSON.stringify(__config)));
   }

   const app = await createRuntimeApp(
      {
         ...config,
         initialConfig,
         onBuilt: async (app) => {
            app.module.server.client.get("/__bknd/cache", async (c) => {
               await kv.delete(key);
               return c.json({ message: "Cache cleared" });
            });
            await config.onBuilt?.(app);
         },
         beforeBuild: async (app) => {
            app.emgr.onEvent(
               App.Events.AppConfigUpdatedEvent,
               async ({ params: { app } }) => {
                  saveConfig(app.toJSON(true));
               },
               "sync"
            );
            await config.beforeBuild?.(app);
         },
         adminOptions: { html: config.html }
      },
      env
   );

   if (!cachedConfig) {
      saveConfig(app.toJSON(true));
   }

   return app;
}