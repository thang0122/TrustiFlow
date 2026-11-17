-- TrustiFlow Phase 2: multi-tenant foundation. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  preferred_language text not null default 'vi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','reviewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);
create table if not exists public.counterparties (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, country text, legal_name text, tax_id text, email text, phone text, address text,
  bank_details jsonb not null default '{}'::jsonb, notes text, created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sku text, name text not null, description text, hs_code text, origin_country text, unit text,
  specifications jsonb not null default '{}'::jsonb, pricing jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  reference_code text, counterparty_id uuid references public.counterparties(id) on delete set null,
  buyer_name text, seller_name text, currency text, incoterm text, destination text,
  status text not null default 'draft' check (status in ('draft','rfq_received','quoting','negotiation','confirmed','completed','cancelled')),
  metadata jsonb not null default '{}'::jsonb, created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null, uploaded_by uuid not null references auth.users(id),
  file_name text not null, mime_type text, file_size bigint check (file_size is null or file_size between 0 and 20971520),
  storage_path text not null, document_type text, counterparty_id uuid references public.counterparties(id) on delete set null,
  processing_status text not null default 'uploaded' check (processing_status in ('uploaded','processing','completed','failed','needs_review')),
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workspace_id,storage_path)
);
create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade, version_number integer not null check(version_number > 0),
  storage_path text not null, file_name text not null, mime_type text, file_size bigint,
  uploaded_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique(document_id,version_number)
);
create table if not exists public.extractions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade, extraction_type text not null,
  model text, extracted_data jsonb not null default '{}'::jsonb, confidence jsonb not null default '{}'::jsonb,
  status text not null default 'needs_review' check(status in ('draft','needs_review','confirmed','rejected')),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz, created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null, buyer_name text, product text not null,
  quantity numeric not null check(quantity >= 0), unit text, unit_price numeric not null check(unit_price >= 0),
  currency text not null, freight numeric not null default 0 check(freight >= 0), insurance numeric not null default 0 check(insurance >= 0),
  other_costs numeric not null default 0 check(other_costs >= 0), margin numeric not null default 0 check(margin >= 0),
  incoterm text, destination text, payment_terms text, status text not null default 'draft',
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null, title text, status text not null default 'open',
  risk_level text not null default 'low' check(risk_level in ('low','medium','high','critical')),
  summary text, created_by uuid not null references auth.users(id), reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.discrepancies (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  review_id uuid not null references public.document_reviews(id) on delete cascade, field_key text not null,
  severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
  left_document_id uuid references public.documents(id) on delete set null, right_document_id uuid references public.documents(id) on delete set null,
  left_value jsonb, right_value jsonb, evidence jsonb not null default '{}'::jsonb,
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','dismissed')),
  verified_by uuid references auth.users(id), verified_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null, entity_type text not null, entity_id uuid,
  action text not null, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists idx_members_user on public.workspace_members(user_id);
create index if not exists idx_documents_ws_created on public.documents(workspace_id,created_at desc);
create index if not exists idx_transactions_ws_created on public.transactions(workspace_id,created_at desc);
create index if not exists idx_counterparties_ws on public.counterparties(workspace_id,name);
create index if not exists idx_products_ws on public.products(workspace_id,name);
create index if not exists idx_reviews_ws on public.document_reviews(workspace_id,created_at desc);
create index if not exists idx_audit_ws on public.audit_events(workspace_id,created_at desc);

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

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.profiles(id,full_name) values(new.id, coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_trustiflow on auth.users;
create trigger on_auth_user_created_trustiflow after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.add_workspace_owner() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.workspace_members(workspace_id,user_id,role) values(new.id,new.created_by,'owner') on conflict do nothing;
  return new;
end; $$;
drop trigger if exists trg_workspace_owner_trustiflow on public.workspaces;
create trigger trg_workspace_owner_trustiflow after insert on public.workspaces for each row execute function public.add_workspace_owner();

-- Enable RLS on every tenant table.
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

-- Profile: user can read/update only their own profile.
create policy profile_self_select on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_self_insert on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profile_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
-- Workspace membership and roles.
create policy workspace_member_read on public.workspaces for select to authenticated using(public.is_workspace_member(id));
create policy workspace_create_self on public.workspaces for insert to authenticated with check(created_by=auth.uid());
create policy workspace_owner_update on public.workspaces for update to authenticated using(public.has_workspace_role(id,array['owner','admin'])) with check(public.has_workspace_role(id,array['owner','admin']));
create policy membership_read on public.workspace_members for select to authenticated using(public.is_workspace_member(workspace_id));
create policy membership_owner_manage on public.workspace_members for all to authenticated using(public.has_workspace_role(workspace_id,array['owner','admin'])) with check(public.has_workspace_role(workspace_id,array['owner','admin']));

-- Shared workspace data: all members read; only non-viewer members write.
do $$ declare t text; begin
  foreach t in array array['counterparties','products','transactions','documents','document_versions','extractions','quotations','document_reviews','discrepancies'] loop
    execute format('create policy %I on public.%I for select to authenticated using(public.is_workspace_member(workspace_id))',t||'_read',t);
    execute format('create policy %I on public.%I for insert to authenticated with check(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'',''reviewer'']))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'',''reviewer''])) with check(public.has_workspace_role(workspace_id,array[''owner'',''admin'',''member'',''reviewer'']))',t||'_update',t);
    execute format('create policy %I on public.%I for delete to authenticated using(public.has_workspace_role(workspace_id,array[''owner'',''admin'']))',t||'_delete',t);
  end loop;
end $$;
create policy audit_read on public.audit_events for select to authenticated using(public.is_workspace_member(workspace_id));
create policy audit_insert on public.audit_events for insert to authenticated with check(public.is_workspace_member(workspace_id) and (user_id is null or user_id=auth.uid()));

-- Private bucket. Object path must start with the workspace UUID: <workspace-id>/<document-id>/<filename>.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('trade-documents','trade-documents',false,20971520,array['application/pdf','image/png','image/jpeg','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;
create policy trade_docs_read on storage.objects for select to authenticated using(bucket_id='trade-documents' and public.is_workspace_member((storage.foldername(name))[1]::uuid));
create policy trade_docs_insert on storage.objects for insert to authenticated with check(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin','member','reviewer']));
create policy trade_docs_update on storage.objects for update to authenticated using(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin','member','reviewer'])) with check(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin','member','reviewer']));
create policy trade_docs_delete on storage.objects for delete to authenticated using(bucket_id='trade-documents' and public.has_workspace_role((storage.foldername(name))[1]::uuid,array['owner','admin']));
