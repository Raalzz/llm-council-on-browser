import { queryModel, queryModelsParallel } from './openrouter';
import { getSettings } from './settings';
import * as storage from './storage';

export async function stage1CollectResponses(userQuery) {
  const { councilModels } = getSettings();
  const messages = [{ role: 'user', content: userQuery }];
  const responses = await queryModelsParallel(councilModels, messages);

  const stage1Results = [];
  for (const model of councilModels) {
    const response = responses[model];
    if (response !== null && response !== undefined) {
      stage1Results.push({ model, response: response.content || '' });
    }
  }
  return stage1Results;
}

export async function stage2CollectRankings(userQuery, stage1Results) {
  const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i));
  const labelToModel = {};
  stage1Results.forEach((result, i) => {
    labelToModel[`Response ${labels[i]}`] = result.model;
  });

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

  const { councilModels } = getSettings();
  const messages = [{ role: 'user', content: rankingPrompt }];
  const responses = await queryModelsParallel(councilModels, messages);

  const stage2Results = [];
  for (const model of councilModels) {
    const response = responses[model];
    if (response !== null && response !== undefined) {
      const fullText = response.content || '';
      stage2Results.push({
        model,
        ranking: fullText,
        parsed_ranking: parseRankingFromText(fullText),
      });
    }
  }
  return { stage2Results, labelToModel };
}

export async function stage3SynthesizeFinal(userQuery, stage1Results, stage2Results) {
  const { chairmanModel } = getSettings();

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

  const response = await queryModel(chairmanModel, [
    { role: 'user', content: chairmanPrompt },
  ]);

  if (response === null) {
    return {
      model: chairmanModel,
      response: 'Error: Unable to generate final synthesis.',
    };
  }
  return { model: chairmanModel, response: response.content || '' };
}

export function parseRankingFromText(rankingText) {
  if (rankingText.includes('FINAL RANKING:')) {
    const parts = rankingText.split('FINAL RANKING:');
    if (parts.length >= 2) {
      const section = parts[1];
      const numbered = section.match(/\d+\.\s*Response [A-Z]/g);
      if (numbered && numbered.length > 0) {
        return numbered.map((m) => m.match(/Response [A-Z]/)[0]);
      }
      const matches = section.match(/Response [A-Z]/g);
      if (matches) return matches;
    }
  }
  return rankingText.match(/Response [A-Z]/g) || [];
}

export function calculateAggregateRankings(stage2Results, labelToModel) {
  const positions = {};
  for (const ranking of stage2Results) {
    const parsed = parseRankingFromText(ranking.ranking);
    parsed.forEach((label, idx) => {
      const model = labelToModel[label];
      if (!model) return;
      if (!positions[model]) positions[model] = [];
      positions[model].push(idx + 1);
    });
  }
  const aggregate = Object.entries(positions)
    .filter(([, p]) => p.length > 0)
    .map(([model, p]) => ({
      model,
      average_rank: Math.round((p.reduce((a, b) => a + b, 0) / p.length) * 100) / 100,
      rankings_count: p.length,
    }));
  aggregate.sort((a, b) => a.average_rank - b.average_rank);
  return aggregate;
}

export async function generateConversationTitle(userQuery) {
  const { titleModel } = getSettings();
  const titlePrompt = `Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: ${userQuery}

Title:`;

  const response = await queryModel(
    titleModel,
    [{ role: 'user', content: titlePrompt }],
    { timeout: 30000 }
  );

  if (response === null) return 'New Conversation';
  let title = (response.content || 'New Conversation').trim();
  title = title.replace(/^["']+|["']+$/g, '');
  if (title.length > 50) title = title.slice(0, 47) + '...';
  return title;
}

export async function runFullCouncilStream(conversationId, content, onEvent) {
  try {
    const conversation = storage.getConversation(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);
    const isFirstMessage = conversation.messages.length === 0;

    storage.addUserMessage(conversationId, content);

    const titlePromise = isFirstMessage ? generateConversationTitle(content) : null;

    onEvent('stage1_start', { type: 'stage1_start' });
    const stage1Results = await stage1CollectResponses(content);
    onEvent('stage1_complete', { type: 'stage1_complete', data: stage1Results });

    if (stage1Results.length === 0) {
      throw new Error('All models failed to respond. Check your API key and model identifiers, then try again.');
    }

    onEvent('stage2_start', { type: 'stage2_start' });
    const { stage2Results, labelToModel } = await stage2CollectRankings(content, stage1Results);
    const aggregateRankings = calculateAggregateRankings(stage2Results, labelToModel);
    const metadata = { label_to_model: labelToModel, aggregate_rankings: aggregateRankings };
    onEvent('stage2_complete', {
      type: 'stage2_complete',
      data: stage2Results,
      metadata,
    });

    onEvent('stage3_start', { type: 'stage3_start' });
    const stage3Result = await stage3SynthesizeFinal(content, stage1Results, stage2Results);
    onEvent('stage3_complete', { type: 'stage3_complete', data: stage3Result });

    if (titlePromise) {
      const title = await titlePromise;
      storage.updateConversationTitle(conversationId, title);
      onEvent('title_complete', { type: 'title_complete', data: { title } });
    }

    storage.addAssistantMessage(
      conversationId,
      stage1Results,
      stage2Results,
      stage3Result,
      metadata
    );

    onEvent('complete', { type: 'complete' });
  } catch (err) {
    onEvent('error', { type: 'error', message: err?.message || String(err) });
  }
}

export async function runFullCouncil(conversationId, content) {
  let result = null;
  await runFullCouncilStream(conversationId, content, (type, event) => {
    if (type === 'complete') {
      const conv = storage.getConversation(conversationId);
      const last = conv?.messages[conv.messages.length - 1];
      if (last && last.role === 'assistant') {
        result = {
          stage1: last.stage1,
          stage2: last.stage2,
          stage3: last.stage3,
          metadata: last.metadata,
        };
      }
    } else if (type === 'error') {
      throw new Error(event.message);
    }
  });
  return result;
}
