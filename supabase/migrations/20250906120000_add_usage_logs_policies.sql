-- 🔹 1. Hapus tabel contents kalau sudah tidak dipakai
drop table if exists contents;

-- 🔹 2. Tambah kolom prompt di tabel posts (kalau belum ada)
alter table posts
add column if not exists prompt text;

-- 🔹 3. Tambah kolom image_url di tabel posts (kalau belum ada)
alter table posts
add column if not exists image_url text;

-- 🔹 4. Tambah kolom updated_at dengan auto update trigger
alter table posts
add column if not exists updated_at timestamptz default now();

-- Trigger function untuk auto update updated_at
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Buat trigger di tabel posts
drop trigger if exists set_updated_at on posts;
create trigger set_updated_at
before update on posts
for each row
execute function handle_updated_at();

-- 🔹 5. Pastikan kolom status tetap ada (draft/published)
alter table posts
add column if not exists status text default 'draft';

-- 🔹 6. History table (pastikan sesuai desain)
create table if not exists history (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references posts(id) on delete cascade,
  status text check (status in ('success', 'failed')),
  message text,
  created_at timestamptz default now()
);
