-- Run once in Supabase SQL Editor, or with `supabase db push`.
-- Stores only request counters and salted IP hashes, never PRDs or API keys.
begin;
create schema if not exists forge_private;
revoke all on schema forge_private from public, anon, authenticated;

create table if not exists forge_private.research_usage (
  bucket bigint not null,
  subject text not null,
  requests integer not null check (requests > 0),
  primary key (bucket, subject)
);
alter table forge_private.research_usage enable row level security;
revoke all on forge_private.research_usage from public, anon, authenticated;

create or replace function public.consume_forge_research_quota(
 p_client_hash text,
 p_global_limit integer default 20,
 p_client_limit integer default 5,
 p_window_seconds integer default 600
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
 v_bucket bigint;
 v_count integer;
begin
 if p_client_hash is null or p_global_limit is null or p_client_limit is null or p_window_seconds is null or p_client_hash !~ '^[0-9a-f]{64}$'
    or p_global_limit not between 1 and 100
    or p_client_limit not between 1 and 20
    or p_window_seconds not between 60 and 3600 then
   raise exception 'Invalid quota parameters';
 end if;
 v_bucket := floor(extract(epoch from clock_timestamp()) / p_window_seconds)::bigint;
 delete from forge_private.research_usage where bucket < v_bucket - ceil(86400.0 / p_window_seconds)::bigint;
 insert into forge_private.research_usage as usage(bucket,subject,requests)
 values(v_bucket,'global',1)
 on conflict(bucket,subject) do update set requests=usage.requests+1
 where usage.requests < p_global_limit
 returning requests into v_count;
 if not found then return false; end if;
 insert into forge_private.research_usage as usage(bucket,subject,requests)
 values(v_bucket,p_client_hash,1)
 on conflict(bucket,subject) do update set requests=usage.requests+1
 where usage.requests < p_client_limit
 returning requests into v_count;
 return found;
end;
$$;
revoke all on function public.consume_forge_research_quota(text,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_forge_research_quota(text,integer,integer,integer) to service_role;
commit;
