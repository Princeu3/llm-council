/**
 * 3-stage LLM Council orchestration logic.
 */

import { queryModel, queryModelsParallel } from './openrouter.js';

// Default models - can be overridden via environment variables
function getCouncilModels() {
  const envModels = process.env.COUNCIL_MODELS;
  if (envModels) {
    try {
      return JSON.parse(envModels);
    } catch (e) {
      console.error('Failed to parse COUNCIL_MODELS:', e);
    }
  }
  return [
    'openai/gpt-5.1',
    'google/gemini-3-pro-preview',
    'anthropic/claude-sonnet-4.5',
    'x-ai/grok-4',
  ];
}

function getChairmanModel() {
  return process.env.CHAIRMAN_MODEL || 'google/gemini-3-pro-preview';
}

/**
 * Stage 1: Collect individual responses from all council models.
 */
export async function stage1CollectResponses(userQuery) {
  const models = getCouncilModels();
  const messages = [{ role: 'user', content: userQuery }];

  const responses = await queryModelsParallel(models, messages);

  const results = [];
  for (const [model, response] of Object.entries(responses)) {
    if (response !== null) {
      results.push({
        model,
        response: response.content || '',
      });
    }
  }

  return results;
}

/**
 * Stage 2: Each model ranks the anonymized responses.
 */
export async function stage2CollectRankings(userQuery, stage1Results) {
  const models = getCouncilModels();

  // Create anonymized labels
  const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i));

  // Create mapping from label to model
  const labelToModel = {};
  labels.forEach((label, i) => {
    labelToModel[`Response ${label}`] = stage1Results[i].model;
  });

  // Build responses text
  const responsesText = stage1Results
    .map((result, i) => `Response ${labels[i]}:\n${result.response}`)
    .join('\n\n');

  const rankingPrompt = `You are evaluating different responses to the following question:

Question: ${userQuery}

Here are the responses from different models (anonymized):

${responsesText}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`;

  const messages = [{ role: 'user', content: rankingPrompt }];
  const responses = await queryModelsParallel(models, messages);

  const results = [];
  for (const [model, response] of Object.entries(responses)) {
    if (response !== null) {
      const fullText = response.content || '';
      results.push({
        model,
        ranking: fullText,
        parsed_ranking: parseRankingFromText(fullText),
      });
    }
  }

  return { rankings: results, labelToModel };
}

/**
 * Stage 3: Chairman synthesizes final response.
 */
export async function stage3SynthesizeFinal(userQuery, stage1Results, stage2Results) {
  const chairmanModel = getChairmanModel();

  const stage1Text = stage1Results
    .map((r) => `Model: ${r.model}\nResponse: ${r.response}`)
    .join('\n\n');

  const stage2Text = stage2Results
    .map((r) => `Model: ${r.model}\nRanking: ${r.ranking}`)
    .join('\n\n');

  const chairmanPrompt = `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: ${userQuery}

STAGE 1 - Individual Responses:
${stage1Text}

STAGE 2 - Peer Rankings:
${stage2Text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:`;

  const messages = [{ role: 'user', content: chairmanPrompt }];
  const response = await queryModel(chairmanModel, messages);

  if (!response) {
    return {
      model: chairmanModel,
      response: 'Error: Unable to generate final synthesis.',
    };
  }

  return {
    model: chairmanModel,
    response: response.content || '',
  };
}

/**
 * Parse the FINAL RANKING section from model response.
 */
export function parseRankingFromText(rankingText) {
  if (rankingText.includes('FINAL RANKING:')) {
    const parts = rankingText.split('FINAL RANKING:');
    if (parts.length >= 2) {
      const rankingSection = parts[1];

      // Try numbered list format
      const numberedMatches = rankingSection.match(/\d+\.\s*Response [A-Z]/g);
      if (numberedMatches) {
        return numberedMatches.map((m) => {
          const match = m.match(/Response [A-Z]/);
          return match ? match[0] : '';
        }).filter(Boolean);
      }

      // Fallback: any Response X patterns
      const matches = rankingSection.match(/Response [A-Z]/g);
      if (matches) return matches;
    }
  }

  // Fallback: any Response X in entire text
  const matches = rankingText.match(/Response [A-Z]/g);
  return matches || [];
}

/**
 * Calculate aggregate rankings across all models.
 */
export function calculateAggregateRankings(stage2Results, labelToModel) {
  const modelPositions = {};

  for (const ranking of stage2Results) {
    const parsedRanking = parseRankingFromText(ranking.ranking);

    parsedRanking.forEach((label, index) => {
      const position = index + 1;
      if (labelToModel[label]) {
        const modelName = labelToModel[label];
        if (!modelPositions[modelName]) {
          modelPositions[modelName] = [];
        }
        modelPositions[modelName].push(position);
      }
    });
  }

  const aggregate = [];
  for (const [model, positions] of Object.entries(modelPositions)) {
    if (positions.length > 0) {
      const avgRank = positions.reduce((a, b) => a + b, 0) / positions.length;
      aggregate.push({
        model,
        average_rank: Math.round(avgRank * 100) / 100,
        rankings_count: positions.length,
      });
    }
  }

  aggregate.sort((a, b) => a.average_rank - b.average_rank);
  return aggregate;
}

/**
 * Generate a short conversation title.
 */
export async function generateConversationTitle(userQuery) {
  const titlePrompt = `Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: ${userQuery}

Title:`;

  const messages = [{ role: 'user', content: titlePrompt }];
  const response = await queryModel('google/gemini-2.5-flash', messages, 30000);

  if (!response) {
    return 'New Conversation';
  }

  let title = (response.content || 'New Conversation').trim();
  title = title.replace(/^["']|["']$/g, '');

  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }

  return title;
}
