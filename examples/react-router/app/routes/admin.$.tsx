import { lazy, Suspense, useSyncExternalStore } from "react";
import { type LoaderFunctionArgs, useLoaderData } from "react-router";
import { getApi } from "~/bknd";

const Admin = lazy(() => import("bknd/ui").then((mod) => ({ default: mod.Admin })));
import "bknd/dist/styles.css";

export const loader = async (args: LoaderFunctionArgs) => {
   const api = await getApi(args, { verify: true });
   return {
      user: api.getUser(),
   };
};

export default function AdminPage() {
   const { user } = useLoaderData<typeof loader>();
   // derived from https://github.com/sergiodxa/remix-utils
   const hydrated = useSyncExternalStore(
      // @ts-ignore
      () => {},
      () => true,
      () => false,
   );
   if (!hydrated) return null;

   return (
      <Suspense>
         <Admin withProvider={{ user }} config={{ basepath: "/admin", logo_return_path: "/../" }} />
      </Suspense>
   );
}
