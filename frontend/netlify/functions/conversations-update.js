/**
 * PATCH /api/conversations/:id - Update conversation (rename)
 */

import { getConversationsCollection } from './lib/mongodb.js';

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      },
      body: '',
    };
  }

  // Only allow PATCH
  if (event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { id, title } = body;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing conversation ID' }),
      };
    }

    if (!title || typeof title !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing or invalid title' }),
      };
    }

    const conversations = await getConversationsCollection();

    const result = await conversations.updateOne(
      { id },
      { $set: { title: title.trim() } }
    );

    if (result.matchedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Conversation not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ success: true, title: title.trim() }),
    };
  } catch (error) {
    console.error('Error updating conversation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update conversation' }),
    };
  }
}
