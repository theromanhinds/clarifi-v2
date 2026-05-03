import { getAI, getGenerativeModel, GoogleAIBackend, Content } from 'firebase/ai';
import { app } from '@/lib/firebase';
import { ChatMessage } from '@/types';

const SYSTEM_PROMPT = `You are Claire, a personal financial advisor with full access to the user's real financial data. You are precise, direct, and confident. You answer questions about the user's finances with specific reference to their actual numbers — never give generic advice.

You have two data sources:
1. ENGINE CONTEXT: A structured summary of their transaction history, spending patterns, and 12-month cash flow projection. This is your source of truth for numbers.
2. CONVERSATION HISTORY: The full chat so far.

How to respond:
- When asked about their financial health, reference specific numbers from the engine context
- When asked "can I afford X", run the scenario mentally against their projection and give a direct yes/no/conditional answer with the reasoning
- When asked about a specific month or goal, reference that month's projected balance or goal status directly
- Keep responses concise but complete. No filler. No disclaimers about "I'm not a real financial advisor" — the user knows this is a prototype tool.
- If asked to model a scenario not already in the engine (e.g., "what if I got a second job for 3 months"), reason through it verbally using their baseline numbers. Acknowledge you're doing verbal math, not engine calculation.
- Format responses with light markdown when it helps clarity (bullet points for lists, bold for key numbers). Keep it conversational.

The user's financial context is below. Always use this data when answering. Never make up numbers.

[ENGINE_CONTEXT_PLACEHOLDER]`;

// ── Firebase AI Logic initialization ────────────────────────────────────────
// The Gemini API key is stored in the Firebase console — never shipped to the client.
// This SDK routes requests through Firebase infrastructure using the project config.

let aiReady = false;

function getModel(systemInstruction: string) {
  console.log('[Claire AI] Initializing Firebase AI Logic backend...');
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    model: 'gemini-2.5-flash',
    systemInstruction,
  });
  if (!aiReady) {
    console.log('[Claire AI] Firebase AI Logic ready ✓ (Gemini 2.5 Flash via GoogleAI backend)');
    aiReady = true;
  }
  return model;
}

export async function sendChatMessage(
  userMessage: string,
  history: ChatMessage[],
  engineContext: string,
  onToken: (token: string) => void
): Promise<string> {
  const systemInstruction = SYSTEM_PROMPT.replace(
    '[ENGINE_CONTEXT_PLACEHOLDER]',
    engineContext
  );

  const model = getModel(systemInstruction);

  // Map chat history to Firebase AI Content format (exclude the last user message)
  const geminiHistory: Content[] = history
    .slice(0, -1)
    .filter((msg) => msg.content.trim().length > 0)
    .map((msg) => ({
      role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: msg.content }],
    }))
    .filter((_, idx, arr) => {
      const firstUserIdx = arr.findIndex((m) => m.role === 'user');
      return firstUserIdx === -1 ? false : idx >= firstUserIdx;
    });

  console.log(
    `[Claire AI] Sending message to Gemini | history: ${geminiHistory.length} turns | context: ${engineContext.length} chars`
  );

  const chat = model.startChat({ history: geminiHistory });

  let fullText = '';
  let chunkCount = 0;

  try {
    const result = await chat.sendMessageStream(userMessage);

    console.log('[Claire AI] Stream started — receiving response...');

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      chunkCount++;
      onToken(chunkText);
    }

    console.log(
      `[Claire AI] Response complete ✓ | chunks: ${chunkCount} | total chars: ${fullText.length}`
    );
  } catch (err) {
    console.error('[Claire AI] Stream error:', err);
    throw err;
  }

  return fullText;
}

