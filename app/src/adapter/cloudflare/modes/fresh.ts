import { createRuntimeApp } from "adapter";
import type { App } from "bknd";
import type { CloudflareBkndConfig, Context } from "../index";

export async function makeApp(config: CloudflareBkndConfig, { env }: Context) {
   return await createRuntimeApp(
      {
         ...config,
         adminOptions: config.html ? { html: config.html } : undefined
      },
      env
   );
}

export async function getFresh(config: CloudflareBkndConfig, ctx: Context) {
   const app = await makeApp(config, ctx);
   return app.fetch(ctx.request);
}

let warm_app: App;
export async function getWarm(config: CloudflareBkndConfig, ctx: Context) {
   if (!warm_app) {
      warm_app = await makeApp(config, ctx);
   }

   return warm_app.fetch(ctx.request);
}
