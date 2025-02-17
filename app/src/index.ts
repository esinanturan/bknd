export { App, createApp, AppEvents, type AppConfig, type CreateAppConfig } from "./App";

export {
   getDefaultConfig,
   getDefaultSchema,
   type ModuleConfigs,
   type ModuleSchemas,
   type ModuleManagerOptions,
   type ModuleBuildContext
} from "./modules/ModuleManager";

export * as middlewares from "modules/middlewares";
export { registries } from "modules/registries";

export type { MediaFieldSchema } from "media/AppMedia";
export type { UserFieldSchema } from "auth/AppAuth";
