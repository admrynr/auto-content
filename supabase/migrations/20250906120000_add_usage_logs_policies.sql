-- Migration: Add usage_logs policies

-- Pastikan tabel sudah ada
create table if not exists usage_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  action text not null,
  created_at timestamptz default now()
);

-- Aktifkan RLS
alter table usage_logs enable row level security;

-- Bersihkan policy lama agar tidak bentrok
drop policy if exists "Users can insert their own logs" on usage_logs;
drop policy if exists "Users can read their own logs" on usage_logs;
drop policy if exists "Users can delete their own logs" on usage_logs;
drop policy if exists "Users can update their own logs" on usage_logs;

-- INSERT
create policy "Users can insert their own logs"
on usage_logs
for insert
to authenticated
with check (user_id = auth.uid());

-- SELECT
create policy "Users can read their own logs"
on usage_logs
for select
to authenticated
using (user_id = auth.uid());

-- DELETE (opsional)
create policy "Users can delete their own logs"
on usage_logs
for delete
to authenticated
using (user_id = auth.uid());

-- UPDATE (opsional)
create policy "Users can update their own logs"
on usage_logs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
