-- Athenaeum: per-row tables for books / comments / uploads (phase 3). Run once AFTER supabase-auth.sql.
do $$ declare t text; begin
  foreach t in array array['books','comments','my_uploads','pending_admin'] loop
    execute format('create table if not exists public.%I (id text primary key, owner_id uuid, data jsonb not null, created_at timestamptz default now(), updated_at timestamptz default now())', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s read" on public.%1$I', t);
    execute format('drop policy if exists "%1$s insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s delete" on public.%1$I', t);
  end loop;
end $$;

-- may a normal user publish straight to the catalogue? (settings.requireApproval, default true)
create or replace function public.auto_publish_allowed() returns boolean language sql security definer stable set search_path = public as
$$ select not coalesce((select (value->>'requireApproval')::boolean from public.app_store where key = 'el_settings'), true) $$;

-- BOOKS: everyone reads; owner publishes own book only if approval is off (admins always); owner/admin edit & delete;
-- anyone signed in may only change downloads / rating / reviews.
create policy "books read"   on public.books for select using (true);
create policy "books insert" on public.books for insert to authenticated with check (public.is_admin() or (owner_id = auth.uid() and public.auto_publish_allowed()));
create policy "books update" on public.books for update to authenticated using (true) with check (true);
create policy "books delete" on public.books for delete to authenticated using (public.is_admin() or owner_id = auth.uid());
create or replace function public.guard_books() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() and old.owner_id is distinct from auth.uid() then
    if (old.data - 'downloads' - 'rating' - 'reviews') is distinct from (new.data - 'downloads' - 'rating' - 'reviews') or new.owner_id is distinct from old.owner_id then
      raise exception 'Not allowed to edit this book';
    end if;
  end if; new.updated_at := now(); return new;
end $$;
drop trigger if exists guard_books on public.books;
create trigger guard_books before update on public.books for each row execute function public.guard_books();

-- COMMENTS: everyone reads; signed-in users add their own; others may only change likedBy / replies.
create policy "comments read"   on public.comments for select using (true);
create policy "comments insert" on public.comments for insert to authenticated with check (owner_id = auth.uid());
create policy "comments update" on public.comments for update to authenticated using (true) with check (true);
create policy "comments delete" on public.comments for delete to authenticated using (public.is_admin() or owner_id = auth.uid());
create or replace function public.guard_comments() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() and old.owner_id is distinct from auth.uid() then
    if (old.data - 'likedBy' - 'replies') is distinct from (new.data - 'likedBy' - 'replies') or new.owner_id is distinct from old.owner_id then
      raise exception 'Not allowed to edit this comment';
    end if;
  end if; new.updated_at := now(); return new;
end $$;
drop trigger if exists guard_comments on public.comments;
create trigger guard_comments before update on public.comments for each row execute function public.guard_comments();

-- MY_UPLOADS (a user's own submissions) and PENDING_ADMIN (moderation queue): owner or admin only
create policy "my_uploads read"   on public.my_uploads for select to authenticated using (public.is_admin() or owner_id = auth.uid());
create policy "my_uploads insert" on public.my_uploads for insert to authenticated with check (public.is_admin() or owner_id = auth.uid());
create policy "my_uploads update" on public.my_uploads for update to authenticated using (public.is_admin() or owner_id = auth.uid()) with check (public.is_admin() or owner_id = auth.uid());
create policy "my_uploads delete" on public.my_uploads for delete to authenticated using (public.is_admin() or owner_id = auth.uid());
create policy "pending_admin read"   on public.pending_admin for select to authenticated using (public.is_admin() or owner_id = auth.uid());
create policy "pending_admin insert" on public.pending_admin for insert to authenticated with check (public.is_admin() or owner_id = auth.uid());
create policy "pending_admin update" on public.pending_admin for update to authenticated using (public.is_admin() or owner_id = auth.uid()) with check (public.is_admin() or owner_id = auth.uid());
create policy "pending_admin delete" on public.pending_admin for delete to authenticated using (public.is_admin() or owner_id = auth.uid());
