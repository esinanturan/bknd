import { type BaseModuleApiOptions, ModuleApi, type PrimaryFieldType } from "modules/ModuleApi";
import type { FileWithPath } from "ui/elements/media/file-selector";

export type MediaApiOptions = BaseModuleApiOptions & {};

export class MediaApi extends ModuleApi<MediaApiOptions> {
   protected override getDefaultOptions(): Partial<MediaApiOptions> {
      return {
         basepath: "/api/media"
      };
   }

   getFiles() {
      return this.get(["files"]);
   }

   getFileResponse(filename: string) {
      return this.get(["file", filename], undefined, {
         headers: {
            Accept: "*/*"
         }
      });
   }

   async getFile(filename: string): Promise<Blob> {
      const { res } = await this.getFileResponse(filename);
      if (!res.ok || !res.body) {
         throw new Error("Failed to fetch file");
      }
      return await res.blob();
   }

   async getFileStream(filename: string): Promise<ReadableStream<Uint8Array>> {
      const { res } = await this.getFileResponse(filename);
      if (!res.ok || !res.body) {
         throw new Error("Failed to fetch file");
      }
      return res.body;
   }

   getFileUploadUrl(file: FileWithPath): string {
      return this.getUrl(`/upload/${file.path}`);
   }

   getEntityUploadUrl(entity: string, id: PrimaryFieldType, field: string) {
      return this.getUrl(`/entity/${entity}/${id}/${field}`);
   }

   getUploadHeaders(): Headers {
      return new Headers({
         Authorization: `Bearer ${this.options.token}`
      });
   }

   uploadFile(body: File | ReadableStream, filename?: string) {
      let type: string = "application/octet-stream";
      let name: string = filename || "";
      try {
         type = (body as File).type;
         if (!filename) {
            name = (body as File).name;
         }
      } catch (e) {}

      if (name && name.length > 0 && name.includes("/")) {
         name = name.split("/").pop() || "";
      }

      if (!name || name.length === 0) {
         throw new Error("Invalid filename");
      }

      return this.post(["upload", name], body, {
         headers: {
            "Content-Type": type
         }
      });
   }

   async upload(item: Request | Response | string | File | ReadableStream, filename?: string) {
      if (item instanceof Request || typeof item === "string") {
         const res = await this.fetcher(item);
         if (!res.ok || !res.body) {
            throw new Error("Failed to fetch file");
         }
         return this.uploadFile(res.body, filename);
      } else if (item instanceof Response) {
         if (!item.body) {
            throw new Error("Invalid response");
         }
         return this.uploadFile(item.body, filename);
      }

      return this.uploadFile(item, filename);
   }

   deleteFile(filename: string) {
      return this.delete(["file", filename]);
   }
}
