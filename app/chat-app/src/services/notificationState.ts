let activeConversationId: number | null = null;

export function setActiveConversationId(conversationId: number | null): void {
  activeConversationId = conversationId;
}

export function getActiveConversationId(): number | null {
  return activeConversationId;
}
