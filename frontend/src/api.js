/**
 * API client for the LLM Council backend.
 * Supports both local development and Netlify deployment.
 */

// Use environment variable or default to Netlify Functions path
const API_BASE = import.meta.env.VITE_API_BASE || '/.netlify/functions';

// For local development with the Python backend, use this instead:
// const API_BASE = 'http://localhost:8001';

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/conversations-list`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/conversations-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/conversations-get?id=${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message and poll for results.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {function} onStatusUpdate - Callback: (status, data) => void
   * @returns {Promise<object>} Final result with stage1, stage2, stage3, metadata
   */
  async sendMessage(conversationId, content, onStatusUpdate) {
    // Start the council process
    const startResponse = await fetch(`${API_BASE}/council-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId, content }),
    });

    if (!startResponse.ok) {
      const errorData = await startResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to start council process');
    }

    const { jobId } = await startResponse.json();

    // Poll for results
    return this.pollJobStatus(jobId, onStatusUpdate);
  },

  /**
   * Poll job status until complete or error.
   * @param {string} jobId - The job ID to poll
   * @param {function} onStatusUpdate - Callback for status updates
   * @param {number} interval - Polling interval in ms (default 2000)
   * @returns {Promise<object>} Final result
   */
  async pollJobStatus(jobId, onStatusUpdate, interval = 2000) {
    let lastStatus = null;

    while (true) {
      const response = await fetch(`${API_BASE}/council-status?jobId=${jobId}`);

      if (!response.ok) {
        throw new Error('Failed to get job status');
      }

      const job = await response.json();

      // Notify on status change
      if (job.status !== lastStatus) {
        lastStatus = job.status;
        onStatusUpdate?.(job.status, job);
      }

      // Check terminal states
      if (job.status === 'complete') {
        return {
          stage1: job.stage1,
          stage2: job.stage2,
          stage3: job.stage3,
          metadata: job.metadata,
        };
      }

      if (job.status === 'error') {
        throw new Error(job.error || 'Council process failed');
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  },

  /**
   * Legacy streaming method - kept for backward compatibility.
   * Now internally uses polling.
   */
  async sendMessageStream(conversationId, content, onEvent) {
    // Map polling status to SSE-style events for backward compatibility
    const statusToEvents = {
      pending: () => {},
      stage1_running: () => onEvent('stage1_start', {}),
      stage1_complete: (job) => onEvent('stage1_complete', { data: job.stage1 }),
      stage2_running: () => onEvent('stage2_start', {}),
      stage2_complete: (job) =>
        onEvent('stage2_complete', { data: job.stage2, metadata: job.metadata }),
      stage3_running: () => onEvent('stage3_start', {}),
      stage3_complete: (job) => onEvent('stage3_complete', { data: job.stage3 }),
      complete: () => onEvent('complete', {}),
      error: (job) => onEvent('error', { message: job.error }),
    };

    try {
      await this.sendMessage(conversationId, content, (status, job) => {
        const handler = statusToEvents[status];
        if (handler) handler(job);
      });
      onEvent('complete', {});
    } catch (error) {
      onEvent('error', { message: error.message });
    }
  },
};
