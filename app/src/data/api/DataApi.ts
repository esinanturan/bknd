import type { DB } from "core";
import type { EntityData, RepoQueryIn, RepositoryResponse } from "data";
import { type BaseModuleApiOptions, ModuleApi, type PrimaryFieldType } from "modules";
import type { FetchPromise, ResponseObject } from "modules/ModuleApi";

export type DataApiOptions = BaseModuleApiOptions & {
   queryLengthLimit: number;
   defaultQuery: Partial<RepoQueryIn>;
};

export class DataApi extends ModuleApi<DataApiOptions> {
   protected override getDefaultOptions(): Partial<DataApiOptions> {
      return {
         basepath: "/api/data",
         queryLengthLimit: 1000,
         defaultQuery: {
            limit: 10,
         },
      };
   }

   private requireObjectSet(obj: any, message?: string) {
      if (!obj || typeof obj !== "object" || Object.keys(obj).length === 0) {
         throw new Error(message ?? "object is required");
      }
   }

   readOne<E extends keyof DB | string, Data = E extends keyof DB ? DB[E] : EntityData>(
      entity: E,
      id: PrimaryFieldType,
      query: Omit<RepoQueryIn, "where" | "limit" | "offset"> = {},
   ) {
      return this.get<Pick<RepositoryResponse<Data>, "meta" | "data">>(
         ["entity", entity as any, id],
         query,
      );
   }

   readOneBy<E extends keyof DB | string, Data = E extends keyof DB ? DB[E] : EntityData>(
      entity: E,
      query: Omit<RepoQueryIn, "limit" | "offset" | "sort"> = {},
   ) {
      type T = Pick<RepositoryResponse<Data>, "meta" | "data">;
      return this.readMany(entity, {
         ...query,
         limit: 1,
         offset: 0,
      }).refine((data) => data[0]) as unknown as FetchPromise<ResponseObject<T>>;
   }

   readMany<E extends keyof DB | string, Data = E extends keyof DB ? DB[E] : EntityData>(
      entity: E,
      query: RepoQueryIn = {},
   ) {
      type T = Pick<RepositoryResponse<Data[]>, "meta" | "data">;

      const input = query ?? this.options.defaultQuery;
      const req = this.get<T>(["entity", entity as any], input);

      if (req.request.url.length <= this.options.queryLengthLimit) {
         return req;
      }

      return this.post<T>(["entity", entity as any, "query"], input);
   }

   readManyByReference<
      E extends keyof DB | string,
      R extends keyof DB | string,
      Data = R extends keyof DB ? DB[R] : EntityData,
   >(entity: E, id: PrimaryFieldType, reference: R, query: RepoQueryIn = {}) {
      return this.get<Pick<RepositoryResponse<Data[]>, "meta" | "data">>(
         ["entity", entity as any, id, reference],
         query ?? this.options.defaultQuery,
      );
   }

   createOne<E extends keyof DB | string, Data = E extends keyof DB ? DB[E] : EntityData>(
      entity: E,
      input: Omit<Data, "id">,
   ) {
      return this.post<RepositoryResponse<Data>>(["entity", entity as any], input);
   }

   createMany<E extends keyof DB | string, Data = E extends keyof DB ? DB[E] : EntityData>(
      entity: E,
      input: Omit<Data, "id">[],
   ) {
      if (!input || !Array.isArray(input) || input.length === 0) {
         throw new Error("input is required");
      }
      return this.post<RepositoryResponse<Data[]>>(["entity", entity as any], input);
   }

   updateOne<E extends keyof DB | string, Data = E extends keyof DB ? DB[E] : EntityData>(
      entity: E,
      id: PrimaryFieldType,
      input: Partial<Omit<Data, "id">>,
   ) {
      if (!id) throw new Error("ID is required");
      return this.patch<RepositoryResponse<Data>>(["entity", entity as any, id], input);
   }

   updateMany<E extends keyof DB | string, Data = E extends keyof DB ? DB[E] : EntityData>(
      entity: E,
      where: RepoQueryIn["where"],
      update: Partial<Omit<Data, "id">>,
   ) {
      this.requireObjectSet(where);
      return this.patch<RepositoryResponse<Data[]>>(["entity", entity as any], {
         update,
         where,
      });
   }

   deleteOne<E extends keyof DB | string, Data = E extends keyof DB ? DB[E] : EntityData>(
      entity: E,
      id: PrimaryFieldType,
   ) {
      if (!id) throw new Error("ID is required");
      return this.delete<RepositoryResponse<Data>>(["entity", entity as any, id]);
   }

   deleteMany<E extends keyof DB | string, Data = E extends keyof DB ? DB[E] : EntityData>(
      entity: E,
      where: RepoQueryIn["where"],
   ) {
      this.requireObjectSet(where);
      return this.delete<RepositoryResponse<Data>>(["entity", entity as any], where);
   }

   count<E extends keyof DB | string>(entity: E, where: RepoQueryIn["where"] = {}) {
      return this.post<RepositoryResponse<{ entity: E; count: number }>>(
         ["entity", entity as any, "fn", "count"],
         where,
      );
   }

   exists<E extends keyof DB | string>(entity: E, where: RepoQueryIn["where"] = {}) {
      return this.post<RepositoryResponse<{ entity: E; exists: boolean }>>(
         ["entity", entity as any, "fn", "exists"],
         where,
      );
   }
}
