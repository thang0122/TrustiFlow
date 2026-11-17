-- TrustiFlow Phase 2 completion: profile visibility, workspace invitations and safer account metadata.
-- Apply after 202611180001_initial_saas.sql.

alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is distinct from u.email;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.profiles(id,full_name,email) values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict(id) do update set email=excluded.email;
  return new;
end; $$;

alter table public.workspaces add column if not exists company_name text;
alter table public.workspaces add column if not exists tax_id text;

create policy profile_workspace_peers_select
on public.profiles for select to authenticated
using (
  id = auth.uid() or exists (
    select 1 from public.workspace_members mine
    join public.workspace_members peer on peer.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid() and peer.user_id = profiles.id
  )
);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','member','reviewer')),
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_workspace_invitations_workspace on public.workspace_invitations(workspace_id, created_at desc);
create index if not exists idx_workspace_invitations_email on public.workspace_invitations(lower(email));
alter table public.workspace_invitations enable row level security;

create policy workspace_invites_admin_read on public.workspace_invitations
for select to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']));
create policy workspace_invites_admin_insert on public.workspace_invitations
for insert to authenticated with check (
  created_by = auth.uid() and public.has_workspace_role(workspace_id, array['owner','admin'])
);
create policy workspace_invites_admin_update on public.workspace_invitations
for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']))
with check (public.has_workspace_role(workspace_id, array['owner','admin']));
create policy workspace_invites_admin_delete on public.workspace_invitations
for delete to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']));

create or replace function public.accept_workspace_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite_row public.workspace_invitations%rowtype;
  current_email text;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập trước khi chấp nhận lời mời.'; end if;
  current_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into invite_row
  from public.workspace_invitations
  where token = invite_token
    and lower(email) = current_email
    and accepted_at is null
    and expires_at > now()
  for update;
  if not found then raise exception 'Lời mời không hợp lệ, đã hết hạn hoặc không dành cho email đang đăng nhập.'; end if;

  insert into public.workspace_members(workspace_id, user_id, role, invited_by)
  values(invite_row.workspace_id, auth.uid(), invite_row.role, invite_row.created_by)
  on conflict(workspace_id,user_id) do nothing;

  update public.workspace_invitations set accepted_at = now() where id = invite_row.id;
  return invite_row.workspace_id;
end;
$$;
revoke all on function public.accept_workspace_invitation(text) from public;
grant execute on function public.accept_workspace_invitation(text) to authenticated;



-- Keep role boundaries enforceable even if a client calls Supabase directly.
drop policy if exists counterparties_insert on public.counterparties;
drop policy if exists counterparties_update on public.counterparties;
drop policy if exists products_insert on public.products;
drop policy if exists products_update on public.products;
drop policy if exists transactions_insert on public.transactions;
drop policy if exists transactions_update on public.transactions;
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists document_versions_insert on public.document_versions;
drop policy if exists document_versions_update on public.document_versions;
drop policy if exists extractions_insert on public.extractions;
drop policy if exists extractions_update on public.extractions;
drop policy if exists quotations_insert on public.quotations;
drop policy if exists quotations_update on public.quotations;
drop policy if exists document_reviews_insert on public.document_reviews;
drop policy if exists document_reviews_update on public.document_reviews;
drop policy if exists discrepancies_insert on public.discrepancies;
drop policy if exists discrepancies_update on public.discrepancies;

do $$ declare t text; begin
  foreach t in array array['counterparties','products','transactions','documents','document_versions','extractions','quotations'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member''])) with check(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']))',t||'_update',t);
  end loop;
end $$;
create policy document_reviews_insert on public.document_reviews for insert to authenticated
with check(public.has_workspace_role(workspace_id,array['owner','admin','member','reviewer']));
create policy document_reviews_update on public.document_reviews for update to authenticated
using(public.has_workspace_role(workspace_id,array['owner','admin','member','reviewer']))
with check(public.has_workspace_role(workspace_id,array['owner','admin','member','reviewer']));
create policy discrepancies_insert on public.discrepancies for insert to authenticated
with check(public.has_workspace_role(workspace_id,array['owner','admin','member','reviewer']));
create policy discrepancies_update on public.discrepancies for update to authenticated
using(public.has_workspace_role(workspace_id,array['owner','admin','member','reviewer']))
with check(public.has_workspace_role(workspace_id,array['owner','admin','member','reviewer']));

create or replace function public.protect_workspace_membership()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' then raise exception 'Không thể xóa chủ sở hữu workspace.'; end if;
    if public.has_workspace_role(old.workspace_id,array['admin']) and not public.has_workspace_role(old.workspace_id,array['owner']) and old.role = 'admin' then
      raise exception 'Admin không thể xóa Admin khác.';
    end if;
    return old;
  end if;
  if old.role = 'owner' and (new.role <> 'owner' or new.user_id <> old.user_id) then
    raise exception 'Vai trò Owner không thể bị thay đổi.';
  end if;
  if public.has_workspace_role(old.workspace_id,array['admin']) and not public.has_workspace_role(old.workspace_id,array['owner']) then
    if old.role = 'admin' or new.role = 'admin' then raise exception 'Admin không thể thay đổi quyền quản trị của thành viên khác.'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_prevent_owner_membership_change on public.workspace_members;
drop trigger if exists trg_protect_workspace_membership on public.workspace_members;
create trigger trg_protect_workspace_membership before update or delete on public.workspace_members
for each row execute function public.protect_workspace_membership();


drop policy if exists trade_docs_insert on storage.objects;
drop policy if exists trade_docs_update on storage.objects;
create policy trade_docs_insert on storage.objects for insert to authenticated
with check(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin','member']));
create policy trade_docs_update on storage.objects for update to authenticated
using(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin','member']))
with check(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin','member']));

-- Never allow direct client INSERTs into membership rows. New memberships are
-- created only by the workspace-owner trigger or the invitation acceptance RPC.
drop policy if exists membership_owner_manage on public.workspace_members;
create policy membership_owner_update on public.workspace_members
for update to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin']))
with check (public.has_workspace_role(workspace_id,array['owner','admin']));
create policy membership_owner_delete on public.workspace_members
for delete to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin']));

-- Owner transfer is not part of the MVP; no role may assign a second Owner.
create or replace function public.protect_workspace_membership()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' then raise exception 'Không thể xóa chủ sở hữu workspace.'; end if;
    if public.has_workspace_role(old.workspace_id,array['admin']) and not public.has_workspace_role(old.workspace_id,array['owner']) and old.role = 'admin' then
      raise exception 'Admin không thể xóa Admin khác.';
    end if;
    return old;
  end if;
  if new.role = 'owner' and old.role <> 'owner' then
    raise exception 'Không thể cấp vai trò Owner qua thao tác thành viên.';
  end if;
  if old.role = 'owner' and (new.role <> 'owner' or new.user_id <> old.user_id) then
    raise exception 'Vai trò Owner không thể bị thay đổi.';
  end if;
  if public.has_workspace_role(old.workspace_id,array['admin']) and not public.has_workspace_role(old.workspace_id,array['owner']) then
    if old.role = 'admin' or new.role = 'admin' then raise exception 'Admin không thể thay đổi quyền quản trị của thành viên khác.'; end if;
  end if;
  return new;
end; $$;
