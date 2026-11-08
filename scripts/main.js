import { createRunythModule } from "./runyth/module-kernel.js";

const moduleRuntime = createRunythModule({
  id: "foundry-module-template",
  apiVersion: "1.0.0",
  initialize: async ({ logger }) => {
    logger.debug("Initialization completed.");
  },
  ready: async ({ logger }) => {
    logger.info("Ready.");
  }
});

moduleRuntime.register();
