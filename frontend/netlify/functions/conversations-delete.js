/**
 * DELETE /api/conversations/:id - Delete a conversation
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
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      },
      body: '',
    };
  }

  // Only allow DELETE
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const conversationId = event.queryStringParameters?.id;

  if (!conversationId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing conversation ID' }),
    };
  }

  try {
    const conversations = await getConversationsCollection();

    const result = await conversations.deleteOne({ id: conversationId });

    if (result.deletedCount === 0) {
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
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete conversation' }),
    };
  }
}
