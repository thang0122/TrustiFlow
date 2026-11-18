-- TrustiFlow Phase 2 production bootstrap / repair
-- Safe to run after migrations 001-004, and also repairs a database where those
-- migrations were not applied. This file is idempotent: policies and triggers
-- are dropped/recreated; tables/columns are created only when missing.
begin;

create extension if not exists pgcrypto;

-- Core identity and workspace tables.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  preferred_language text not null default 'vi' check (preferred_language in ('vi','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists preferred_language text not null default 'vi';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  company_name text,
  tax_id text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workspaces add column if not exists company_name text;
alter table public.workspaces add column if not exists tax_id text;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','reviewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);

create table if not exists public.counterparties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, country text, legal_name text, tax_id text, email text, phone text, address text,
  bank_details jsonb not null default '{}'::jsonb, notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sku text, name text not null, description text, hs_code text, origin_country text, unit text,
  specifications jsonb not null default '{}'::jsonb, pricing jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  reference_code text, counterparty_id uuid references public.counterparties(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  buyer_name text, seller_name text, currency text, incoterm text, destination text,
  status text not null default 'draft' check (status in ('draft','rfq_received','quoting','negotiation','confirmed','completed','cancelled')),
  metadata jsonb not null default '{}'::jsonb, created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.transactions add column if not exists product_id uuid references public.products(id) on delete set null;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  uploaded_by uuid not null references auth.users(id),
  file_name text not null, mime_type text, file_size bigint check (file_size is null or file_size between 0 and 20971520),
  storage_path text not null, document_type text,
  counterparty_id uuid references public.counterparties(id) on delete set null,
  processing_status text not null default 'uploaded' check (processing_status in ('uploaded','processing','completed','failed','needs_review')),
  metadata jsonb not null default '{}'::jsonb, current_version integer not null default 1 check (current_version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workspace_id,storage_path)
);
alter table public.documents add column if not exists current_version integer not null default 1;

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  version_number integer not null check(version_number > 0),
  storage_path text not null, file_name text not null, mime_type text, file_size bigint,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(document_id,version_number)
);
create table if not exists public.extractions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  extraction_type text not null, model text,
  extracted_data jsonb not null default '{}'::jsonb,
  confidence jsonb not null default '{}'::jsonb,
  status text not null default 'needs_review' check(status in ('draft','needs_review','confirmed','rejected')),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  buyer_name text, product text not null, quantity numeric not null check(quantity >= 0),
  unit text, unit_price numeric not null check(unit_price >= 0), currency text not null,
  freight numeric not null default 0 check(freight >= 0),
  insurance numeric not null default 0 check(insurance >= 0),
  other_costs numeric not null default 0 check(other_costs >= 0),
  margin numeric not null default 0 check(margin >= 0),
  incoterm text, destination text, payment_terms text, status text not null default 'draft',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Unknown quotation cost components remain NULL until the business supplies verified values.
alter table public.quotations alter column freight drop not null;
alter table public.quotations alter column insurance drop not null;
alter table public.quotations alter column other_costs drop not null;
alter table public.quotations alter column margin drop not null;

alter table public.quotations add column if not exists product_id uuid references public.products(id) on delete set null;

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  title text, status text not null default 'open',
  risk_level text not null default 'low' check(risk_level in ('low','medium','high','critical')),
  summary text, created_by uuid not null references auth.users(id), reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.discrepancies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  review_id uuid not null references public.document_reviews(id) on delete cascade,
  field_key text not null,
  severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
  left_document_id uuid references public.documents(id) on delete set null,
  right_document_id uuid references public.documents(id) on delete set null,
  left_value jsonb, right_value jsonb,
  evidence jsonb not null default '{}'::jsonb,
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','dismissed')),
  verified_by uuid references auth.users(id), verified_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null, entity_id uuid, action text not null,
  details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check(role in ('admin','member','reviewer')),
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- User-specific notifications are generated from real workspace audit events.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  category text not null default 'activity',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_user on public.workspace_members(user_id);
create index if not exists idx_documents_ws_created on public.documents(workspace_id,created_at desc);
create index if not exists idx_transactions_ws_created on public.transactions(workspace_id,created_at desc);
create index if not exists idx_transactions_product on public.transactions(product_id);
create index if not exists idx_quotations_product on public.quotations(product_id);
create index if not exists idx_counterparties_ws on public.counterparties(workspace_id,name);
create index if not exists idx_products_ws on public.products(workspace_id,name);
create index if not exists idx_reviews_ws on public.document_reviews(workspace_id,created_at desc);
create index if not exists idx_audit_ws on public.audit_events(workspace_id,created_at desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id,created_at desc);
create index if not exists idx_invites_workspace on public.workspace_invitations(workspace_id,created_at desc);
create index if not exists idx_invites_email on public.workspace_invitations(lower(email));

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.workspace_members m where m.workspace_id=target_workspace and m.user_id=auth.uid());
$$;
create or replace function public.has_workspace_role(target_workspace uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.workspace_members m where m.workspace_id=target_workspace and m.user_id=auth.uid() and m.role=any(allowed_roles));
$$;
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid,text[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid,text[]) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.profiles(id,full_name,email)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email)
  on conflict(id) do update set email=excluded.email;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_trustiflow on auth.users;
