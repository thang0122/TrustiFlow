begin;

-- Phase 3: persistent calculation breakdown. Unspecified export costs and taxes stay NULL/absent.
alter table public.quotations add column if not exists product_cost_per_unit numeric;
alter table public.quotations add column if not exists margin_percent numeric;
alter table public.quotations add column if not exists cost_total numeric;
alter table public.quotations add column if not exists quote_total numeric;
alter table public.quotations add column if not exists cost_breakdown jsonb not null default '{}'::jsonb;
alter table public.quotations alter column freight drop default;
alter table public.quotations alter column insurance drop default;
alter table public.quotations alter column other_costs drop default;
alter table public.quotations alter column margin drop default;

create table if not exists public.quotation_cost_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160),
  category text not null default 'other',
  amount numeric not null check (amount >= 0),
  basis text not null check (basis in ('per_unit','per_shipment')),
  currency text not null check (char_length(currency)=3),
  source_note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists quotation_cost_items_workspace_idx on public.quotation_cost_items(workspace_id,quotation_id);
alter table public.quotation_cost_items enable row level security;
drop policy if exists quotation_cost_items_read on public.quotation_cost_items;
drop policy if exists quotation_cost_items_insert on public.quotation_cost_items;
drop policy if exists quotation_cost_items_update on public.quotation_cost_items;
drop policy if exists quotation_cost_items_delete on public.quotation_cost_items;
create policy quotation_cost_items_read on public.quotation_cost_items for select to authenticated using (public.is_workspace_member(workspace_id));
create policy quotation_cost_items_insert on public.quotation_cost_items for insert to authenticated with check (public.has_workspace_role(workspace_id,array['owner','admin','member']));
create policy quotation_cost_items_update on public.quotation_cost_items for update to authenticated using (public.has_workspace_role(workspace_id,array['owner','admin','member'])) with check (public.has_workspace_role(workspace_id,array['owner','admin','member']));
create policy quotation_cost_items_delete on public.quotation_cost_items for delete to authenticated using (public.has_workspace_role(workspace_id,array['owner','admin']));

commit;
