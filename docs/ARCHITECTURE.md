# Architecture

## Design goal

KPI OS is designed around one operating loop:

```text
measure → detect → assign → act → review → remember
```

Dashboards are only the presentation layer. The core domain connects a KPI to an owner, target, cadence, evidence, intervention, and final outcome.

## Runtime topology

```mermaid
flowchart TB
  subgraph Browser
    SHELL[App shell]
    PAGES[Today · KPIs · Initiatives · People]
    QUERY[TanStack Query]
    STATE[Zustand UI state]
  end

  subgraph Next[Next.js application]
    ROUTES[Server route handlers]
    AUTH[Actor and scope resolution]
    DOMAIN[KPI + initiative domain services]
    AIO[AI orchestration]
  end

  subgraph Demo[Public demonstration mode]
    FIXTURES[(Synthetic typed dataset)]
    LOCALAI[Deterministic AI adapter]
  end

  subgraph Optional[Production adapter boundary]
    DB[(Postgres / Supabase)]
    LLM[Anthropic adapter]
  end

  PAGES --> QUERY --> ROUTES
  PAGES --> STATE
  ROUTES --> AUTH --> DOMAIN
  ROUTES --> AIO
  DOMAIN --> FIXTURES
  AIO --> LOCALAI
  DOMAIN -. configured deployments only .-> DB
  AIO -. configured deployments only .-> LLM
```

## Major decisions

### Server-owned business rules

The browser renders results but does not decide KPI health, initiative permissions, or AI evidence. Route handlers resolve the acting persona and apply the same domain rules for every client.

### Direction-aware KPI status

Targets can be `above` or `below`. Revenue is healthy above target; acquisition cost is healthy below target. The status engine normalizes both cases into consistent health and deviation semantics.

### Evidence before prose

The AI layer receives a structured evidence bundle containing the relevant KPI values, time window, owner, initiatives, and data limitations. Responses expose supporting sources and avoid inventing missing context.

### Workflow, not a task list

An initiative captures baseline, target, owner, budget, review state, updates, and measured results. Completing an initiative produces a reusable learning rather than simply closing a ticket.

### Adapter boundary for public release

The public build defaults to local fixtures and deterministic responses. Database and model integrations are optional adapters. This keeps the demo reproducible while preserving the architecture used for a real deployment.

## Request flow: executive brief

```mermaid
sequenceDiagram
  participant U as Reviewer
  participant UI as Today page
  participant API as /api/today
  participant Scope as Scope resolver
  participant KPI as KPI engine
  participant Data as Synthetic provider

  U->>UI: Open dashboard as a persona
  UI->>API: Request today's brief
  API->>Scope: Resolve actor and permissions
  Scope-->>API: Allowed KPI and initiative scope
  API->>Data: Load typed measurements
  Data-->>KPI: Values, targets, history
  KPI-->>API: Health, deviations, priorities
  API-->>UI: Decision-ready brief
```

## Request flow: AI coach

```mermaid
sequenceDiagram
  participant U as Reviewer
  participant API as /api/chat
  participant C as Context builder
  participant R as Ranking and guardrails
  participant D as Demo AI adapter

  U->>API: Ask about an underperforming KPI
  API->>C: Build scoped evidence
  C->>R: KPI history + initiatives + limitations
  R->>D: Structured prompt contract
  D-->>API: Deterministic grounded response
  API-->>U: Answer + evidence links
```

## Data model, simplified

```mermaid
erDiagram
  ORGANIZATION ||--o{ MEMBER : has
  ORGANIZATION ||--o{ ACTIVE_KPI : tracks
  KPI_DEFINITION ||--o{ ACTIVE_KPI : configures
  MEMBER ||--o{ ACTIVE_KPI : owns
  ACTIVE_KPI ||--o{ KPI_SNAPSHOT : records
  ACTIVE_KPI ||--o{ INITIATIVE_KPI : targets
  INITIATIVE ||--o{ INITIATIVE_KPI : contains
  INITIATIVE ||--o{ INITIATIVE_EVENT : records
  INITIATIVE ||--o| INITIATIVE_RESULT : measures
```

The public application uses typed in-memory equivalents of these concepts. Reference SQL is included to demonstrate relational modeling, RLS-aware deployment patterns, and migration discipline.
