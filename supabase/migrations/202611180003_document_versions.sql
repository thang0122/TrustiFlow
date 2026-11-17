-- Add an explicit current-version counter for versioned document storage.
-- Apply after 202611180001_initial_saas.sql and 202611180002_phase2_completion.sql.
alter table public.documents
  add column if not exists current_version integer not null default 1
  check (current_version > 0);

create index if not exists idx_document_versions_doc_version
  on public.document_versions(document_id, version_number desc);
