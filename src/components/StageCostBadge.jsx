import { computeCost, getPricingForModel } from '../lib/pricing';
import { formatCost, formatTokens } from '../lib/formatters';

function aggregate(results, pricingTable) {
  const list = Array.isArray(results) ? results : results ? [results] : [];
  let totalTokens = 0;
  let totalCost = 0;
  let hasUsage = false;
  let hasFullCost = true;
  for (const r of list) {
    if (!r?.usage) {
      hasFullCost = false;
      continue;
    }
    hasUsage = true;
    const prompt = Number(r.usage.prompt_tokens) || 0;
    const completion = Number(r.usage.completion_tokens) || 0;
    totalTokens += prompt + completion;
    const pricing = getPricingForModel(pricingTable, r.resolved_model || r.model);
    const cost = computeCost(r.usage, pricing);
    if (cost === null) hasFullCost = false;
    else totalCost += cost;
  }
  return { hasUsage, totalTokens, totalCost, hasFullCost };
}

export default function StageCostBadge({ results, pricingTable }) {
  const { hasUsage, totalTokens, totalCost, hasFullCost } = aggregate(results, pricingTable);
  if (!hasUsage) return null;
  const costStr = hasFullCost ? formatCost(totalCost) : null;
  return (
    <span className="stage-cost-badge" title="Tokens and estimated cost for this stage">
      {formatTokens(totalTokens)} tokens
      {costStr ? ` · ${costStr}` : ''}
    </span>
  );
}
