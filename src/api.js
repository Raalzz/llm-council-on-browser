import * as storage from './lib/storage';
import { runFullCouncil, runFullCouncilStream } from './lib/council';

export const api = {
  async listConversations() {
    return storage.listConversations();
  },

  async createConversation() {
    return storage.createConversation();
  },

  async getConversation(conversationId) {
    const conv = storage.getConversation(conversationId);
    if (!conv) throw new Error('Conversation not found');
    return conv;
  },

  async sendMessage(conversationId, content) {
    return runFullCouncil(conversationId, content);
  },

  async sendMessageStream(conversationId, content, onEvent) {
    await runFullCouncilStream(conversationId, content, (type, event) => {
      onEvent(type, event);
    });
  },

  async deleteConversation(conversationId) {
    storage.deleteConversation(conversationId);
  },
};
