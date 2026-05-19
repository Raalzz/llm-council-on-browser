export function formatTokens(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num < 1000) return num.toLocaleString('en-US');
  if (num < 100000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.round(num / 1000) + 'K';
}

export function formatCost(usd) {
  if (usd === null || usd === undefined) return null;
  const n = Number(usd);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return '$0';
  if (n < 0.0001) return '<$0.0001';
  if (n < 1) return '$' + n.toFixed(4);
  if (n < 100) return '$' + n.toFixed(2);
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function slugifyTitle(title) {
  const base = (title || 'conversation').toString().trim().toLowerCase();
  const slug = base
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'conversation';
}

export function isoDateForFilename() {
  return new Date().toISOString().slice(0, 10);
}
