import { readFile } from "node:fs/promises";
import { serveStatic } from "@hono/node-server/serve-static";
import { createClient } from "@libsql/client/node";
import { App, registries } from "./src";
import { LibsqlConnection } from "./src/data";
import { StorageLocalAdapter } from "./src/media/storage/adapters/StorageLocalAdapter";

registries.media.register("local", StorageLocalAdapter);

const run_example: string | boolean = false;
//run_example = "ex-admin-rich";

const credentials = run_example
   ? {
        url: `file:.configs/${run_example}.db`
        //url: ":memory:"
     }
   : {
        url: import.meta.env.VITE_DB_URL!,
        authToken: import.meta.env.VITE_DB_TOKEN!
     };
if (!credentials.url) {
   throw new Error("Missing VITE_DB_URL env variable. Add it to .env file");
}

const connection = new LibsqlConnection(createClient(credentials));

let initialConfig: any = undefined;
if (run_example) {
   const { version, ...config } = JSON.parse(
      await readFile(`.configs/${run_example}.json`, "utf-8")
   );
   initialConfig = config;
}

let app: App;
const recreate = true;
export default {
   async fetch(request: Request) {
      if (!app || recreate) {
         app = App.create({ connection, initialConfig });
         app.emgr.onEvent(
            App.Events.AppBuiltEvent,
            async () => {
               app.registerAdminController({ forceDev: true });
               app.module.server.client.get("/assets/*", serveStatic({ root: "./" }));
            },
            "sync"
         );
         await app.build();
      }

      return app.fetch(request);
   }
};