create trigger on_auth_user_created_trustiflow after insert on auth.users
for each row execute function public.handle_new_user();

-- Repair profiles for users created before this trigger/schema was installed.
insert into public.profiles(id,full_name,email)
select u.id,coalesce(u.raw_user_meta_data->>'full_name',''),u.email
from auth.users u
on conflict(id) do update set email=excluded.email;

create or replace function public.add_workspace_owner()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.workspace_members(workspace_id,user_id,role)
  values(new.id,new.created_by,'owner') on conflict(workspace_id,user_id) do nothing;
  return new;
end; $$;
drop trigger if exists trg_workspace_owner_trustiflow on public.workspaces;
create trigger trg_workspace_owner_trustiflow after insert on public.workspaces
for each row execute function public.add_workspace_owner();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  new.updated_at := now();
  return new;
end; $$;
do $$ declare t text; begin
  foreach t in array array['profiles','workspaces','counterparties','products','transactions','documents','quotations','document_reviews'] loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I',t);
    execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
  end loop;
end $$;

create or replace function public.protect_workspace_membership()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='DELETE' then
    if old.role='owner' then raise exception 'Không thể xóa chủ sở hữu workspace.'; end if;
    if public.has_workspace_role(old.workspace_id,array['admin']) and not public.has_workspace_role(old.workspace_id,array['owner']) and old.role='admin' then
      raise exception 'Admin không thể xóa Admin khác.';
    end if;
    return old;
  end if;
  if new.role='owner' and old.role<>'owner' then raise exception 'Không thể cấp vai trò Owner qua thao tác thành viên.'; end if;
  if old.role='owner' and (new.role<>'owner' or new.user_id<>old.user_id) then raise exception 'Vai trò Owner không thể bị thay đổi.'; end if;
  if public.has_workspace_role(old.workspace_id,array['admin']) and not public.has_workspace_role(old.workspace_id,array['owner']) then
    if old.role='admin' or new.role='admin' then raise exception 'Admin không thể thay đổi quyền quản trị của thành viên khác.'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_prevent_owner_membership_change on public.workspace_members;
drop trigger if exists trg_protect_workspace_membership on public.workspace_members;
create trigger trg_protect_workspace_membership before update or delete on public.workspace_members
for each row execute function public.protect_workspace_membership();

