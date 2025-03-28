import { Type } from "core/utils";
import { Task } from "../Task";

export class LogTask extends Task<typeof LogTask.schema> {
   type = "log";

   static override schema = Type.Object({
      delay: Type.Number({ default: 10 }),
   });

   async execute() {
      await new Promise((resolve) => setTimeout(resolve, this.params.delay));
      console.log(`[DONE] LogTask: ${this.name}`);
      return true;
   }
}
