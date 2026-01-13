/**
 * Background function that runs the 3-stage council process.
 * This function has a 15-minute timeout (Netlify background function limit).
 */

import { getConversationsCollection, getJobsCollection } from './lib/mongodb.js';
import {
  stage1CollectResponses,
  stage2CollectRankings,
  stage3SynthesizeFinal,
  calculateAggregateRankings,
  generateConversationTitle,
} from './lib/council.js';

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let jobId, conversationId, userQuery;

  try {
    const body = JSON.parse(event.body || '{}');
    jobId = body.jobId;
    conversationId = body.conversationId;
    userQuery = body.userQuery;
  } catch (e) {
    return { statusCode: 400, body: 'Invalid request body' };
  }

  if (!jobId || !conversationId || !userQuery) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const jobs = await getJobsCollection();
  const conversations = await getConversationsCollection();

  try {
    // Stage 1: Collect responses
    await jobs.updateOne(
      { jobId },
      { $set: { status: 'stage1_running', updated_at: new Date() } }
    );

    const stage1Results = await stage1CollectResponses(userQuery);

    if (stage1Results.length === 0) {
      throw new Error('All models failed to respond');
    }

    await jobs.updateOne(
      { jobId },
      {
        $set: {
          status: 'stage1_complete',
          stage1: stage1Results,
          updated_at: new Date(),
        },
      }
    );

    // Stage 2: Collect rankings
    await jobs.updateOne(
      { jobId },
      { $set: { status: 'stage2_running', updated_at: new Date() } }
    );

    const { rankings: stage2Results, labelToModel } = await stage2CollectRankings(
      userQuery,
      stage1Results
    );

    const aggregateRankings = calculateAggregateRankings(stage2Results, labelToModel);

    await jobs.updateOne(
      { jobId },
      {
        $set: {
          status: 'stage2_complete',
          stage2: stage2Results,
          metadata: {
            label_to_model: labelToModel,
            aggregate_rankings: aggregateRankings,
          },
          updated_at: new Date(),
        },
      }
    );

    // Stage 3: Synthesize final
    await jobs.updateOne(
      { jobId },
      { $set: { status: 'stage3_running', updated_at: new Date() } }
    );

    const stage3Result = await stage3SynthesizeFinal(
      userQuery,
      stage1Results,
      stage2Results
    );

    await jobs.updateOne(
      { jobId },
      {
        $set: {
          status: 'complete',
          stage3: stage3Result,
          updated_at: new Date(),
        },
      }
    );

    // Save assistant message to conversation
    const assistantMessage = {
      role: 'assistant',
      stage1: stage1Results,
      stage2: stage2Results,
      stage3: stage3Result,
    };

    await conversations.updateOne(
      { id: conversationId },
      { $push: { messages: assistantMessage } }
    );

    // Generate title if this is the first message
    const conversation = await conversations.findOne({ id: conversationId });
    if (conversation && conversation.messages.length <= 2) {
      const title = await generateConversationTitle(userQuery);
      await conversations.updateOne(
        { id: conversationId },
        { $set: { title } }
      );
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('Council process error:', error);

    await jobs.updateOne(
      { jobId },
      {
        $set: {
          status: 'error',
          error: error.message,
          updated_at: new Date(),
        },
      }
    );

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
