/**
 * POST /api/conversations/:id/message - Start council process
 * Creates a job and triggers the background function.
 */

import { v4 as uuidv4 } from 'uuid';
import { getConversationsCollection, getJobsCollection } from './lib/mongodb.js';

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { conversationId, content } = body;

    if (!conversationId || !content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing conversationId or content' }),
      };
    }

    // Verify conversation exists
    const conversations = await getConversationsCollection();
    const conversation = await conversations.findOne({ id: conversationId });

    if (!conversation) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Conversation not found' }),
      };
    }

    // Add user message to conversation
    await conversations.updateOne(
      { id: conversationId },
      {
        $push: {
          messages: { role: 'user', content },
        },
      }
    );

    // Create job
    const jobId = uuidv4();
    const jobs = await getJobsCollection();

    const job = {
      jobId,
      conversationId,
      userQuery: content,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      stage1: null,
      stage2: null,
      stage3: null,
      metadata: null,
      error: null,
      // Auto-delete after 24 hours
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    await jobs.insertOne(job);

    // Trigger background function
    // In Netlify, we call the background function endpoint
    const backgroundUrl = process.env.URL
      ? `${process.env.URL}/.netlify/functions/council-process-background`
      : `http://localhost:8888/.netlify/functions/council-process-background`;

    // Fire and forget - don't await
    fetch(backgroundUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, conversationId, userQuery: content }),
    }).catch((err) => {
      console.error('Failed to trigger background function:', err);
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ jobId, status: 'pending' }),
    };
  } catch (error) {
    console.error('Error starting council:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to start council process' }),
    };
  }
}
