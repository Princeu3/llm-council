/**
 * POST /api/conversations - Create a new conversation
 */

import { v4 as uuidv4 } from 'uuid';
import { getConversationsCollection } from './lib/mongodb.js';

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const conversations = await getConversationsCollection();

    const newConversation = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      title: 'New Conversation',
      messages: [],
    };

    await conversations.insertOne(newConversation);

    // Return without MongoDB _id
    const { _id, ...response } = newConversation;

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create conversation' }),
    };
  }
}
