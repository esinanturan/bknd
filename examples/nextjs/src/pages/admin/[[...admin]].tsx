import type { InferGetServerSidePropsType as InferProps } from "next";
import dynamic from "next/dynamic";

import { withApi } from "bknd/adapter/nextjs";
import "bknd/dist/styles.css";

const Admin = dynamic(() => import("bknd/ui").then((mod) => mod.Admin), {
   ssr: false
});

export const getServerSideProps = withApi(async (context) => {
   return {
      props: {
         user: context.api.getUser()
      }
   };
});

export default function AdminPage({ user }: InferProps<typeof getServerSideProps>) {
   if (typeof document === "undefined") return null;
   return (
      <Admin
         withProvider={{ user }}
         config={{ basepath: "/admin", logo_return_path: "/../", color_scheme: "system" }}
      />
   );
}
