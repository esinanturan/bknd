import { Liquid, LiquidError } from "liquidjs";
import type { RenderOptions } from "liquidjs/dist/liquid-options";
import { BkndError } from "../errors";

export type TemplateObject = Record<string, string | Record<string, string>>;
export type TemplateTypes = string | TemplateObject;

export type SimpleRendererOptions = RenderOptions & {
   renderKeys?: boolean;
};

export class SimpleRenderer {
   private engine = new Liquid();

   constructor(
      private variables: Record<string, any> = {},
      private options: SimpleRendererOptions = {},
   ) {}

   another() {
      return 1;
   }

   static hasMarkup(template: string | object): boolean {
      //console.log("has markup?", template);
      let flat: string = "";

      if (Array.isArray(template) || typeof template === "object") {
         // only plain arrays and objects
         if (!["Array", "Object"].includes(template.constructor.name)) return false;

         flat = JSON.stringify(template);
      } else {
         flat = String(template);
      }

      //console.log("** flat", flat);

      const checks = ["{{", "{%", "{#", "{:"];
      const hasMarkup = checks.some((check) => flat.includes(check));
      //console.log("--has markup?", hasMarkup);
      return hasMarkup;
   }

   async render<Given extends TemplateTypes>(template: Given): Promise<Given> {
      try {
         if (typeof template === "string") {
            return (await this.renderString(template)) as unknown as Given;
         } else if (Array.isArray(template)) {
            return (await Promise.all(
               template.map((item) => this.render(item)),
            )) as unknown as Given;
         } else if (typeof template === "object") {
            return (await this.renderObject(template)) as unknown as Given;
         }
      } catch (e) {
         if (e instanceof LiquidError) {
            const details = {
               name: e.name,
               token: {
                  kind: e.token.kind,
                  input: e.token.input,
                  begin: e.token.begin,
                  end: e.token.end,
               },
            };

            throw new BkndError(e.message, details, "liquid");
         }

         throw e;
      }

      throw new Error("Invalid template type");
   }

   async renderString(template: string): Promise<string> {
      //console.log("*** renderString", template, this.variables);
      return this.engine.parseAndRender(template, this.variables, this.options);
   }

   async renderObject(template: TemplateObject): Promise<TemplateObject> {
      const result: TemplateObject = {};

      for (const [key, value] of Object.entries(template)) {
         let resultKey = key;
         if (this.options.renderKeys) {
            resultKey = await this.renderString(key);
         }

         result[resultKey] = await this.render(value);
      }

      return result;
   }
}
