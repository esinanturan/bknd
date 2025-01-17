import { type PrimaryFieldType, isDebug } from "core";
import { encodeSearch } from "core/utils";

export type { PrimaryFieldType };
export type BaseModuleApiOptions = {
   host: string;
   basepath?: string;
   token?: string;
   headers?: Headers;
   token_transport?: "header" | "cookie" | "none";
};

/** @deprecated */
export type ApiResponse<Data = any> = {
   success: boolean;
   status: number;
   body: Data;
   data?: Data extends { data: infer R } ? R : any;
   res: Response;
};

export type TInput = string | (string | number | PrimaryFieldType)[];

export abstract class ModuleApi<Options extends BaseModuleApiOptions = BaseModuleApiOptions> {
   protected fetcher?: typeof fetch;

   constructor(protected readonly _options: Partial<Options> = {}) {}

   protected getDefaultOptions(): Partial<Options> {
      return {};
   }

   get options(): Options {
      return {
         host: "http://localhost",
         token: undefined,
         ...this.getDefaultOptions(),
         ...this._options
      } as Options;
   }

   /**
    * used for SWR invalidation of basepath
    */
   key(): string {
      return this.options.basepath ?? "";
   }

   protected getUrl(path: string) {
      const basepath = this.options.basepath ?? "";
      return this.options.host + (basepath + "/" + path).replace(/\/{2,}/g, "/").replace(/\/$/, "");
   }

   protected request<Data = any>(
      _input: TInput,
      _query?: Record<string, any> | URLSearchParams,
      _init?: RequestInit
   ): FetchPromise<ResponseObject<Data>> {
      const method = _init?.method ?? "GET";
      const input = Array.isArray(_input) ? _input.join("/") : _input;
      let url = this.getUrl(input);

      if (_query instanceof URLSearchParams) {
         url += "?" + _query.toString();
      } else if (typeof _query === "object") {
         if (Object.keys(_query).length > 0) {
            url += "?" + encodeSearch(_query);
         }
      }

      const headers = new Headers(this.options.headers ?? {});
      // add init headers
      for (const [key, value] of Object.entries(_init?.headers ?? {})) {
         headers.set(key, value as string);
      }

      headers.set("Accept", "application/json");

      // only add token if initial headers not provided
      if (this.options.token && this.options.token_transport === "header") {
         //console.log("setting token", this.options.token);
         headers.set("Authorization", `Bearer ${this.options.token}`);
      }

      let body: any = _init?.body;
      if (_init && "body" in _init && ["POST", "PATCH", "PUT"].includes(method)) {
         const requestContentType = (headers.get("Content-Type") as string) ?? undefined;
         if (!requestContentType || requestContentType.startsWith("application/json")) {
            body = JSON.stringify(_init.body);
            headers.set("Content-Type", "application/json");
         }
      }

      const request = new Request(url, {
         ..._init,
         method,
         body,
         headers
      });

      return new FetchPromise(request, {
         fetcher: this.fetcher
      });
   }

   get<Data = any>(
      _input: TInput,
      _query?: Record<string, any> | URLSearchParams,
      _init?: RequestInit
   ) {
      return this.request<Data>(_input, _query, {
         ..._init,
         method: "GET"
      });
   }

   post<Data = any>(_input: TInput, body?: any, _init?: RequestInit) {
      return this.request<Data>(_input, undefined, {
         ..._init,
         body,
         method: "POST"
      });
   }

   patch<Data = any>(_input: TInput, body?: any, _init?: RequestInit) {
      return this.request<Data>(_input, undefined, {
         ..._init,
         body,
         method: "PATCH"
      });
   }

   put<Data = any>(_input: TInput, body?: any, _init?: RequestInit) {
      return this.request<Data>(_input, undefined, {
         ..._init,
         body,
         method: "PUT"
      });
   }

   delete<Data = any>(_input: TInput, _init?: RequestInit) {
      return this.request<Data>(_input, undefined, {
         ..._init,
         method: "DELETE"
      });
   }
}

export type ResponseObject<Body = any, Data = Body extends { data: infer R } ? R : Body> = Data & {
   raw: Response;
   res: Response;
   data: Data;
   body: Body;
   ok: boolean;
   status: number;
   toJSON(): Data;
};

export function createResponseProxy<Body = any, Data = any>(
   raw: Response,
   body: Body,
   data?: Data
): ResponseObject<Body, Data> {
   const actualData = data ?? (body as unknown as Data);
   const _props = ["raw", "body", "ok", "status", "res", "data", "toJSON"];

   return new Proxy(actualData as any, {
      get(target, prop, receiver) {
         if (prop === "raw" || prop === "res") return raw;
         if (prop === "body") return body;
         if (prop === "data") return data;
         if (prop === "ok") return raw.ok;
         if (prop === "status") return raw.status;
         if (prop === "toJSON") {
            return () => target;
         }
         return Reflect.get(target, prop, receiver);
      },
      has(target, prop) {
         if (_props.includes(prop as string)) {
            return true;
         }
         return Reflect.has(target, prop);
      },
      ownKeys(target) {
         return Array.from(new Set([...Reflect.ownKeys(target), ..._props]));
      },
      getOwnPropertyDescriptor(target, prop) {
         if (_props.includes(prop as string)) {
            return {
               configurable: true,
               enumerable: true,
               value: Reflect.get({ raw, body, ok: raw.ok, status: raw.status }, prop)
            };
         }
         return Reflect.getOwnPropertyDescriptor(target, prop);
      }
   }) as ResponseObject<Body, Data>;
}

export class FetchPromise<T = ApiResponse<any>> implements Promise<T> {
   // @ts-ignore
   [Symbol.toStringTag]: "FetchPromise";

   constructor(
      public request: Request,
      protected options?: {
         fetcher?: typeof fetch;
      }
   ) {}

   async execute(): Promise<ResponseObject<T>> {
      // delay in dev environment
      isDebug() && (await new Promise((resolve) => setTimeout(resolve, 200)));

      const fetcher = this.options?.fetcher ?? fetch;
      const res = await fetcher(this.request);
      let resBody: any;
      let resData: any;

      const contentType = res.headers.get("Content-Type") ?? "";
      if (contentType.startsWith("application/json")) {
         resBody = await res.json();
         if (typeof resBody === "object") {
            resData = "data" in resBody ? resBody.data : resBody;
         }
      } else if (contentType.startsWith("text")) {
         resBody = await res.text();
      }

      return createResponseProxy<T>(res, resBody, resData);
   }

   // biome-ignore lint/suspicious/noThenProperty: it's a promise :)
   then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
   ): Promise<TResult1 | TResult2> {
      return this.execute().then(onfulfilled as any, onrejected);
   }

   catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined
   ): Promise<T | TResult> {
      return this.then(undefined, onrejected);
   }

   finally(onfinally?: (() => void) | null | undefined): Promise<T> {
      return this.then(
         (value) => {
            onfinally?.();
            return value;
         },
         (reason) => {
            onfinally?.();
            throw reason;
         }
      );
   }

   path(): string {
      const url = new URL(this.request.url);
      return url.pathname;
   }

   key(options?: { search: boolean }): string {
      const url = new URL(this.request.url);
      return options?.search !== false ? this.path() + url.search : this.path();
   }

   keyArray(options?: { search: boolean }): string[] {
      const url = new URL(this.request.url);
      const path = this.path().split("/");
      return (options?.search !== false ? [...path, url.searchParams.toString()] : path).filter(
         Boolean
      );
   }
}
