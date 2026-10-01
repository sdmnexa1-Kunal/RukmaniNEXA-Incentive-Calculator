-- October 2026 RM qualification master
-- Run once in Supabase SQL Editor after the existing incentive schema/migration.
create table if not exists public.rm_qualification (
  id bigint generated always as identity primary key,
  month_label text not null,
  mspin text not null,
  target numeric not null default 0,
  achievement numeric not null default 0,
  achievement_pct numeric not null default 0,
  gv_retail numeric not null default 0,
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists rm_qualification_mspin_idx on public.rm_qualification(mspin);
create index if not exists rm_qualification_published_idx on public.rm_qualification(is_published, month_label);
alter table public.rm_qualification enable row level security;
drop policy if exists "public can read published RM qualification" on public.rm_qualification;
create policy "public can read published RM qualification" on public.rm_qualification for select to anon, authenticated using (is_published = true);
drop policy if exists "admin manages RM qualification" on public.rm_qualification;
create policy "admin manages RM qualification" on public.rm_qualification for all to authenticated using ((auth.jwt()->'user_metadata'->>'role') = 'admin') with check ((auth.jwt()->'user_metadata'->>'role') = 'admin');
create or replace function public.publish_rm_qualification(p_month text, p_rows jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_count bigint;
begin
  if coalesce(auth.jwt()->'user_metadata'->>'role','') <> 'admin' then raise exception 'Admin access required'; end if;
  update public.rm_qualification set is_published=false;
  insert into public.rm_qualification(month_label,mspin,target,achievement,achievement_pct,gv_retail,is_published,updated_at)
  select p_month,x.mspin,coalesce(x.target,0),coalesce(x.achievement,0),coalesce(x.achievement_pct,0),coalesce(x.gv_retail,0),true,now()
  from jsonb_to_recordset(p_rows) as x(mspin text,target numeric,achievement numeric,achievement_pct numeric,gv_retail numeric);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
grant execute on function public.publish_rm_qualification(text,jsonb) to authenticated;
