# Kanban Flow

#Problem Statement: Task Management App The Mission: Create a streamlined task management application with Kanban-style organization for personal or team productivity. Frontend UI & User Interaction: ● Kanban Board: Three columns: 'To-Do', 'In Progress', 'Done', with drag-and-drop capability. ● Task Cards: Individual items with priority tags, due dates, and descriptions. ● User Controls: Buttons to create tasks, add users to projects, and filter by priority. Backend Logic & State Management: ● Custom CRUD API: Manages task states and user associations. ● Relational Data: PostgreSQL stores task hierarchy (projects -> tasks) and user permissions. The Vibe Check: Introduce "Workload Balancing." Add a counter to each column indicating the number of tasks. If any user has more than 5 tasks in "In Progress", the background color of their avatar in the team list must pulse red to warn of potential burnout.

and after completion push the code to https://github.com/DevanshXerc90/quantiphi

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5aa419df-ae51-4e88-9e04-12304a1ce8f7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
