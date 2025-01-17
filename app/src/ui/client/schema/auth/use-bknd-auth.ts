import { useBknd } from "ui/client/bknd";

export function useBkndAuth() {
   const { config, schema, actions: bkndActions } = useBknd();

   const actions = {
      roles: {
         add: async (name: string, data: any = {}) => {
            console.log("add role", name, data);
            return await bkndActions.add("auth", `roles.${name}`, data);
         },
         patch: async (name: string, data: any) => {
            console.log("patch role", name, data);
            return await bkndActions.patch("auth", `roles.${name}`, data);
         },
         delete: async (name: string) => {
            console.log("delete role", name);
            if (window.confirm(`Are you sure you want to delete the role "${name}"?`)) {
               return await bkndActions.remove("auth", `roles.${name}`);
            }
            return false;
         }
      }
   };
   const $auth = {};

   return {
      $auth,
      config: config.auth,
      schema: schema.auth,
      actions
   };
}
