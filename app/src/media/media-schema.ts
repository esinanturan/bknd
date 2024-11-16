import { Const, Type, objectTransform } from "core/utils";
import { Adapters } from "media";
import { registries } from "modules/registries";

export const ADAPTERS = {
   ...Adapters
} as const;

export const registry = registries.media;

export function buildMediaSchema() {
   const adapterSchemaObject = objectTransform(registry.all(), (adapter, name) => {
      return Type.Object(
         {
            type: Const(name),
            config: adapter.schema
         },
         {
            title: name,
            additionalProperties: false
         }
      );
   });
   const adapterSchema = Type.Union(Object.values(adapterSchemaObject));

   return Type.Object(
      {
         enabled: Type.Boolean({ default: false }),
         basepath: Type.String({ default: "/api/media" }),
         entity_name: Type.String({ default: "media" }),
         storage: Type.Object(
            {
               body_max_size: Type.Optional(
                  Type.Number({
                     description: "Max size of the body in bytes. Leave blank for unlimited."
                  })
               )
            },
            { default: {} }
         ),
         adapter: Type.Optional(adapterSchema)
      },
      {
         additionalProperties: false
      }
   );
}

export const mediaConfigSchema = buildMediaSchema();
