-- Persist deployment resources and prevent false "live" states.

begin;

alter table public.website_projects
  add column if not exists slug text,
  add column if not exists github_repo text,
  add column if not exists live_url text,
  add column if not exists repository_provisioned_at timestamptz,
  add column if not exists pages_verified_at timestamptz;

create unique index if not exists website_projects_slug_unique
  on public.website_projects (slug) where slug is not null;

alter table public.website_projects
  drop constraint if exists website_projects_github_repo_url,
  add constraint website_projects_github_repo_url
    check (github_repo is null or github_repo ~ '^https://github\.com/[^/]+/[^/]+/?$'),
  drop constraint if exists website_projects_live_url,
  add constraint website_projects_live_url
    check (live_url is null or live_url ~ '^https://[^[:space:]]+$');

create or replace function public.guard_project_deployment_state()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.state in ('deploying', 'live') and
     (new.github_repo is null or new.repository_provisioned_at is null) then
    raise exception 'A project repository must be provisioned before deployment';
  end if;

  if new.state = 'live' and
     (new.live_url is null or new.pages_verified_at is null) then
    raise exception 'GitHub Pages must be verified before a project can be marked live';
  end if;

  return new;
end;
$function$;

drop trigger if exists website_projects_deployment_guard on public.website_projects;
create trigger website_projects_deployment_guard
before insert or update on public.website_projects
for each row execute function public.guard_project_deployment_state();

commit;
