/**
 * OpenRouter API client for making LLM requests.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Query a single model via OpenRouter API.
 * @param {string} model - OpenRouter model identifier
 * @param {Array} messages - Array of message objects with role and content
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Object|null} Response with content, or null if failed
 */
export async function queryModel(model, messages, timeout = 120000) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not set');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error for ${model}: ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    return {
      content: message?.content || '',
      reasoning_details: message?.reasoning_details,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error querying model ${model}:`, error.message);
    return null;
  }
}

/**
 * Query multiple models in parallel.
 * @param {Array<string>} models - Array of model identifiers
 * @param {Array} messages - Messages to send to each model
 * @returns {Object} Map of model identifier to response
 */
export async function queryModelsParallel(models, messages) {
  const tasks = models.map((model) => queryModel(model, messages));
  const responses = await Promise.all(tasks);

  const result = {};
  models.forEach((model, index) => {
    result[model] = responses[index];
  });

  return result;
}
