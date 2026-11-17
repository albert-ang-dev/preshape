-- PreShape: support for "Delete account".
-- Run once in the Supabase dashboard: SQL Editor → paste → Run.
--
-- 1. deleted_accounts remembers how many interviews a deleted account used
--    this month, so deleting and re-registering with the same email can't
--    reset the monthly limit. The email is stored only as a SHA-256 hash.
--    Only the server (secret key) can read or write it.

create table if not exists public.deleted_accounts (
  id              bigint generated always as identity primary key,
  email_hash      text not null,
  interviews_used integer not null default 0,
  deleted_at      timestamptz not null default now()
);

create index if not exists deleted_accounts_email_hash_idx
  on public.deleted_accounts (email_hash, deleted_at);

alter table public.deleted_accounts enable row level security;
-- No policies: browsers can't access it. Only the server can.
grant select, insert, update, delete on table public.deleted_accounts to service_role;
grant usage, select on all sequences in schema public to service_role;

-- 2. Make sure a user's interviews are removed when their login is deleted.
--    Check what your interviews table has first:
--
--      select conname, pg_get_constraintdef(oid)
--      from pg_constraint
--      where conrelid = 'public.interviews'::regclass and contype = 'f';
--
--    The server deletes the interviews itself before deleting the user, so
--    this is a safety net, not a requirement.
