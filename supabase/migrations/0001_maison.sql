-- Maison Kurotsuki — schéma, règles d'accès et stockage.
-- À exécuter une fois dans l'éditeur SQL de Supabase (ou via `supabase db push`).

-- ---------------------------------------------------------------------------
-- Membres
-- ---------------------------------------------------------------------------

create table if not exists public.membres (
  discord_id  text primary key,
  user_id     uuid unique references auth.users (id) on delete set null,
  nom         text,
  avatar_url  text,
  role        text not null unique check (role in ('creatrice', 'ami'))
);

-- Rôle du compte connecté, ou null. L'identité Discord est lue dans
-- auth.identities (renseignée par le fournisseur, non modifiable par
-- l'utilisateur), jamais dans les métadonnées modifiables.
create or replace function public.role_membre()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.membres m
  join auth.identities i
    on i.provider = 'discord' and i.provider_id = m.discord_id
  where i.user_id = (select auth.uid())
  limit 1
$$;

create or replace function public.est_membre()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.role_membre() is not null
$$;

-- Appelée après la connexion : rattache le compte et met à jour nom et avatar.
create or replace function public.synchroniser_membre()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  update public.membres m
  set user_id    = i.user_id,
      nom        = coalesce(i.identity_data ->> 'full_name', i.identity_data ->> 'name', m.nom),
      avatar_url = coalesce(i.identity_data ->> 'avatar_url', m.avatar_url)
  from auth.identities i
  where i.provider = 'discord'
    and i.provider_id = m.discord_id
    and i.user_id = (select auth.uid())
  returning m.role into v_role;
  return v_role;
end;
$$;

-- ---------------------------------------------------------------------------
-- Collections et tenues
-- ---------------------------------------------------------------------------

create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  ordre       integer not null default 0,
  titre       text not null check (length(trim(titre)) > 0),
  description text not null default '',
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz not null default now()
);

create table if not exists public.tenues (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  nom           text not null check (length(trim(nom)) > 0),
  collection_id uuid not null references public.collections (id) on delete restrict,
  gabarit       text not null default 'classic' check (gabarit in ('classic', 'slim')),
  statut        text not null default 'brouillon' check (statut in ('publiee', 'masquee', 'brouillon')),
  ordre         integer not null default 0,
  skin_path     text not null,
  portrait_path text,
  vignette_path text,
  details       text not null default '',
  note          text not null default '',
  creee_pour    text not null default '',
  auteur        uuid default auth.uid() references auth.users (id) on delete set null,
  publiee_le    timestamptz,
  cree_le       timestamptz not null default now(),
  modifie_le    timestamptz not null default now()
);

create index if not exists tenues_collection_idx on public.tenues (collection_id, ordre);
create index if not exists tenues_statut_idx on public.tenues (statut, publiee_le desc);

-- ---------------------------------------------------------------------------
-- Tier lists
-- ---------------------------------------------------------------------------

