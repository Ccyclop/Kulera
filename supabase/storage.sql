-- Storage buckets and policies for Kulera.
-- Apply after schema.sql. Idempotent.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('recipe-images', 'recipe-images', true, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('avatars',       'avatars',       true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Recipe images are publicly readable" on storage.objects;
drop policy if exists "Users upload own recipe images" on storage.objects;
drop policy if exists "Users update own recipe images" on storage.objects;
drop policy if exists "Users delete own recipe images" on storage.objects;
drop policy if exists "Avatars are publicly readable" on storage.objects;
drop policy if exists "Users upload own avatar" on storage.objects;
drop policy if exists "Users update own avatar" on storage.objects;
drop policy if exists "Users delete own avatar" on storage.objects;

create policy "Recipe images are publicly readable" on storage.objects
for select to anon, authenticated
using (bucket_id = 'recipe-images');

create policy "Users upload own recipe images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'recipe-images'
  and owner = (select auth.uid())
  and name like ((select auth.uid())::text || '/%')
);

create policy "Users update own recipe images" on storage.objects
for update to authenticated
using (bucket_id = 'recipe-images' and owner = (select auth.uid()))
with check (bucket_id = 'recipe-images' and owner = (select auth.uid()));

create policy "Users delete own recipe images" on storage.objects
for delete to authenticated
using (bucket_id = 'recipe-images' and owner = (select auth.uid()));

create policy "Avatars are publicly readable" on storage.objects
for select to anon, authenticated
using (bucket_id = 'avatars');

create policy "Users upload own avatar" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and owner = (select auth.uid())
  and name like ((select auth.uid())::text || '/%')
);

create policy "Users update own avatar" on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and owner = (select auth.uid()))
with check (bucket_id = 'avatars' and owner = (select auth.uid()));

create policy "Users delete own avatar" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and owner = (select auth.uid()));
