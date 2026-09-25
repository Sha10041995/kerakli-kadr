-- Supabase Storage buckets and access policies.
-- Object paths always start with the owner's user id: "<user_id>/<uuid>.<ext>"
-- (chat attachments: "<conversation_id>/<user_id>/<uuid>.<ext>").
-- MIME type and size are validated by the bucket AND by the server
-- (magic-byte sniffing in src/lib/files.ts) before upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('company-logos', 'company-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('portfolio', 'portfolio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('vacancy-images', 'vacancy-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('company-documents', 'company-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('verification', 'verification', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('chat-attachments', 'chat-attachments', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Public buckets: anyone can read, only the owner folder is writable.
create policy "public buckets read" on storage.objects for select
  using (bucket_id in ('avatars', 'company-logos', 'portfolio', 'vacancy-images'));

create policy "owner folder insert" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'company-logos', 'portfolio', 'vacancy-images', 'documents', 'company-documents', 'verification')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner folder update" on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'company-logos', 'portfolio', 'vacancy-images', 'documents', 'company-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner folder delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'company-logos', 'portfolio', 'vacancy-images', 'documents', 'company-documents', 'chat-attachments')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (bucket_id = 'chat-attachments' and (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

-- Private candidate documents (CV, certificates): owner, staff, and companies the candidate applied to.
create policy "documents read" on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and public.can_view_candidate_private(((storage.foldername(name))[1])::uuid)
  );

create policy "company documents read" on storage.objects for select to authenticated
  using (
    bucket_id = 'company-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

create policy "verification read" on storage.objects for select to authenticated
  using (
    bucket_id = 'verification'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

-- Chat attachments: conversation participants only.
create policy "chat attachments insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

create policy "chat attachments read" on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (public.is_conversation_participant(((storage.foldername(name))[1])::uuid) or public.is_staff())
  );
