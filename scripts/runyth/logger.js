const LEVELS = Object.freeze(["debug", "info", "warn", "error"]);

export function createLogger(moduleId, sink = console) {
  if (typeof moduleId !== "string" || moduleId.length === 0) {
    throw new TypeError("moduleId must be a non-empty string.");
  }

  const logger = {};
  for (const level of LEVELS) {
    logger[level] = (...values) => {
      const method = typeof sink[level] === "function" ? sink[level] : sink.log;
      method.call(sink, `[${moduleId}]`, ...values);
    };
  }

  return Object.freeze(logger);
}
