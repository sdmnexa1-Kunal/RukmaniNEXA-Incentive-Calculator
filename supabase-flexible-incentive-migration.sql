-- Rukmani NEXA flexible incentive scheme migration
alter table public.incentive_schemes
  add column if not exists step_up_enabled boolean not null default true,
  add column if not exists step_up_tiers jsonb not null default '[1000,1200,1500,1800,2000]'::jsonb;

alter table public.incentive_items
  add column if not exists main_incentives jsonb not null default '[]'::jsonb,
  add column if not exists spot_incentives jsonb not null default '[]'::jsonb;

update public.incentive_items
set main_incentives = case
  when jsonb_array_length(main_incentives) = 0 then jsonb_build_array(coalesce(incentive,0))
  else main_incentives
end,
spot_incentives = case
  when jsonb_array_length(spot_incentives) = 0 then
    case
      when coalesce(spot1,0) <> 0 or coalesce(spot2,0) <> 0
      then jsonb_build_array(coalesce(spot1,0),coalesce(spot2,0))
      else '[]'::jsonb
    end
  else spot_incentives
end;

create or replace function public.publish_incentive_scheme_v2(
  p_month text,
  p_items jsonb,
  p_step_up_enabled boolean,
  p_step_up_tiers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scheme uuid;
begin
  if coalesce(auth.jwt()->'user_metadata'->>'role','') <> 'admin' then
    raise exception 'Admin access required';
  end if;

  insert into public.incentive_schemes(
    month_label,is_published,published_at,step_up_enabled,step_up_tiers
  )
  values (
    p_month,false,null,p_step_up_enabled,
    case when p_step_up_enabled then coalesce(p_step_up_tiers,'[]'::jsonb) else '[]'::jsonb end
  )
  returning id into v_scheme;

  insert into public.incentive_items(
    scheme_id,model,variant,incentive,spot1,spot2,main_incentives,spot_incentives
  )
  select
    v_scheme,
    x.model,
    x.variant,
    coalesce((x.main_incentives->>0)::numeric,0),
    coalesce((x.spot_incentives->>0)::numeric,0),
    coalesce((x.spot_incentives->>1)::numeric,0),
    coalesce(x.main_incentives,'[]'::jsonb),
    coalesce(x.spot_incentives,'[]'::jsonb)
  from jsonb_to_recordset(p_items) as x(
    model text,
    variant text,
    main_incentives jsonb,
    spot_incentives jsonb
  );

  update public.incentive_schemes
  set is_published=false
  where id <> v_scheme;

  update public.incentive_schemes
  set is_published=true,published_at=now()
  where id=v_scheme;

  return v_scheme;
end;
$$;

grant execute on function public.publish_incentive_scheme_v2(text,jsonb,boolean,jsonb) to authenticated;
