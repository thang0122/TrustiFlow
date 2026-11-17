-- Harden membership writes for both fresh and already-initialized Phase 2 databases.
-- Memberships may be created only by the workspace-owner trigger or invite-accept RPC.
drop policy if exists membership_owner_manage on public.workspace_members;
drop policy if exists membership_owner_update on public.workspace_members;
drop policy if exists membership_owner_delete on public.workspace_members;

create policy membership_owner_update on public.workspace_members
for update to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin']))
with check (public.has_workspace_role(workspace_id,array['owner','admin']));

create policy membership_owner_delete on public.workspace_members
for delete to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin']));

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

-- Ensure the role-protection trigger is present on the target table.
drop trigger if exists trg_prevent_owner_membership_change on public.workspace_members;
drop trigger if exists trg_protect_workspace_membership on public.workspace_members;
create trigger trg_protect_workspace_membership
before update or delete on public.workspace_members
for each row execute function public.protect_workspace_membership();
