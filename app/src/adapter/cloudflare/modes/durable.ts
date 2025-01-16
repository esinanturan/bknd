import { DurableObject } from "cloudflare:workers";
import { createRuntimeApp } from "adapter";
import type { CloudflareBkndConfig, Context } from "adapter/cloudflare";
import type { App, CreateAppConfig } from "bknd";

export async function getDurable(config: CloudflareBkndConfig, ctx: Context) {
   const { dobj } = config.bindings?.(ctx.env)!;
   if (!dobj) throw new Error("durable object is not defined in cloudflare.bindings");
   const key = config.key ?? "app";

   if ([config.onBuilt, config.beforeBuild].some((x) => x)) {
      console.log("onBuilt and beforeBuild are not supported with DurableObject mode");
   }

   const start = performance.now();

   const id = dobj.idFromName(key);
   const stub = dobj.get(id) as unknown as DurableBkndApp;

   const create_config = typeof config.app === "function" ? config.app(ctx.env) : config.app;

   const res = await stub.fire(ctx.request, {
      config: create_config,
      html: config.html,
      keepAliveSeconds: config.keepAliveSeconds,
      setAdminHtml: config.setAdminHtml
   });

   const headers = new Headers(res.headers);
   headers.set("X-TTDO", String(performance.now() - start));

   return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers
   });
}

export class DurableBkndApp extends DurableObject {
   protected id = Math.random().toString(36).slice(2);
   protected app?: App;
   protected interval?: any;

   async fire(
      request: Request,
      options: {
         config: CreateAppConfig;
         html?: string;
         keepAliveSeconds?: number;
         setAdminHtml?: boolean;
      }
   ) {
      let buildtime = 0;
      if (!this.app) {
         const start = performance.now();
         const config = options.config;

         // change protocol to websocket if libsql
         if (
            config?.connection &&
            "type" in config.connection &&
            config.connection.type === "libsql"
         ) {
            config.connection.config.protocol = "wss";
         }

         this.app = await createRuntimeApp({
            ...config,
            onBuilt: async (app) => {
               app.modules.server.get("/__do", async (c) => {
                  // @ts-ignore
                  const context: any = c.req.raw.cf ? c.req.raw.cf : c.env.cf;
                  return c.json({
                     id: this.id,
                     keepAliveSeconds: options?.keepAliveSeconds ?? 0,
                     colo: context.colo
                  });
               });

               await this.onBuilt(app);
            },
            adminOptions: { html: options.html },
            beforeBuild: async (app) => {
               await this.beforeBuild(app);
            }
         });

         buildtime = performance.now() - start;
      }

      if (options?.keepAliveSeconds) {
         this.keepAlive(options.keepAliveSeconds);
      }

      console.log("id", this.id);
      const res = await this.app!.fetch(request);
      const headers = new Headers(res.headers);
      headers.set("X-BuildTime", buildtime.toString());
      headers.set("X-DO-ID", this.id);

      return new Response(res.body, {
         status: res.status,
         statusText: res.statusText,
         headers
      });
   }

   async onBuilt(app: App) {}
   async beforeBuild(app: App) {}

   protected keepAlive(seconds: number) {
      console.log("keep alive for", seconds);
      if (this.interval) {
         console.log("clearing, there is a new");
         clearInterval(this.interval);
      }

      let i = 0;
      this.interval = setInterval(() => {
         i += 1;
         //console.log("keep-alive", i);
         if (i === seconds) {
            console.log("cleared");
            clearInterval(this.interval);

            // ping every 30 seconds
         } else if (i % 30 === 0) {
            console.log("ping");
            this.app?.modules.ctx().connection.ping();
         }
      }, 1000);
   }
}