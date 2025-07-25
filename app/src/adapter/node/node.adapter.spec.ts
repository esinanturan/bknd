import { afterAll, beforeAll, describe } from "bun:test";
import { createApp, createHandler } from "./node.adapter";
import { adapterTestSuite } from "adapter/adapter-test-suite";
import { bunTestRunner } from "adapter/bun/test";
import { disableConsoleLog, enableConsoleLog } from "core/utils";

beforeAll(disableConsoleLog);
afterAll(enableConsoleLog);

describe("node adapter (bun)", () => {
   adapterTestSuite(bunTestRunner, {
      makeApp: createApp,
      makeHandler: createHandler,
   });
});
