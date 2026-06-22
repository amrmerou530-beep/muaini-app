-- شغّل هذا الملف مرة واحدة داخل Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  plan text not null default 'free' check (plan in ('free','premium')),
  plan_status text not null default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  logs jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  last_read_page integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  local_user_key text,
  endpoint text not null unique,
  subscription jsonb not null,
  country text,
  time_zone text not null default 'UTC',
  prayer_times jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_delivery_log (
  id bigint generated always as identity primary key,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  delivery_key text not null,
  created_at timestamptz not null default now(),
  unique(subscription_id, delivery_key)
);

create table if not exists public.audio_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('adhan','fajr','iqama')),
  premium boolean not null default false,
  storage_path text not null unique,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);


create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('hadith','announcement')),
  title text,
  body text not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null,
  message text not null,
  email text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_data(user_id) values(new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_data enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_delivery_log enable row level security;
alter table public.audio_catalog enable row level security;
alter table public.feedback enable row level security;
alter table public.app_settings enable row level security;
alter table public.content_items enable row level security;

-- الملفات الشخصية
create policy "profiles read own" on public.profiles for select using (auth.uid() = id);

-- بيانات المستخدم
create policy "user_data own select" on public.user_data for select using (auth.uid() = user_id);
create policy "user_data own insert" on public.user_data for insert with check (auth.uid() = user_id);
create policy "user_data own update" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- كتالوج الأصوات: القراءة متاحة للجميع، والرفع/التعديل للمشرف فقط
create policy "audio catalog public read" on public.audio_catalog for select using (active = true or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "audio catalog admin insert" on public.audio_catalog for insert with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "audio catalog admin update" on public.audio_catalog for update using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "audio catalog admin delete" on public.audio_catalog for delete using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- البلاغات
create policy "feedback insert authenticated" on public.feedback for insert with check (auth.uid() = user_id);
create policy "feedback admin read" on public.feedback for select using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "feedback admin update" on public.feedback for update using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));



