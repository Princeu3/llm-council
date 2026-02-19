/**
 * Extract the short display name from a full model identifier.
 * e.g. "openai/gpt-5.1" -> "gpt-5.1", "gpt-5.1" -> "gpt-5.1"
 */
export function getModelShortName(model) {
  return model.split('/')[1] || model;
}
