import { password as $password, text as $text } from "@clack/prompts";
import type { App } from "App";
import type { PasswordStrategy } from "auth/authenticate/strategies";
import { makeConfigApp } from "cli/commands/run";
import { getConfigPath } from "cli/commands/run/platform";
import type { CliBkndConfig, CliCommand } from "cli/types";
import { Argument } from "commander";

export const user: CliCommand = (program) => {
   program
      .command("user")
      .description("create and update user (auth)")
      .addArgument(new Argument("<action>", "action to perform").choices(["create", "update"]))
      .action(action);
};

async function action(action: "create" | "update", options: any) {
   const configFilePath = await getConfigPath();
   if (!configFilePath) {
      console.error("config file not found");
      return;
   }

   const config = (await import(configFilePath).then((m) => m.default)) as CliBkndConfig;
   const app = await makeConfigApp(config, options.server);

   switch (action) {
      case "create":
         await create(app, options);
         break;
      case "update":
         await update(app, options);
         break;
   }
}

async function create(app: App, options: any) {
   const strategy = app.module.auth.authenticator.strategy("password") as PasswordStrategy;

   if (!strategy) {
      throw new Error("Password strategy not configured");
   }

   const email = await $text({
      message: "Enter email",
      validate: (v) => {
         if (!v.includes("@")) {
            return "Invalid email";
         }
         return;
      },
   });

   const password = await $password({
      message: "Enter password",
      validate: (v) => {
         if (v.length < 3) {
            return "Invalid password";
         }
         return;
      },
   });

   if (typeof email !== "string" || typeof password !== "string") {
      console.log("Cancelled");
      process.exit(0);
   }

   try {
      const created = await app.createUser({
         email,
         password: await strategy.hash(password as string),
      });
      console.log("Created:", created);
   } catch (e) {
      console.error("Error", e);
   }
}

async function update(app: App, options: any) {
   const config = app.module.auth.toJSON(true);
   const strategy = app.module.auth.authenticator.strategy("password") as PasswordStrategy;
   const users_entity = config.entity_name as "users";
   const em = app.modules.ctx().em;

   const email = (await $text({
      message: "Which user? Enter email",
      validate: (v) => {
         if (!v.includes("@")) {
            return "Invalid email";
         }
         return;
      },
   })) as string;
   if (typeof email !== "string") {
      console.log("Cancelled");
      process.exit(0);
   }

   const { data: user } = await em.repository(users_entity).findOne({ email });
   if (!user) {
      console.log("User not found");
      process.exit(0);
   }
   console.log("User found:", user);

   const password = await $password({
      message: "New Password?",
      validate: (v) => {
         if (v.length < 3) {
            return "Invalid password";
         }
         return;
      },
   });
   if (typeof password !== "string") {
      console.log("Cancelled");
      process.exit(0);
   }

   try {
      function togglePw(visible: boolean) {
         const field = em.entity(users_entity).field("strategy_value")!;

         field.config.hidden = !visible;
         field.config.fillable = visible;
      }
      togglePw(true);
      await app.modules
         .ctx()
         .em.mutator(users_entity)
         .updateOne(user.id, {
            strategy_value: await strategy.hash(password as string),
         });
      togglePw(false);

      console.log("Updated:", user);
   } catch (e) {
      console.error("Error", e);
   }
}