-- المحتوى: القراءة للعناصر النشطة، والإدارة للمشرف
create policy "content public read" on public.content_items for select using (active = true or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "content admin insert" on public.content_items for insert with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "content admin update" on public.content_items for update using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "content admin delete" on public.content_items for delete using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- إعدادات التطبيق لا تُدار من المتصفح مباشرة؛ Netlify Functions تستخدم service_role.

-- لا نفتح اشتراكات Push وسجل الإرسال للعميل؛ Netlify Functions تستخدم service_role.

insert into storage.buckets (id, name, public)
values ('audio-library','audio-library',false)
on conflict (id) do update set public = excluded.public;

create policy "audio storage admin upload" on storage.objects for insert to authenticated
with check (
  bucket_id = 'audio-library'
  and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "audio storage admin manage" on storage.objects for all to authenticated
using (
  bucket_id = 'audio-library'
  and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  bucket_id = 'audio-library'
  and exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- بعد إنشاء حسابك، نفّذ السطر التالي مرة واحدة مع استبدال البريد:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_EMAIL@example.com');

-- =========================================================
-- إضافات مُعيني بلس 4.0: Passkeys، الدوائر الخاصة، التحديات
-- =========================================================

create table if not exists public.passkey_challenges (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('registration','authentication')),
  challenge text not null,
  options jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

create table if not exists public.passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports jsonb not null default '[]'::jsonb,
  webauthn_user_id text not null,
  device_type text,
  backed_up boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.family_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups(id) on delete cascade,
  title text not null,
  target integer not null check (target > 0),
  created_by uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.family_weekly_progress (
  group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_key text not null,
  score integer not null default 0 check (score between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id, week_key)
);

alter table public.passkey_challenges enable row level security;
alter table public.passkeys enable row level security;
alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.family_challenges enable row level security;
alter table public.family_weekly_progress enable row level security;

-- Passkeys والتحديات تُدار من Netlify Functions بمفتاح الخدمة.
create policy "passkeys read own" on public.passkeys for select using (auth.uid() = user_id);

create policy "family groups member read" on public.family_groups for select using (
  exists(select 1 from public.family_members fm where fm.group_id=id and fm.user_id=auth.uid())
);
create policy "family members member read" on public.family_members for select using (
  exists(select 1 from public.family_members me where me.group_id=family_members.group_id and me.user_id=auth.uid())
);
create policy "family challenges member read" on public.family_challenges for select using (
  exists(select 1 from public.family_members fm where fm.group_id=family_challenges.group_id and fm.user_id=auth.uid())
);
create policy "family challenges member insert" on public.family_challenges for insert with check (
  auth.uid() = created_by and exists(select 1 from public.family_members fm where fm.group_id=family_challenges.group_id and fm.user_id=auth.uid())
);
create policy "family progress member read" on public.family_weekly_progress for select using (
  exists(select 1 from public.family_members fm where fm.group_id=family_weekly_progress.group_id and fm.user_id=auth.uid())
);
create policy "family progress own upsert" on public.family_weekly_progress for insert with check (
  auth.uid() = user_id and exists(select 1 from public.family_members fm where fm.group_id=family_weekly_progress.group_id and fm.user_id=auth.uid())
);
create policy "family progress own update" on public.family_weekly_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.create_family_group(group_name_input text)
returns table(group_id uuid, invite_code text)
language plpgsql security definer set search_path=public as $$
declare
  new_group_id uuid;
  new_code text;
  display_value text;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  new_code := upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
  select coalesce(display_name,'عضو') into display_value from public.profiles where id=auth.uid();
  insert into public.family_groups(name,invite_code,owner_id)
  values(trim(group_name_input),new_code,auth.uid()) returning id into new_group_id;
  insert into public.family_members(group_id,user_id,display_name)
  values(new_group_id,auth.uid(),display_value) on conflict do nothing;
  return query select new_group_id,new_code;
end;
$$;

create or replace function public.join_family_group(invite_code_input text)
returns table(group_id uuid, group_name text)
language plpgsql security definer set search_path=public as $$
declare
  target_id uuid;
  target_name text;
  display_value text;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  select id,name into target_id,target_name from public.family_groups where invite_code=upper(trim(invite_code_input));
  if target_id is null then raise exception 'رمز الدعوة غير صحيح'; end if;
  select coalesce(display_name,'عضو') into display_value from public.profiles where id=auth.uid();
  insert into public.family_members(group_id,user_id,display_name)
  values(target_id,auth.uid(),display_value) on conflict do nothing;
  return query select target_id,target_name;
end;
$$;

grant execute on function public.create_family_group(text) to authenticated;
grant execute on function public.join_family_group(text) to authenticated;

-- تحسين سياسات الدوائر لتجنب الاستدعاء التكراري داخل RLS
create or replace function public.is_family_member(check_group uuid)
returns boolean
language sql security definer stable set search_path=public as $$
  select exists(
    select 1 from public.family_members
    where group_id=check_group and user_id=auth.uid()
  );
$$;

grant execute on function public.is_family_member(uuid) to authenticated;

drop policy if exists "family groups member read" on public.family_groups;
drop policy if exists "family members member read" on public.family_members;
drop policy if exists "family challenges member read" on public.family_challenges;
drop policy if exists "family challenges member insert" on public.family_challenges;
drop policy if exists "family progress member read" on public.family_weekly_progress;
drop policy if exists "family progress own upsert" on public.family_weekly_progress;
drop policy if exists "family progress own update" on public.family_weekly_progress;

create policy "family groups member read" on public.family_groups for select using (public.is_family_member(id));
create policy "family members member read" on public.family_members for select using (public.is_family_member(group_id));
create policy "family challenges member read" on public.family_challenges for select using (public.is_family_member(group_id));
create policy "family challenges member insert" on public.family_challenges for insert with check (auth.uid()=created_by and public.is_family_member(group_id));
create policy "family progress member read" on public.family_weekly_progress for select using (public.is_family_member(group_id));
create policy "family progress own upsert" on public.family_weekly_progress for insert with check (auth.uid()=user_id and public.is_family_member(group_id));
create policy "family progress own update" on public.family_weekly_progress for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
