# Workflow Engine

A **Full Stack Workflow Automation System** built with Next.js (App Router), TypeScript, Prisma, PostgreSQL, Zustand, and shadcn/ui.
**LiveLink
https://charm-work-engine.lovable.app

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| State | Zustand |
| UI | shadcn/ui + Tailwind CSS |
| Validation | Zod |
| Drag & Drop | @hello-pangea/dnd |
| Toasts | Sonner |

## Prerequisites

- Node.js 18+
- PostgreSQL running locally

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd engineworkflow
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/workflow_engine"
```

### 3. Initialize the database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (create tables)
npx prisma migrate dev --name init

# Seed the database with sample data
npx prisma db seed
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Features

### Pages

| Page | Description |
|---|---|
| `/workflows` | List all workflows with search, filter, and pagination |
| `/workflows/[id]/editor` | Edit workflow settings, input schema, and manage steps |
| `/steps/[id]/rules` | Add/edit/delete rules with drag-and-drop priority reordering |
| `/workflows/[id]/execute` | Execute a workflow with dynamic input form and real-time log panel |
| `/executions` | Audit log of all executions with status badges and log viewer |

### Rule Engine

Supports:

- **Comparison**: `amount > 5000`, `status == "approved"`, `score != 0`
- **Logical**: `amount > 1000 && department == "Finance"`
- **Functions**: `contains(field, value)`, `startsWith(field, value)`, `endsWith(field, value)`
- **Default fallback**: `DEFAULT` (matches if no other rule matches)

### Sample Workflow (Expense Approval)

After seeding, you'll find the **Expense Approval** workflow with:

| Step | Type | Description |
|---|---|---|
| Manager Approval | approval | First level decision |
| Finance Notification | notification | Alerts finance team |
| CEO Approval | approval | High-value escalation |
| Task Rejection | task | Rejects the request |

**Rule logic:**
- `amount > 10000` → CEO Approval
- `amount > 1000` → Finance Notification
- `contains(department, "IT")` (after Finance) → CEO Approval
- `amount >= 50000` (at CEO) → Task Rejection
- `DEFAULT` → Task Rejection / end

---

## API Reference

### Workflows
```
GET  /api/workflows                       # List (paginated, searchable)
POST /api/workflows                       # Create
GET  /api/workflows/:id                   # Get with steps and rules
PUT  /api/workflows/:id                   # Update (bumps version)
DELETE /api/workflows/:id                 # Delete
```

### Steps
```
GET  /api/workflows/:workflowId/steps     # List steps
POST /api/workflows/:workflowId/steps     # Create step
PUT  /api/steps/:id                       # Update step
DELETE /api/steps/:id                     # Delete step
```

### Rules
```
GET  /api/steps/:stepId/rules             # List rules
POST /api/steps/:stepId/rules             # Create rule
PUT  /api/rules/:id                       # Update rule
DELETE /api/rules/:id                     # Delete rule
```

### Executions
```
POST /api/workflows/:workflowId/execute   # Start execution
GET  /api/executions                      # List (paginated)
GET  /api/executions/:id                  # Get status & logs
POST /api/executions/:id/cancel           # Cancel
POST /api/executions/:id/retry            # Retry (failed only)
```

---

## Project Structure

```
src/
├── app/
│   ├── api/                # REST API route handlers
│   │   ├── workflows/
│   │   ├── steps/
│   │   ├── rules/
│   │   └── executions/
│   └── (dashboard)/        # UI Pages
│       ├── workflows/
│       ├── steps/
│       └── executions/
├── components/             # Shared UI components
├── lib/                    # Core logic
│   ├── prisma.ts           # Prisma singleton
│   ├── rule-engine.ts      # Rule evaluation engine
│   ├── execution-engine.ts # Workflow execution engine
│   └── validations.ts      # Zod schemas
├── store/                  # Zustand state stores
│   ├── workflow-store.ts
│   ├── step-store.ts
│   ├── rule-store.ts
│   └── execution-store.ts
└── types/                  # TypeScript types
prisma/
├── schema.prisma           # Database models
└── seed.ts                 # Sample data
```
