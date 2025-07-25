import { mergeObject } from "core/utils";

//export { jsc, type Options, type Hook } from "./validator";
import * as s from "jsonv-ts";

export { validator as jsc, type Options } from "jsonv-ts/hono";
export { describeRoute, schemaToSpec, openAPISpecs } from "jsonv-ts/hono";

export { s };

export class InvalidSchemaError extends Error {
   constructor(
      public schema: s.TAnySchema,
      public value: unknown,
      public errors: s.ErrorDetail[] = [],
   ) {
      super(
         `Invalid schema given for ${JSON.stringify(value, null, 2)}\n\n` +
            `Error: ${JSON.stringify(errors[0], null, 2)}`,
      );
   }
}

export type ParseOptions = {
   withDefaults?: boolean;
   coerse?: boolean;
   clone?: boolean;
};

export const cloneSchema = <S extends s.TSchema>(schema: S): S => {
   const json = schema.toJSON();
   return s.fromSchema(json) as S;
};

export function parse<S extends s.TAnySchema>(
   _schema: S,
   v: unknown,
   opts: ParseOptions = {},
): s.StaticCoerced<S> {
   const schema = (opts.clone ? cloneSchema(_schema as any) : _schema) as s.TSchema;
   const value = opts.coerse !== false ? schema.coerce(v) : v;
   const result = schema.validate(value, {
      shortCircuit: true,
      ignoreUnsupported: true,
   });
   if (!result.valid) throw new InvalidSchemaError(schema, v, result.errors);
   if (opts.withDefaults) {
      return mergeObject(schema.template({ withOptional: true }), value) as any;
   }

   return value as any;
}
