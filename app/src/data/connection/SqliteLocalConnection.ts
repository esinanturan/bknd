import type { DatabaseIntrospector, SqliteDatabase } from "kysely";
import { Kysely, SqliteDialect } from "kysely";
import { DeserializeJsonValuesPlugin } from "../plugins/DeserializeJsonValuesPlugin";
import { SqliteConnection } from "./SqliteConnection";
import { SqliteIntrospector } from "./SqliteIntrospector";

class CustomSqliteDialect extends SqliteDialect {
   override createIntrospector(db: Kysely<any>): DatabaseIntrospector {
      return new SqliteIntrospector(db, {
         excludeTables: ["test_table"]
      });
   }
}

export class SqliteLocalConnection extends SqliteConnection {
   constructor(private database: SqliteDatabase) {
      const plugins = [new DeserializeJsonValuesPlugin()];
      const kysely = new Kysely({
         dialect: new CustomSqliteDialect({ database }),
         plugins
         //log: ["query"],
      });

      super(kysely);
      this.plugins = plugins;
   }

   override supportsIndices(): boolean {
      return true;
   }
}
