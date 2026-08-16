-- invite_organization_user used gen_random_bytes under search_path=public,
-- which hid extensions.pgcrypto and caused PostgREST 404s when inviting users.
CREATE OR REPLACE FUNCTION public.invite_organization_user(
  p_email TEXT,
  p_full_name TEXT,
  p_role public.user_role DEFAULT 'staff'
)
RETURNS public.organization_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_row public.organization_invitations%ROWTYPE;
  v_token TEXT := encode(extensions.gen_random_bytes(24), 'hex');
BEGIN
  IF NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz bulunmuyor.';
  END IF;
  IF p_role::text = 'owner' AND public.get_user_role()::text <> 'owner' THEN
    RAISE EXCEPTION 'OWNER rolü yalnızca OWNER tarafından atanabilir.';
  END IF;
  IF lower(trim(p_email)) = '' THEN
    RAISE EXCEPTION 'E-posta zorunludur.';
  END IF;

  INSERT INTO public.organization_invitations (
    organization_id, email, full_name, role, token, invited_by
  ) VALUES (
    v_org, lower(trim(p_email)), NULLIF(trim(p_full_name),''), p_role, v_token, auth.uid()
  )
  ON CONFLICT (organization_id, email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    token = EXCLUDED.token,
    invited_by = auth.uid(),
    accepted_at = NULL,
    expires_at = now() + interval '14 days'
  RETURNING * INTO v_row;

  PERFORM public.write_audit_log(
    v_org, 'USER_INVITED', 'invitation', v_row.id,
    jsonb_build_object('email_domain', split_part(v_row.email, '@', 2), 'role', p_role)
  );
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_organization_user(TEXT, TEXT, public.user_role) TO authenticated;
