/**
 * API client for the LLM Council backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

let _getToken = null;

async function getAuthHeaders() {
  const headers = { ...JSON_HEADERS };
  if (_getToken) {
    const token = await _getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function fetchJSON(url, options = {}) {
  const headers = await getAuthHeaders();
  Object.assign(headers, options.headers);
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  setTokenGetter(fn) {
    _getToken = fn;
  },

  async listConversations() {
    return fetchJSON(`${API_BASE}/api/conversations`);
  },

  async createConversation() {
    return fetchJSON(`${API_BASE}/api/conversations`, {
      method: 'POST',
    });
  },

  async getConversation(conversationId) {
    return fetchJSON(`${API_BASE}/api/conversations/${conversationId}`);
  },

  async renameConversation(conversationId, title) {
    return fetchJSON(`${API_BASE}/api/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  async deleteConversation(conversationId) {
    return fetchJSON(`${API_BASE}/api/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  },

  async getModels() {
    return fetchJSON(`${API_BASE}/api/models`);
  },

  /**
   * Send a message and consume SSE stream.
   * @param {string} conversationId
   * @param {string} content
   * @param {(eventType: string, eventData: object) => void} onEvent
   * @param {{ council_models?: string[], chairman_model?: string }} [modelConfig]
   */
  async sendMessageStream(conversationId, content, onEvent, modelConfig) {
    const headers = await getAuthHeaders();
    const body = { content };
    if (modelConfig?.council_models) body.council_models = modelConfig.council_models;
    if (modelConfig?.chairman_model) body.chairman_model = modelConfig.chairman_model;

    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || 'Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent(data.type, data);
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      onEvent('error', { message: err.message });
    }
  },
};
