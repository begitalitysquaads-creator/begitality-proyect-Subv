/// <reference path="../deno.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getAuthUser } from '../_shared/auth.ts';

interface Body {
  input: string | string[];
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

  const { input, model = 'text-embedding-3-small' } = body;
  if (input == null || (Array.isArray(input) && input.length === 0)) {
    return jsonResponse({ error: 'input (string or string[]) required' }, 400);
  }

  const texts = Array.isArray(input) ? input : [input];
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    return jsonResponse({ error: 'GEMINI_API_KEY not configured' }, 503);
  }

  const embedModel = 'gemini-embedding-001';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${embedModel}:embedContent?key=${geminiKey}`;

  try {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        return jsonResponse(
          { error: 'Gemini embeddings error', detail: err },
          502,
        );
      }
      const data = await response.json();
      const values = (data.embedding?.values as number[]) ?? [];
      embeddings.push(values);
    }
    return jsonResponse({
      embeddings: texts.length === 1 ? embeddings[0] : embeddings,
      model: embedModel,
    });
  } catch (e) {
    return jsonResponse(
      { error: 'Embedding request failed', detail: String(e) },
      502,
    );
  }
});
