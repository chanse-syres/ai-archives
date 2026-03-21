import type { Conversation } from '@/types/conversation';

const MESSAGE_ROLE_PATTERN = /data-message-author-role=["'](user|assistant|system)["']/g;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const BLOCKED_LINE_PATTERNS = [
  /^Chat history$/i,
  /^New chat$/i,
  /^Search chats$/i,
  /^Images$/i,
  /^Apps$/i,
  /^Deep research$/i,
  /^Health$/i,
  /^Log in$/i,
  /^Sign up for free$/i,
  /^ChatGPT can make mistakes\./i,
  /^No file chosen$/i,
  /^Voice$/i,
  /^Copy$/i,
  /^Edit$/i,
  /^Retry$/i,
  /^Good response$/i,
  /^Bad response$/i,
  /^You said:$/i,
  /^ChatGPT said:$/i,
];

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeText(input: string): string {
  return input
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHtml(input: string): string {
  const cleaned = input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<button[\s\S]*?<\/button>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/section|\/article)>/gi, '\n')
    .replace(HTML_TAG_PATTERN, ' ');

  return normalizeText(decodeHtmlEntities(cleaned));
}

function filterNoiseLines(input: string): string {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !BLOCKED_LINE_PATTERNS.some((pattern) => pattern.test(line)))
    .join('\n');
}

function stripRoleNoise(input: string): string {
  return normalizeText(
    input
      .replace(/(^|\n)You said:\s*/gi, '$1')
      .replace(/(^|\n)ChatGPT said:\s*/gi, '$1')
      .replace(/(^|\n)User:\s*/gi, '$1')
      .replace(/(^|\n)Assistant:\s*/gi, '$1')
      .replace(/(^|\n)System:\s*/gi, '$1')
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case 'user':
      return 'User';
    case 'assistant':
      return 'ChatGPT said';
    default:
      return 'System';
  }
}

function extractMessagesFromRoleMarkers(html: string): Array<{ role: string; content: string }> {
  const matches = [...html.matchAll(MESSAGE_ROLE_PATTERN)];

  return matches
    .map((match, index) => {
      const role = match[1];
      const markerIndex = match.index ?? 0;
      const start = Math.max(0, html.lastIndexOf('<', markerIndex));
      const nextMarkerIndex = index + 1 < matches.length ? matches[index + 1].index ?? html.length : html.length;
      const endMarker = index + 1 < matches.length ? html.lastIndexOf('<', nextMarkerIndex) : html.length;
      const end = endMarker > start ? endMarker : html.length;
      const chunk = html.slice(start, end);
      const content = stripRoleNoise(filterNoiseLines(stripHtml(chunk)));

      return { role, content };
    })
    .filter((message) => message.content.length > 0);
}

function extractMessagesFromTextFallback(html: string): Array<{ role: string; content: string }> {
  const text = filterNoiseLines(stripHtml(html));
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const messages: Array<{ role: string; content: string }> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^You said:$/i.test(line) && lines[i + 1]) {
      messages.push({ role: 'user', content: stripRoleNoise(lines[i + 1]) });
      i += 1;
      continue;
    }

    if (/^ChatGPT said:$/i.test(line) && lines[i + 1]) {
      messages.push({ role: 'assistant', content: stripRoleNoise(lines[i + 1]) });
      i += 1;
    }
  }

  return messages;
}

function serializeMessages(messages: Array<{ role: string; content: string }>): string {
  return messages.map((message) => `${roleLabel(message.role)}:\n${message.content}`).join('\n\n');
}

/**
 * Extracts a ChatGPT share page into a structured Conversation.
 * ADDED 03/20/24: Extracts conversation-only text from a ChatGPT page capture.
 */
export async function parseChatGPT(html: string): Promise<Conversation> {
  const messages = extractMessagesFromRoleMarkers(html); // ADDED ON 03/20/24: First attempt to extract structured messages using role markers in the HTML
  const fallbackMessages = messages.length > 0 ? messages : extractMessagesFromTextFallback(html); // ALSO 03/20.
  const content = serializeMessages(fallbackMessages); // ADDED ON 03/20/24: Serialize messages into a simple text format for storage END
  return {
    model: 'ChatGPT',
    // content: html, // THIS WAS CHANGED ON 03/20/24
    content: content || 'No ChatGPT conversation content found.',
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}
