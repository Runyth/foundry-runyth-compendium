export function flattenJson(value, prefix = "", output = new Map()) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    output.set(prefix, value);
    return output;
  }

  for (const key of Object.keys(value).sort()) {
    const next = prefix ? `${prefix}.${key}` : key;
    flattenJson(value[key], next, output);
  }
  return output;
}

export function stableJson(value) {
  return `${JSON.stringify(sortObject(value), null, 2)}\n`;
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortObject(value[key])]));
  }
  return value;
}
