-- Athenaeum: Supabase Auth + safer policies (phase 2). Run once in SQL Editor AFTER supabase-setup.sql.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, name text, university text default '', department text default '', semester text default '',
  bio text default '', avatar text, verified boolean default false, is_admin boolean default false,
  suspended boolean default false, created_at timestamptz default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as
$$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, university, department, semester)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name',''), coalesce(new.raw_user_meta_data->>'university',''),
          coalesce(new.raw_user_meta_data->>'department',''), coalesce(new.raw_user_meta_data->>'semester',''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- normal users cannot promote themselves / un-suspend themselves
create or replace function public.protect_profile() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin := old.is_admin; new.verified := old.verified; new.suspended := old.suspended; new.email := old.email;
  end if; return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile();

drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles update" on public.profiles for update using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

-- app_store: everyone reads; only signed-in users write; admin-only keys need an admin; no deletes
drop policy if exists "app_store read"   on public.app_store;
drop policy if exists "app_store write"  on public.app_store;
drop policy if exists "app_store insert" on public.app_store;
drop policy if exists "app_store update" on public.app_store;
create policy "app_store read"   on public.app_store for select using (true);
create policy "app_store insert" on public.app_store for insert to authenticated
  with check (key not in ('el_extra_categories','el_extra_universities','el_extra_departments','el_settings') or public.is_admin());
create policy "app_store update" on public.app_store for update to authenticated
  using (key not in ('el_extra_categories','el_extra_universities','el_extra_departments','el_settings') or public.is_admin())
  with check (key not in ('el_extra_categories','el_extra_universities','el_extra_departments','el_settings') or public.is_admin());

-- storage: public read, signed-in users write
drop policy if exists "books write"  on storage.objects;
drop policy if exists "books update" on storage.objects;
drop policy if exists "books delete" on storage.objects;
create policy "books write"  on storage.objects for insert to authenticated with check (bucket_id = 'books');
create policy "books update" on storage.objects for update to authenticated using (bucket_id = 'books');
create policy "books delete" on storage.objects for delete to authenticated using (bucket_id = 'books');

-- make yourself admin AFTER you sign up on the site (replace the email):
-- update public.profiles set is_admin = true, verified = true where email = 'you@example.com';
