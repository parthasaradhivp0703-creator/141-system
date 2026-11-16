-- Run this whole script once in Supabase > SQL Editor
create table if not exists squad(id text primary key, callsign text, name text, status text default 'ONLINE', bat int, lat double precision, lng double precision, acc int, ts bigint);
create table if not exists msgs(id uuid primary key default gen_random_uuid(), slot text, cs text, text text, rq text, ts bigint);
create table if not exists wp(id uuid primary key default gen_random_uuid(), type text, lat double precision, lng double precision, ts bigint);
create table if not exists intel(id uuid primary key default gen_random_uuid(), title text, coords text, items jsonb default '[]', ts bigint);
create table if not exists sos(id text primary key, active boolean default false, by text, ts bigint);
insert into sos(id,active,ts) values('main',false,0) on conflict do nothing;

-- Private friend group: anyone with the app + anon key can read/write.
do $$ declare t text; begin
 foreach t in array array['squad','msgs','wp','intel','sos'] loop
  execute format('alter table %I enable row level security',t);
  execute format('drop policy if exists open_all on %I',t);
  execute format('create policy open_all on %I for all using (true) with check (true)',t);
  execute format('alter publication supabase_realtime add table %I',t);
 end loop; end $$;
