create type public.task_status as enum ('todo','in_progress','done');
create type public.task_priority as enum ('low','medium','high');
create type public.member_role as enum ('owner','editor','viewer');

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default 'oklch(0.7 0.12 160)',
  created_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  role public.member_role not null default 'editor',
  primary key (project_id, member_id)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  assignee_id uuid references public.members(id) on delete set null,
  title text not null,
  description text not null default '',
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  due_date date,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.members, public.projects, public.project_members, public.tasks to anon, authenticated;
grant all on public.members, public.projects, public.project_members, public.tasks to service_role;

alter table public.members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

create policy "open demo access" on public.members for all to anon, authenticated using (true) with check (true);
create policy "open demo access" on public.projects for all to anon, authenticated using (true) with check (true);
create policy "open demo access" on public.project_members for all to anon, authenticated using (true) with check (true);
create policy "open demo access" on public.tasks for all to anon, authenticated using (true) with check (true);

insert into public.projects (id, name) values ('11111111-1111-1111-1111-111111111111', 'Product Launch');
insert into public.members (id, name, color) values
 ('a0000000-0000-0000-0000-000000000001','Aarav Mehta','oklch(0.72 0.14 50)'),
 ('a0000000-0000-0000-0000-000000000002','Priya Nair','oklch(0.7 0.12 180)'),
 ('a0000000-0000-0000-0000-000000000003','Leo Martins','oklch(0.68 0.13 250)');
insert into public.project_members (project_id, member_id, role) values
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','owner'),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000002','editor'),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003','editor');
insert into public.tasks (project_id, assignee_id, title, description, priority, status, due_date, position) values
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','Draft launch copy','Headline + 3 feature blurbs','high','in_progress','2026-10-10',1),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','Pricing page review','Check tiers with finance','medium','in_progress','2026-10-12',2),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','Press kit','Logos, screenshots, bios','medium','in_progress','2026-10-14',3),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','Investor update','Monthly metrics email','low','in_progress','2026-10-15',4),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','Customer interviews','Schedule 5 calls','high','in_progress','2026-10-09',5),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','Onboarding emails','Write 3-step drip','medium','in_progress','2026-10-16',6),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000002','Fix signup bug','Safari form validation','high','todo','2026-10-08',1),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000002','Analytics events','Track activation funnel','medium','in_progress','2026-10-13',7),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003','Landing page hero','New illustration','low','todo','2026-10-20',2),
 ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000003','Set up status page','Uptime monitoring','medium','done','2026-10-02',1);