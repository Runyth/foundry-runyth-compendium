import { FOUNDRY_LIFECYCLE_HOOKS, RUNYTH_RUNTIME_API_VERSION } from "./constants.js";
import { createLogger } from "./logger.js";
import { createSafeExecutor } from "./safe-executor.js";

function assertFoundryHooks() {
  if (!globalThis.Hooks || typeof globalThis.Hooks.once !== "function") {
    throw new Error("Foundry VTT Hooks are unavailable.");
  }
}

export function createRunythModule(options) {
  const {
    id,
    apiVersion = RUNYTH_RUNTIME_API_VERSION,
    initialize = async () => {},
    setup = async () => {},
    ready = async () => {},
    createApi = () => ({})
  } = options;

  const logger = createLogger(id);
  const safely = createSafeExecutor(logger);
  let api;

  const context = Object.freeze({ id, apiVersion, logger, safely });

  function publishApi() {
    const moduleRecord = globalThis.game?.modules?.get(id);
    if (!moduleRecord) {
      logger.warn("Foundry module record was not found; API was not published.");
      return;
    }

    api = Object.freeze({
      apiVersion,
      ...createApi(context)
    });
    moduleRecord.api = api;
    globalThis.Hooks.callAll(`${id}.apiReady`, api);
  }

  function register() {
    assertFoundryHooks();

    globalThis.Hooks.once(FOUNDRY_LIFECYCLE_HOOKS.INIT, async () => {
      await safely("initialize", () => initialize(context));
    });

    globalThis.Hooks.once(FOUNDRY_LIFECYCLE_HOOKS.SETUP, async () => {
      await safely("setup", () => setup(context));
      await safely("publishApi", async () => publishApi());
    });

    globalThis.Hooks.once(FOUNDRY_LIFECYCLE_HOOKS.READY, async () => {
      await safely("ready", () => ready(Object.freeze({ ...context, api })));
    });
  }

  return Object.freeze({ register });
}
