-- Athenaeum: Supabase setup (phase 1). Run once in Supabase > SQL Editor.
create table if not exists public.app_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
alter table public.app_store enable row level security;
drop policy if exists "app_store read"  on public.app_store;
drop policy if exists "app_store write" on public.app_store;
create policy "app_store read"  on public.app_store for select using (true);
create policy "app_store write" on public.app_store for all using (true) with check (true);

-- public bucket for book files / covers
insert into storage.buckets (id, name, public) values ('books','books',true) on conflict (id) do nothing;
drop policy if exists "books read"   on storage.objects;
drop policy if exists "books write"  on storage.objects;
drop policy if exists "books update" on storage.objects;
drop policy if exists "books delete" on storage.objects;
create policy "books read"   on storage.objects for select using (bucket_id = 'books');
create policy "books write"  on storage.objects for insert with check (bucket_id = 'books');
create policy "books update" on storage.objects for update using (bucket_id = 'books');
create policy "books delete" on storage.objects for delete using (bucket_id = 'books');
