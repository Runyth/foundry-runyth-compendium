export function createSafeExecutor(logger) {
  if (!logger || typeof logger.error !== "function") {
    throw new TypeError("A logger with an error method is required.");
  }

  return async function safely(operation, callback, fallback = undefined) {
    try {
      return await callback();
    } catch (error) {
      logger.error(`Operation failed: ${operation}`, error);
      return fallback;
    }
  };
}
