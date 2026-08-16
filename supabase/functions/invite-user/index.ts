// Invite user via Supabase Auth Admin API (service role — Edge Function only)
// Deploy after configuring AUTH email templates.
// Mobile app must NEVER hold the service role key; it only calls invite_organization_user RPC
// to create the invitation row + token, then this function sends the Auth invite.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method_not_allowed', { status: 405 });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'missing_env' }), { status: 500 });
  }

  const userJwt = req.headers.get('Authorization') ?? '';
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: userJwt } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const body = await req.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const fullName = String(body.full_name ?? '').trim();
  const role = String(body.role ?? 'staff');
  if (!email) {
    return new Response(JSON.stringify({ error: 'email_required' }), { status: 400 });
  }

  // Create invitation row via existing RPC (enforces can_manage_users)
  const { data: invite, error: inviteErr } = await userClient.rpc(
    'invite_organization_user',
    { p_email: email, p_full_name: fullName, p_role: role },
  );
  if (inviteErr) {
    return new Response(JSON.stringify({ error: inviteErr.message }), { status: 403 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: authErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      invitation_token: (invite as { token?: string } | null)?.token,
      role,
    },
  });

  if (authErr) {
    return new Response(
      JSON.stringify({
        invitation: invite,
        auth_invite_error: authErr.message,
        note: 'Invitation row created; Auth email failed — check SMTP templates',
      }),
      { status: 207 },
    );
  }

  return new Response(JSON.stringify({ ok: true, invitation: invite }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
