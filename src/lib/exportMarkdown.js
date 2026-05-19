import { computeCost, getPricingForModel } from './pricing';
import { formatCost, formatTokens, slugifyTitle, isoDateForFilename } from './formatters';

function shortModel(model) {
  if (!model) return 'unknown';
  return model.split('/')[1] || model;
}

function stageCostLine(stageResults, pricingTable) {
  if (!stageResults) return '';
  const results = Array.isArray(stageResults) ? stageResults : [stageResults];
  let totalTokens = 0;
  let totalCost = 0;
  let hasUsage = false;
  let hasFullCost = true;
  for (const r of results) {
    if (!r?.usage) continue;
    hasUsage = true;
    const prompt = Number(r.usage.prompt_tokens) || 0;
    const completion = Number(r.usage.completion_tokens) || 0;
    totalTokens += prompt + completion;
    const pricing = getPricingForModel(pricingTable, r.resolved_model || r.model);
    const cost = computeCost(r.usage, pricing);
    if (cost === null) hasFullCost = false;
    else totalCost += cost;
  }
  if (!hasUsage) return '';
  const tokenStr = `${formatTokens(totalTokens)} tokens`;
  const costStr = hasFullCost ? formatCost(totalCost) : null;
  return costStr ? `_${tokenStr} · ${costStr}_` : `_${tokenStr}_`;
}

function renderAssistantTurn(msg, pricingTable) {
  const lines = [];

  if (Array.isArray(msg.stage1) && msg.stage1.length > 0) {
    lines.push('## Stage 1 — Council Responses');
    const costLine = stageCostLine(msg.stage1, pricingTable);
    if (costLine) lines.push(costLine);
    lines.push('');
    for (const r of msg.stage1) {
      lines.push(`### ${shortModel(r.model)}`);
      lines.push(`<sub>${r.model}</sub>`);
      lines.push('');
      lines.push(r.response || '');
      lines.push('');
    }
  }

  if (Array.isArray(msg.stage2) && msg.stage2.length > 0) {
    lines.push('## Stage 2 — Peer Rankings');
    const costLine = stageCostLine(msg.stage2, pricingTable);
    if (costLine) lines.push(costLine);
    lines.push('');
    for (const r of msg.stage2) {
      lines.push(`### Ranker: ${shortModel(r.model)}`);
      lines.push(`<sub>${r.model}</sub>`);
      lines.push('');
      lines.push(r.ranking || '');
      lines.push('');
    }
    const agg = msg.metadata?.aggregate_rankings;
    if (Array.isArray(agg) && agg.length > 0) {
      lines.push('### Aggregate Rankings');
      lines.push('');
      lines.push('| Rank | Model | Avg | Votes |');
      lines.push('| --- | --- | --- | --- |');
      agg.forEach((a, i) => {
        lines.push(`| ${i + 1} | ${shortModel(a.model)} | ${a.average_rank.toFixed(2)} | ${a.rankings_count} |`);
      });
      lines.push('');
    }
  }

  if (msg.stage3) {
    lines.push(`## Stage 3 — Chairman Synthesis (${shortModel(msg.stage3.model)})`);
    const costLine = stageCostLine(msg.stage3, pricingTable);
    if (costLine) lines.push(costLine);
    lines.push('');
    lines.push(msg.stage3.response || '');
    lines.push('');
  }

  return lines.join('\n');
}

export function conversationToMarkdown(conversation, pricingTable) {
  if (!conversation) return '';
  const lines = [];
  lines.push(`# ${conversation.title || 'Conversation'}`);
  lines.push('');
  if (conversation.created_at) {
    lines.push(`_Created: ${conversation.created_at}_`);
    lines.push('');
  }

  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  messages.forEach((msg, i) => {
    if (msg.role === 'user') {
      lines.push('## You');
      lines.push('');
      lines.push(msg.content || '');
      lines.push('');
    } else if (msg.role === 'assistant') {
      lines.push(renderAssistantTurn(msg, pricingTable));
    }
    if (i < messages.length - 1) {
      lines.push('---');
      lines.push('');
    }
  });

  return lines.join('\n');
}

export function messageFinalAnswerToMarkdown(userMessage, assistantMessage, title) {
  const lines = [];
  lines.push(`# ${title || 'Conversation'}`);
  lines.push('');
  if (userMessage?.content) {
    lines.push('## Question');
    lines.push('');
    lines.push(userMessage.content);
    lines.push('');
  }
  const stage3 = assistantMessage?.stage3;
  if (stage3) {
    lines.push(`## Answer — ${shortModel(stage3.model)}`);
    lines.push(`<sub>${stage3.model}</sub>`);
    lines.push('');
    lines.push(stage3.response || '');
    lines.push('');
  }
  return lines.join('\n');
}

export function downloadMarkdown(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportConversationAsMarkdown(conversation, pricingTable) {
  if (!conversation) return;
  const content = conversationToMarkdown(conversation, pricingTable);
  const filename = `${slugifyTitle(conversation.title)}-${isoDateForFilename()}.md`;
  downloadMarkdown(filename, content);
}

export function exportFinalAnswerAsMarkdown(userMessage, assistantMessage, conversationTitle) {
  const content = messageFinalAnswerToMarkdown(userMessage, assistantMessage, conversationTitle);
  const filename = `${slugifyTitle(conversationTitle)}-answer-${isoDateForFilename()}.md`;
  downloadMarkdown(filename, content);
}
