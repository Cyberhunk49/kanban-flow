# Task Management App

A streamlined Kanban-style task management application for personal and team productivity, with built-in workload balancing to flag burnout risk.

# Deployed Link : https://easeflow-board.lovable.app/

## Features

- **Kanban board** — three columns: To-Do, In Progress, Done, with drag-and-drop between them (drag moves are saved instantly to the database).
- **Task cards** — each card shows a title, description, priority tag (low / medium / high), due date, and assignee avatar.
- **User controls**
  - Create tasks (with assignee, priority, and due date).
  - Delete tasks.
  - Add team members to a project.
  - Filter the board by priority.
- **Workload balancing**
  - Live counter on each column showing how many tasks it holds.
  - If any member has more than 5 tasks in "In Progress", their avatar in the team list pulses red as a burnout warning.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                   │
│  React 19 + TanStack Router/Start (SPA UI)  │
│  Tailwind CSS v4 + shadcn/ui components     │
│  dnd-kit drag-and-drop                      │
│  TanStack Query for data fetching/caching   │
└──────────────────┬──────────────────────────┘
                   │ typed RPC (createServerFn)
┌──────────────────▼──────────────────────────┐
│               Backend API                   │
│  Server-side CRUD endpoints that own all    │
│  reads/writes: board loading, task create,  │
│  task move, task delete, member management. │
│  Every operation validates its input with   │
│  Zod before touching the database.          │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              PostgreSQL                     │
│  Relational schema with RLS + access        │
│  policies (hosted on Supabase).             │
└─────────────────────────────────────────────┘
```

The browser never talks to the database directly — all state changes flow through the server-side API, which validates input and persists to PostgreSQL.

## Data Model

```
projects ──< tasks >── members
    │
    └──< project_members (role: owner | editor | viewer)
```

- **projects** — a board; contains tasks.
- **members** — team members, with a display color used for avatars.
- **project_members** — links people to projects with a role (`owner`, `editor`, `viewer`).
- **tasks** — belong to a project, optionally assigned to a member; carry `title`, `description`, `priority` (`low`/`medium`/`high`), `status` (`todo`/`in_progress`/`done`), and `due_date`. Status and priority are PostgreSQL enum types.

## Workload Balancing Rule

A member is considered overloaded when they have **more than 5 tasks with status `in_progress`**. The check lives in a pure, unit-tested helper (`workload.ts` with tests in `workload.test.ts`) so the threshold logic is isolated from the UI .

## Tech Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Frontend   | React 19, TanStack Router, TanStack Query, Tailwind v4  |
| UI         | shadcn/ui (Radix primitives), dnd-kit for drag-and-drop |
| Backend    | Typed server functions (TanStack Start server runtime)  |
| Database   | PostgreSQL (hosted on Supabase) with row-level security |
| Validation | Zod schemas on every API operation                      |
| Testing    | Vitest                                                  |

## Getting Started

Requires Node.js (18+).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Then open the printed local URL in your browser.

## Project Structure

```
src/
  routes/          pages (root layout + Kanban board)
  components/      UI components (board, cards, dialogs, team list)
  lib/             API functions, workload logic + tests
supabase/
  migrations/      PostgreSQL schema, enums, policies
```
