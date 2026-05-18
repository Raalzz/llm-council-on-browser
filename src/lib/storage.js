const INDEX_KEY = 'llmcouncil:index';
const CONV_PREFIX = 'llmcouncil:conv:';

function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeIndex(index) {
  safeSetItem(INDEX_KEY, JSON.stringify(index));
}

function convKey(id) {
  return `${CONV_PREFIX}${id}`;
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      throw new Error(
        'Browser localStorage is full. Export or delete old conversations to free space.'
      );
    }
    throw err;
  }
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function listConversations() {
  const index = readIndex();
  return [...index].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function createConversation() {
  const conv = {
    id: newId(),
    created_at: new Date().toISOString(),
    title: 'New Conversation',
    messages: [],
  };
  safeSetItem(convKey(conv.id), JSON.stringify(conv));

  const index = readIndex();
  index.unshift({
    id: conv.id,
    created_at: conv.created_at,
    title: conv.title,
    message_count: 0,
  });
  writeIndex(index);

  return conv;
}

export function getConversation(id) {
  const raw = localStorage.getItem(convKey(id));
  return raw ? JSON.parse(raw) : null;
}

export function saveConversation(conv) {
  safeSetItem(convKey(conv.id), JSON.stringify(conv));
  const index = readIndex();
  const i = index.findIndex((c) => c.id === conv.id);
  const meta = {
    id: conv.id,
    created_at: conv.created_at,
    title: conv.title,
    message_count: conv.messages.length,
  };
  if (i === -1) index.unshift(meta);
  else index[i] = meta;
  writeIndex(index);
}

export function addUserMessage(id, content) {
  const conv = getConversation(id);
  if (!conv) throw new Error(`Conversation ${id} not found`);
  conv.messages.push({ role: 'user', content });
  saveConversation(conv);
}

export function addAssistantMessage(id, stage1, stage2, stage3, metadata) {
  const conv = getConversation(id);
  if (!conv) throw new Error(`Conversation ${id} not found`);
  conv.messages.push({
    role: 'assistant',
    stage1,
    stage2,
    stage3,
    metadata,
  });
  saveConversation(conv);
}

export function updateConversationTitle(id, title) {
  const conv = getConversation(id);
  if (!conv) throw new Error(`Conversation ${id} not found`);
  conv.title = title;
  saveConversation(conv);
}

export function deleteConversation(id) {
  localStorage.removeItem(convKey(id));
  const index = readIndex().filter((c) => c.id !== id);
  writeIndex(index);
}

export function exportAll() {
  const index = readIndex();
  const conversations = index.map((m) => getConversation(m.id)).filter(Boolean);
  return { exported_at: new Date().toISOString(), conversations };
}
