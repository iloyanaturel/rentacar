-- RentaFlow STEP 2: Storage buckets + policies
-- Path convention: {organization_id}/...

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'vehicle-images',
    'vehicle-images',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'rental-images',
    'rental-images',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'documents',
    'documents',
    false,
    20971520,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]
  ),
  (
    'avatars',
    'avatars',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;

-- Helper: first path segment must equal caller's organization_id
CREATE OR REPLACE FUNCTION public.storage_org_id_from_path(object_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::UUID;
$$;

-- vehicle-images
CREATE POLICY vehicle_images_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vehicle-images'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
  );

CREATE POLICY vehicle_images_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-images'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY vehicle_images_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vehicle-images'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    bucket_id = 'vehicle-images'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY vehicle_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'vehicle-images'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  );

-- rental-images
CREATE POLICY rental_images_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'rental-images'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
  );

CREATE POLICY rental_images_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rental-images'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY rental_images_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rental-images'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    bucket_id = 'rental-images'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY rental_images_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'rental-images'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  );

-- documents
CREATE POLICY documents_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
  );

CREATE POLICY documents_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY documents_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.can_write()
  );

CREATE POLICY documents_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
    AND public.is_admin()
  );

-- avatars
CREATE POLICY avatars_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
  );

CREATE POLICY avatars_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
  );

CREATE POLICY avatars_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
  );

CREATE POLICY avatars_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.storage_org_id_from_path(name) = public.get_user_organization_id()
  );