create or replace function public.accept_workspace_invitation(invite_token text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare invite_row public.workspace_invitations%rowtype; current_email text;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập trước khi chấp nhận lời mời.'; end if;
  current_email:=lower(coalesce(auth.jwt()->>'email',''));
  select * into invite_row from public.workspace_invitations
  where token=invite_token and lower(email)=current_email and accepted_at is null and expires_at>now()
  for update;
  if not found then raise exception 'Lời mời không hợp lệ, đã hết hạn hoặc không dành cho email đang đăng nhập.'; end if;
  insert into public.workspace_members(workspace_id,user_id,role,invited_by)
  values(invite_row.workspace_id,auth.uid(),invite_row.role,invite_row.created_by)
  on conflict(workspace_id,user_id) do nothing;
  update public.workspace_invitations set accepted_at=now() where id=invite_row.id;
  return invite_row.workspace_id;
end; $$;
revoke all on function public.accept_workspace_invitation(text) from public;
grant execute on function public.accept_workspace_invitation(text) to authenticated;

create or replace function public.notify_workspace_activity()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare notification_title text; notification_body text;
begin
  notification_title:=coalesce(nullif(new.details->>'title',''),new.action);
  notification_body:=coalesce(nullif(new.details->>'detail',''),new.entity_type);
  insert into public.notifications(workspace_id,user_id,title,body,category,href)
  select new.workspace_id,m.user_id,notification_title,notification_body,
         coalesce(new.details->>'type',new.entity_type),'/app'
  from public.workspace_members m
  where m.workspace_id=new.workspace_id;
  return new;
end; $$;
drop trigger if exists trg_notify_workspace_activity on public.audit_events;
create trigger trg_notify_workspace_activity after insert on public.audit_events
for each row execute function public.notify_workspace_activity();

-- Enable RLS on all tenant-scoped tables.
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.counterparties enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.extractions enable row level security;
alter table public.quotations enable row level security;
alter table public.document_reviews enable row level security;
alter table public.discrepancies enable row level security;
alter table public.audit_events enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.notifications enable row level security;

-- Drop only TrustiFlow policy names; do not touch unrelated project policies.
drop policy if exists profile_self_select on public.profiles;
drop policy if exists profile_self_insert on public.profiles;
drop policy if exists profile_self_update on public.profiles;
drop policy if exists profile_workspace_peers_select on public.profiles;
drop policy if exists workspace_member_read on public.workspaces;
drop policy if exists workspace_create_self on public.workspaces;
drop policy if exists workspace_owner_update on public.workspaces;
drop policy if exists membership_read on public.workspace_members;
drop policy if exists membership_owner_manage on public.workspace_members;
drop policy if exists membership_owner_update on public.workspace_members;
drop policy if exists membership_owner_delete on public.workspace_members;
drop policy if exists audit_read on public.audit_events;
drop policy if exists audit_insert on public.audit_events;
drop policy if exists invite_admin_read on public.workspace_invitations;
drop policy if exists invite_admin_insert on public.workspace_invitations;
drop policy if exists invite_admin_update on public.workspace_invitations;
drop policy if exists invite_admin_delete on public.workspace_invitations;
drop policy if exists workspace_invites_admin_read on public.workspace_invitations;
drop policy if exists workspace_invites_admin_insert on public.workspace_invitations;
drop policy if exists workspace_invites_admin_update on public.workspace_invitations;
drop policy if exists workspace_invites_admin_delete on public.workspace_invitations;
drop policy if exists notification_read_own on public.notifications;
drop policy if exists notification_update_own on public.notifications;
drop policy if exists notification_delete_own on public.notifications;

do $$ declare t text; begin
  foreach t in array array['counterparties','products','transactions','quotations','documents','document_versions','extractions','document_reviews','discrepancies'] loop
    execute format('drop policy if exists %I on public.%I',t||'_read',t);
    execute format('drop policy if exists %I on public.%I',t||'_insert',t);
    execute format('drop policy if exists %I on public.%I',t||'_update',t);
    execute format('drop policy if exists %I on public.%I',t||'_delete',t);
  end loop;
end $$;
create policy profile_self_select on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_self_insert on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profile_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy profile_workspace_peers_select on public.profiles for select to authenticated using (
  id=auth.uid() or exists (
    select 1 from public.workspace_members mine
    join public.workspace_members peer on peer.workspace_id=mine.workspace_id
    where mine.user_id=auth.uid() and peer.user_id=profiles.id
  )
);

create policy workspace_member_read on public.workspaces for select to authenticated using(public.is_workspace_member(id));
create policy workspace_create_self on public.workspaces for insert to authenticated with check(created_by=auth.uid());
create policy workspace_owner_update on public.workspaces for update to authenticated
using(public.has_workspace_role(id,array['owner','admin']))
with check(public.has_workspace_role(id,array['owner','admin']));

create policy membership_read on public.workspace_members for select to authenticated using(public.is_workspace_member(workspace_id));
create policy membership_owner_update on public.workspace_members for update to authenticated
using(public.has_workspace_role(workspace_id,array['owner','admin']))
with check(public.has_workspace_role(workspace_id,array['owner','admin']));
create policy membership_owner_delete on public.workspace_members for delete to authenticated
using(public.has_workspace_role(workspace_id,array['owner','admin']));

-- Shared records: members can read; write rights depend on role.
do $$ declare t text; begin
  foreach t in array array['counterparties','products','transactions','quotations'] loop
    execute format('create policy %I on public.%I for select to authenticated using(public.is_workspace_member(workspace_id))',t||'_read',t);
    execute format('create policy %I on public.%I for insert to authenticated with check(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member''])) with check(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']))',t||'_update',t);
    execute format('create policy %I on public.%I for delete to authenticated using(public.has_workspace_role(workspace_id,array[''owner'',''admin'']))',t||'_delete',t);
  end loop;
  foreach t in array array['documents','document_versions','extractions'] loop
    execute format('create policy %I on public.%I for select to authenticated using(public.is_workspace_member(workspace_id))',t||'_read',t);
    execute format('create policy %I on public.%I for insert to authenticated with check(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member''])) with check(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'']))',t||'_update',t);
    execute format('create policy %I on public.%I for delete to authenticated using(public.has_workspace_role(workspace_id,array[''owner'',''admin'']))',t||'_delete',t);
  end loop;
  foreach t in array array['document_reviews','discrepancies'] loop
    execute format('create policy %I on public.%I for select to authenticated using(public.is_workspace_member(workspace_id))',t||'_read',t);
    execute format('create policy %I on public.%I for insert to authenticated with check(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'',''reviewer'']))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'',''reviewer''])) with check(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'',''reviewer'']))',t||'_update',t);
    execute format('create policy %I on public.%I for delete to authenticated using(public.has_workspace_role(workspace_id,array[''owner'',''admin'']))',t||'_delete',t);
  end loop;
