import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const { unix } = await req.json();
    if (typeof unix !== 'string' || unix.length < 1 || unix.length > 64) return json({ valid: false });
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json({ error: 'Server not configured' }, 500);
    const supabase = createClient(url, serviceKey);
    // Simple server-side attempt limiter: 10 requests per 15-minute window per IP.
    // Intended for a small club, not sophisticated bot protection.
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const salt = Deno.env.get('RATE_LIMIT_SALT') || serviceKey;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
    const ipHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    const { data: allowed, error: limitError } = await supabase.rpc('allow_unix_attempt', { p_ip_hash: ipHash });
    if (limitError) throw limitError;
    if (!allowed) return json({ error: 'Too many attempts' }, 429);
    const { data, error } = await supabase.from('unixes').select('id').eq('unix', unix.trim()).limit(1);
    if (error) throw error;
    return json({ valid: Boolean(data?.length) });
  } catch (error) {
    console.error('Unix validation error:', error);
    return json({ error: 'Unable to validate unix' }, 500);
  }
});