create table if not exists public.tier_lists (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null check (length(trim(titre)) > 0),
  collections uuid[] not null default '{}',
  contenu     jsonb not null default '{"rangs": []}'::jsonb,
  auteur      uuid default auth.uid() references auth.users (id) on delete set null,
  version     integer not null default 1,
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- La lettre (une seule ligne)
-- ---------------------------------------------------------------------------

create table if not exists public.lettre (
  id         integer primary key default 1 check (id = 1),
  texte      text not null default '',
  signature  text not null default '',
  lue_le     timestamptz,
  modifie_le timestamptz not null default now()
);

insert into public.lettre (id) values (1) on conflict (id) do nothing;

create or replace function public.marquer_lettre_lue()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.role_membre() = 'creatrice' then
    update public.lettre set lue_le = now() where id = 1 and lue_le is null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Déclencheurs
-- ---------------------------------------------------------------------------

create or replace function public.maj_modifie_le()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.modifie_le = now();
  return new;
end;
$$;

drop trigger if exists collections_modifie_le on public.collections;
create trigger collections_modifie_le before update on public.collections
  for each row execute function public.maj_modifie_le();

drop trigger if exists tenues_modifie_le on public.tenues;
create trigger tenues_modifie_le before update on public.tenues
  for each row execute function public.maj_modifie_le();

drop trigger if exists tier_lists_modifie_le on public.tier_lists;
create trigger tier_lists_modifie_le before update on public.tier_lists
  for each row execute function public.maj_modifie_le();

drop trigger if exists lettre_modifie_le on public.lettre;
create trigger lettre_modifie_le before update of texte, signature on public.lettre
  for each row execute function public.maj_modifie_le();

-- Date de première publication : sert au tri « plus récentes ».
create or replace function public.dater_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.statut = 'publiee' and new.publiee_le is null then
    new.publiee_le = now();
  end if;
  return new;
end;
$$;

drop trigger if exists tenues_publiee_le on public.tenues;
create trigger tenues_publiee_le before insert or update of statut on public.tenues
  for each row execute function public.dater_publication();

-- Une tenue supprimée disparaît proprement des classements.
create or replace function public.retirer_tenue_des_classements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tier_lists tl
  set contenu = jsonb_set(
    tl.contenu,
    '{rangs}',
    coalesce((
      select jsonb_agg(
        jsonb_set(r.rang, '{tenues}', coalesce((
          select jsonb_agg(t.val order by t.pos)
          from jsonb_array_elements(r.rang -> 'tenues') with ordinality as t(val, pos)
          where t.val <> to_jsonb(old.id::text)
        ), '[]'::jsonb))
        order by r.pos
      )
      from jsonb_array_elements(tl.contenu -> 'rangs') with ordinality as r(rang, pos)
    ), '[]'::jsonb)
  )
  where tl.contenu::text like '%' || old.id::text || '%';
  return old;
end;
$$;

drop trigger if exists tenues_retirer_classements on public.tenues;
create trigger tenues_retirer_classements after delete on public.tenues
  for each row execute function public.retirer_tenue_des_classements();

-- ---------------------------------------------------------------------------
-- Règles d'accès par ligne
-- ---------------------------------------------------------------------------

alter table public.membres     enable row level security;
alter table public.collections enable row level security;
alter table public.tenues      enable row level security;
alter table public.tier_lists  enable row level security;
alter table public.lettre      enable row level security;

drop policy if exists "membres: lecture membres" on public.membres;
create policy "membres: lecture membres" on public.membres
  for select to authenticated using ((select public.est_membre()));

drop policy if exists "collections: lecture publique" on public.collections;
create policy "collections: lecture publique" on public.collections
  for select to anon, authenticated using (true);
drop policy if exists "collections: écriture membres" on public.collections;
create policy "collections: écriture membres" on public.collections
  for all to authenticated
  using ((select public.est_membre())) with check ((select public.est_membre()));

drop policy if exists "tenues: lecture" on public.tenues;
create policy "tenues: lecture" on public.tenues
  for select to anon, authenticated
  using (statut = 'publiee' or (select public.est_membre()));
drop policy if exists "tenues: écriture membres" on public.tenues;
create policy "tenues: écriture membres" on public.tenues
  for all to authenticated
  using ((select public.est_membre())) with check ((select public.est_membre()));

drop policy if exists "tier_lists: lecture publique" on public.tier_lists;
create policy "tier_lists: lecture publique" on public.tier_lists
  for select to anon, authenticated using (true);
drop policy if exists "tier_lists: écriture membres" on public.tier_lists;
create policy "tier_lists: écriture membres" on public.tier_lists
  for all to authenticated
  using ((select public.est_membre())) with check ((select public.est_membre()));

drop policy if exists "lettre: lecture membres" on public.lettre;
create policy "lettre: lecture membres" on public.lettre
  for select to authenticated using ((select public.est_membre()));
drop policy if exists "lettre: écriture ami" on public.lettre;
create policy "lettre: écriture ami" on public.lettre
  for update to authenticated
  using ((select public.role_membre()) = 'ami') with check ((select public.role_membre()) = 'ami');

revoke execute on function public.synchroniser_membre() from public, anon;
revoke execute on function public.marquer_lettre_lue() from public, anon;
grant execute on function public.synchroniser_membre() to authenticated;
grant execute on function public.marquer_lettre_lue() to authenticated;

-- ---------------------------------------------------------------------------
-- Synchronisation en direct des tier lists
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tier_lists'
  ) then
    alter publication supabase_realtime add table public.tier_lists;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Stockage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('skins',   'skins',   false, 204800,  array['image/png']),
  ('renders', 'renders', true,  2097152, array['image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "skins: lecture" on storage.objects;
create policy "skins: lecture" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'skins'
    and (
      (select public.est_membre())
      or exists (select 1 from public.tenues t where t.skin_path = name and t.statut = 'publiee')
    )
  );

drop policy if exists "skins: ajout membres" on storage.objects;
create policy "skins: ajout membres" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'skins' and (select public.est_membre()));

drop policy if exists "skins: modification membres" on storage.objects;
create policy "skins: modification membres" on storage.objects
  for update to authenticated
  using (bucket_id = 'skins' and (select public.est_membre()));

drop policy if exists "skins: suppression membres" on storage.objects;
create policy "skins: suppression membres" on storage.objects
  for delete to authenticated
  using (bucket_id = 'skins' and (select public.est_membre()));

drop policy if exists "renders: lecture membres" on storage.objects;
create policy "renders: lecture membres" on storage.objects
  for select to authenticated
  using (bucket_id = 'renders' and (select public.est_membre()));

drop policy if exists "renders: ajout membres" on storage.objects;
create policy "renders: ajout membres" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'renders' and (select public.est_membre()));

drop policy if exists "renders: modification membres" on storage.objects;
create policy "renders: modification membres" on storage.objects
  for update to authenticated
  using (bucket_id = 'renders' and (select public.est_membre()));

drop policy if exists "renders: suppression membres" on storage.objects;
create policy "renders: suppression membres" on storage.objects
  for delete to authenticated
  using (bucket_id = 'renders' and (select public.est_membre()));
