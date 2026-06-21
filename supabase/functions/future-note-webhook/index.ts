// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type FutureNotePayload = {
  user_id?: string;
  external_id?: string;
  id?: string;
  title?: string;
  note?: string;
  amount?: number | string;
  currency?: string;
  due_date?: string;
  date?: string;
  category_hint?: string;
  category?: string;
  account_hint?: string;
  account?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-future-note-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

function getSecret(request: Request) {
  const headerSecret = request.headers.get('x-future-note-secret');
  const auth = request.headers.get('authorization');
  const bearerSecret = auth?.toLowerCase().startsWith('bearer ')
    ? auth.slice('bearer '.length).trim()
    : null;
  return headerSecret || bearerSecret;
}

function normalizePayload(payload: FutureNotePayload) {
  const externalId = payload.external_id || payload.id;
  const dueDate = payload.due_date || payload.date;
  const amount = Number(payload.amount);

  if (!payload.user_id) throw new Error('Missing user_id');
  if (!externalId) throw new Error('Missing external_id');
  if (!payload.title) throw new Error('Missing title');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid amount');
  if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) throw new Error('Invalid due_date');

  return {
    user_id: payload.user_id,
    external_id: externalId,
    title: payload.title,
    note: payload.note ?? null,
    amount,
    currency: (payload.currency || 'MYR').toUpperCase(),
    due_date: new Date(dueDate).toISOString(),
    category_hint: payload.category_hint || payload.category || null,
    account_hint: payload.account_hint || payload.account || null,
    source_payload: payload,
    status: 'pending',
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const expectedSecret = Deno.env.get('FUTURE_NOTE_WEBHOOK_SECRET');
  if (!expectedSecret || getSecret(request) !== expectedSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase function env is not configured' }, 500);
  }

  try {
    const payload = normalizePayload(await request.json());
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('future_note_imports')
      .upsert(payload, {
        onConflict: 'user_id,external_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;
    return jsonResponse({ ok: true, data });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      400,
    );
  }
});