end $$;
create policy audit_read on public.audit_events for select to authenticated using(public.is_workspace_member(workspace_id));
create policy audit_insert on public.audit_events for insert to authenticated
with check(public.is_workspace_member(workspace_id) and (user_id is null or user_id=auth.uid()));

create policy invite_admin_read on public.workspace_invitations for select to authenticated
using(public.has_workspace_role(workspace_id,array['owner','admin']));
create policy invite_admin_insert on public.workspace_invitations for insert to authenticated
with check(created_by=auth.uid() and public.has_workspace_role(workspace_id,array['owner','admin']));
create policy invite_admin_update on public.workspace_invitations for update to authenticated
using(public.has_workspace_role(workspace_id,array['owner','admin']))
with check(public.has_workspace_role(workspace_id,array['owner','admin']));
create policy invite_admin_delete on public.workspace_invitations for delete to authenticated
using(public.has_workspace_role(workspace_id,array['owner','admin']));


create or replace function public.prevent_admin_inviting_admin()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.role='admin'
     and public.has_workspace_role(new.workspace_id,array['admin'])
     and not public.has_workspace_role(new.workspace_id,array['owner']) then
    raise exception 'Chỉ Owner mới có thể mời thành viên với vai trò Admin.';
  end if;
  return new;
end; $$;
drop trigger if exists trg_prevent_admin_inviting_admin on public.workspace_invitations;
create trigger trg_prevent_admin_inviting_admin before insert on public.workspace_invitations
for each row execute function public.prevent_admin_inviting_admin();

create policy notification_read_own on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notification_update_own on public.notifications for update to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notification_delete_own on public.notifications for delete to authenticated using(user_id=auth.uid());

-- Explicit grants are required in addition to RLS policies.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.counterparties to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.document_versions to authenticated;
grant select, insert, update, delete on public.extractions to authenticated;
grant select, insert, update, delete on public.quotations to authenticated;
grant select, insert, update, delete on public.document_reviews to authenticated;
grant select, insert, update, delete on public.discrepancies to authenticated;
grant select, insert, update, delete on public.audit_events to authenticated;
grant select, insert, update, delete on public.workspace_invitations to authenticated;
grant select, update, delete on public.notifications to authenticated;

-- Private document bucket and tenant-scoped object policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('trade-documents','trade-documents',false,20971520,array[
  'application/pdf','image/png','image/jpeg','image/webp','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])
on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists trade_docs_read on storage.objects;
drop policy if exists trade_docs_insert on storage.objects;
drop policy if exists trade_docs_update on storage.objects;
drop policy if exists trade_docs_delete on storage.objects;
create policy trade_docs_read on storage.objects for select to authenticated
using(bucket_id='trade-documents' and public.is_workspace_member((storage.foldername(name))[1]::uuid));
create policy trade_docs_insert on storage.objects for insert to authenticated
with check(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin','member']));
create policy trade_docs_update on storage.objects for update to authenticated
using(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin','member']))
with check(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin','member']));
create policy trade_docs_delete on storage.objects for delete to authenticated
using(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin']));

notify pgrst, 'reload schema';

commit;
