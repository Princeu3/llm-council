/**
 * GET /api/conversations - List all conversations
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

  try {
    const conversations = await getConversationsCollection();

    const results = await conversations
      .find({})
      .sort({ created_at: -1 })
      .project({
        id: 1,
        created_at: 1,
        title: 1,
        messages: 1,
        _id: 0,
      })
      .toArray();

    // Transform to include message_count
    const response = results.map((conv) => ({
      id: conv.id,
      created_at: conv.created_at,
      title: conv.title || 'New Conversation',
      message_count: conv.messages?.length || 0,
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error listing conversations:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to list conversations' }),
    };
  }
}
