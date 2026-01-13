/**
 * GET /api/conversations/:id - Get a specific conversation
 */

import { getConversationsCollection } from './lib/mongodb.js';

export async function handler(event) {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Get conversation ID from query params
  const conversationId = event.queryStringParameters?.id;

  if (!conversationId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing conversation ID' }),
    };
  }

  try {
    const conversations = await getConversationsCollection();

    const conversation = await conversations.findOne(
      { id: conversationId },
      { projection: { _id: 0 } }
    );

    if (!conversation) {
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
      body: JSON.stringify(conversation),
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get conversation' }),
    };
  }
}
