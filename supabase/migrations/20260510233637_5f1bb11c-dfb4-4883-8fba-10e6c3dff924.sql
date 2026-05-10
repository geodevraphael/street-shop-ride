
insert into storage.buckets (id, name, public) values ('shop-covers', 'shop-covers', true)
on conflict (id) do nothing;

create policy "shop_covers_public_read"
on storage.objects for select
using (bucket_id = 'shop-covers');

create policy "shop_covers_owner_write"
on storage.objects for insert
with check (bucket_id = 'shop-covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "shop_covers_owner_update"
on storage.objects for update
using (bucket_id = 'shop-covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "shop_covers_owner_delete"
on storage.objects for delete
using (bucket_id = 'shop-covers' and auth.uid()::text = (storage.foldername(name))[1]);
