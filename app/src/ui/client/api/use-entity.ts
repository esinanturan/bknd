import type { DB, PrimaryFieldType } from "core";
import { objectTransform } from "core/utils/objects";
import { encodeSearch } from "core/utils/reqres";
import type { EntityData, RepoQueryIn } from "data";
import type { ModuleApi, ResponseObject } from "modules/ModuleApi";
import useSWR, { type SWRConfiguration, mutate } from "swr";
import { type Api, useApi } from "ui/client";

export class UseEntityApiError<Payload = any> extends Error {
   constructor(
      public response: ResponseObject<Payload>,
      fallback?: string,
   ) {
      let message = fallback;
      if ("error" in response) {
         message = response.error as string;
         if (fallback) {
            message = `${fallback}: ${message}`;
         }
      }

      super(message ?? "UseEntityApiError");
   }
}

export const useEntity = <
   Entity extends keyof DB | string,
   Id extends PrimaryFieldType | undefined = undefined,
   Data = Entity extends keyof DB ? DB[Entity] : EntityData,
>(
   entity: Entity,
   id?: Id,
) => {
   const api = useApi().data;

   return {
      create: async (input: Omit<Data, "id">) => {
         const res = await api.createOne(entity, input);
         if (!res.ok) {
            throw new UseEntityApiError(res, `Failed to create entity "${entity}"`);
         }
         return res;
      },
      read: async (query: RepoQueryIn = {}) => {
         const res = id ? await api.readOne(entity, id!, query) : await api.readMany(entity, query);
         if (!res.ok) {
            throw new UseEntityApiError(res as any, `Failed to read entity "${entity}"`);
         }
         // must be manually typed
         return res as unknown as Id extends undefined
            ? ResponseObject<Data[]>
            : ResponseObject<Data>;
      },
      update: async (input: Partial<Omit<Data, "id">>, _id: PrimaryFieldType | undefined = id) => {
         if (!_id) {
            throw new Error("id is required");
         }
         const res = await api.updateOne(entity, _id, input);
         if (!res.ok) {
            throw new UseEntityApiError(res, `Failed to update entity "${entity}"`);
         }
         return res;
      },
      _delete: async (_id: PrimaryFieldType | undefined = id) => {
         if (!_id) {
            throw new Error("id is required");
         }

         const res = await api.deleteOne(entity, _id);
         if (!res.ok) {
            throw new UseEntityApiError(res, `Failed to delete entity "${entity}"`);
         }
         return res;
      },
   };
};

// @todo: try to get from ModuleApi directly
export function makeKey(
   api: ModuleApi,
   entity: string,
   id?: PrimaryFieldType,
   query?: RepoQueryIn,
) {
   return (
      "/" +
      [...(api.options?.basepath?.split("/") ?? []), entity, ...(id ? [id] : [])]
         .filter(Boolean)
         .join("/") +
      (query ? "?" + encodeSearch(query) : "")
   );
}

export const useEntityQuery = <
   Entity extends keyof DB | string,
   Id extends PrimaryFieldType | undefined = undefined,
>(
   entity: Entity,
   id?: Id,
   query?: RepoQueryIn,
   options?: SWRConfiguration & { enabled?: boolean; revalidateOnMutate?: boolean },
) => {
   const api = useApi().data;
   const key = makeKey(api, entity as string, id, query);
   const { read, ...actions } = useEntity<Entity, Id>(entity, id);
   const fetcher = () => read(query);

   type T = Awaited<ReturnType<typeof fetcher>>;
   const swr = useSWR<T>(options?.enabled === false ? null : key, fetcher as any, {
      revalidateOnFocus: false,
      keepPreviousData: true,
      ...options,
   });

   const mutateAll = async () => {
      const entityKey = makeKey(api, entity as string);
      return mutate((key) => typeof key === "string" && key.startsWith(entityKey), undefined, {
         revalidate: true,
      });
   };

   const mapped = objectTransform(actions, (action) => {
      return async (...args: any) => {
         // @ts-ignore
         const res = await action(...args);

         // mutate all keys of entity by default
         if (options?.revalidateOnMutate !== false) {
            await mutateAll();
         }
         return res;
      };
   }) as Omit<ReturnType<typeof useEntity<Entity, Id>>, "read">;

   return {
      ...swr,
      ...mapped,
      mutate: mutateAll,
      mutateRaw: swr.mutate,
      api,
      key,
   };
};

export async function mutateEntityCache<
   Entity extends keyof DB | string,
   Data = Entity extends keyof DB ? Omit<DB[Entity], "id"> : EntityData,
>(api: Api["data"], entity: Entity, id: PrimaryFieldType, partialData: Partial<Data>) {
   function update(prev: any, partialNext: any) {
      if (
         typeof prev !== "undefined" &&
         typeof partialNext !== "undefined" &&
         "id" in prev &&
         prev.id === id
      ) {
         return { ...prev, ...partialNext };
      }

      return prev;
   }

   const entityKey = makeKey(api, entity as string);

   return mutate(
      (key) => typeof key === "string" && key.startsWith(entityKey),
      async (data) => {
         if (typeof data === "undefined") return;
         if (Array.isArray(data)) {
            return data.map((item) => update(item, partialData));
         }
         return update(data, partialData);
      },
      {
         revalidate: false,
      },
   );
}

export const useEntityMutate = <
   Entity extends keyof DB | string,
   Id extends PrimaryFieldType | undefined = undefined,
   Data = Entity extends keyof DB ? Omit<DB[Entity], "id"> : EntityData,
>(
   entity: Entity,
   id?: Id,
   options?: SWRConfiguration,
) => {
   const { data, ...$q } = useEntityQuery<Entity, Id>(entity, id, undefined, {
      ...options,
      enabled: false,
   });

   const _mutate = id
      ? (data) => mutateEntityCache($q.api, entity, id, data)
      : (id, data) => mutateEntityCache($q.api, entity, id, data);

   return {
      ...$q,
      mutate: _mutate as unknown as Id extends undefined
         ? (id: PrimaryFieldType, data: Partial<Data>) => Promise<void>
         : (data: Partial<Data>) => Promise<void>,
   };
};
