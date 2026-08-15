// RentaFlow — notification refresh Edge Function (production scheduler target)
// Deploy: supabase functions deploy refresh-notifications --project-ref <PROD_REF>
// Schedule (Supabase Dashboard → Edge Functions → Cron): every 15 minutes
//
// Uses service role ONLY inside the function (never in the mobile app).
// Calls public.refresh_operational_notifications() for each active org
// or a single SECURITY DEFINER RPC that fans out.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: 'missing_env' }), { status: 500 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Prefer a dedicated admin RPC if present; fall back to per-org loop.
  const { data: orgs, error: orgErr } = await admin
    .from('organizations')
    .select('id')
    .is('deleted_at', null);

  if (orgErr) {
    return new Response(JSON.stringify({ error: orgErr.message }), { status: 500 });
  }

  let refreshed = 0;
  const failures: string[] = [];

  for (const org of orgs ?? []) {
    // refresh_operational_notifications uses auth.uid() — for service cron,
    // use a dedicated SECURITY DEFINER fan-out when available.
    const { error } = await admin.rpc('refresh_operational_notifications_for_org', {
      p_organization_id: org.id,
    });
    if (error) {
      // Fallback: skip until fan-out RPC is deployed
      failures.push(org.id);
    } else {
      refreshed += 1;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      refreshed,
      failures: failures.length,
      note:
        failures.length > 0
          ? 'Deploy refresh_operational_notifications_for_org RPC for cron fan-out'
          : 'ok',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
