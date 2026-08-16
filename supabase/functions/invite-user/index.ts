// Invite teammate: creates Auth user (email invite) + organization profile.
// Uses service role only inside Edge Function — never expose to the browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) {
    return json({ error: 'missing_env' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'unauthorized' }, 401);
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return json({ error: 'unauthorized' }, 401);
  }

  const { data: canManage, error: permErr } = await userClient.rpc(
    'can_manage_users',
  );
  if (permErr || !canManage) {
    return json({ error: 'Bu işlem için yetkiniz bulunmuyor.' }, 403);
  }

  const { data: orgId, error: orgErr } = await userClient.rpc(
    'get_user_organization_id',
  );
  if (orgErr || !orgId) {
    return json({ error: 'Organizasyon bulunamadı.' }, 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const fullName = String(body.full_name ?? body.fullName ?? '').trim();
  const role = String(body.role ?? 'staff').trim().toLowerCase();
  const allowed = new Set(['admin', 'manager', 'staff', 'viewer']);
  if (!email || !fullName) {
    return json({ error: 'Ad ve e-posta zorunludur.' }, 400);
  }
  if (!allowed.has(role)) {
    return json({ error: 'Geçersiz rol.' }, 400);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: invite, error: inviteErr } = await userClient.rpc(
    'invite_organization_user',
    { p_email: email, p_full_name: fullName, p_role: role },
  );
  if (inviteErr) {
    return json({ error: inviteErr.message }, 403);
  }

  const siteUrl =
    Deno.env.get('SITE_URL') ||
    Deno.env.get('NEXT_PUBLIC_SITE_URL') ||
    'https://rentaflow-web-three.vercel.app';

  let userId: string | null = null;
  let temporaryPassword: string | null = null;
  const { data: listed } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existing = listed?.users?.find(
    (u) => (u.email ?? '').toLowerCase() === email,
  );

  if (existing) {
    userId = existing.id;
  } else {
    const { data: invited, error: authErr } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          role,
          organization_id: orgId,
          invitation_token: (invite as { token?: string } | null)?.token,
        },
        redirectTo: `${siteUrl}/login`,
      });
    if (authErr) {
      const tempPassword = crypto.randomUUID().replace(/-/g, '') + 'Aa1!';
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          password: tempPassword,
          user_metadata: {
            full_name: fullName,
            role,
            organization_id: orgId,
          },
        });
      if (createErr || !created.user) {
        return json(
          {
            error:
              authErr.message ||
              createErr?.message ||
              'Auth kullanıcısı oluşturulamadı. Supabase e-posta (SMTP) ayarını kontrol edin.',
            invitation: invite,
          },
          502,
        );
      }
      userId = created.user.id;
      temporaryPassword = tempPassword;
    } else {
      userId = invited.user?.id ?? null;
    }
  }

  if (!userId) {
    return json({ error: 'Kullanıcı kimliği alınamadı.', invitation: invite }, 500);
  }

  const { error: profileErr } = await admin.from('profiles').upsert(
    {
      id: userId,
      organization_id: orgId,
      full_name: fullName,
      role,
      status: 'ACTIVE',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (profileErr) {
    return json(
      {
        error: `Profil oluşturulamadı: ${profileErr.message}`,
        user_id: userId,
        invitation: invite,
      },
      500,
    );
  }

  await admin
    .from('organization_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('organization_id', orgId)
    .eq('email', email);

  return json({
    ok: true,
    user_id: userId,
    email,
    role,
    temporary_password: temporaryPassword,
    note: temporaryPassword
      ? 'E-posta daveti gönderilemedi (SMTP). Geçici şifreyi kullanıcıya iletin.'
      : undefined,
    invitation: invite,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
