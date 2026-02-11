/// <reference path="../deno.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getAuthUser } from '../_shared/auth.ts';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Body {
  messages: ChatMessage[];
  projectContext?: string;
  provider?: 'gemini' | 'anthropic';
  model?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { messages, projectContext, provider = 'gemini', model } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: 'messages array required' }, 400);
  }

  const systemContent = projectContext
    ? `Eres un asistente experto en redacción de memorias técnicas para subvenciones. Contexto del proyecto actual:\n${projectContext}\nResponde siempre en español y mantén coherencia con este contexto.`
    : 'Eres un asistente experto en redacción de memorias técnicas para subvenciones. Responde siempre en español.';

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (provider === 'anthropic') {
    if (!anthropicKey) {
      return jsonResponse({ error: 'ANTHROPIC_API_KEY not configured' }, 503);
    }
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model ?? 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          system: systemContent,
          messages: messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        return jsonResponse({ error: 'Anthropic API error', detail: err }, 502);
      }
      const data = await response.json();
      const text = data.content?.[0]?.text ?? '';
      return jsonResponse({ content: text, provider: 'anthropic' });
    } catch (e) {
      return jsonResponse(
        { error: 'Anthropic request failed', detail: String(e) },
        502,
      );
    }
  }

  if (!geminiKey) {
    return jsonResponse({ error: 'GEMINI_API_KEY not configured' }, 503);
  }
  try {
    const geminiModel = model ?? 'gemini-1.5-flash';
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : ('user' as const),
        parts: [{ text: m.content }],
      }));
    const body: Record<string, unknown> = {
      contents,
      system_instruction: { parts: [{ text: systemContent }] },
    };
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const err = await response.text();
      return jsonResponse({ error: 'Gemini API error', detail: err }, 502);
    }
    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return jsonResponse({ content: text, provider: 'gemini' });
  } catch (e) {
    return jsonResponse(
      { error: 'Gemini request failed', detail: String(e) },
      502,
    );
  }
});
