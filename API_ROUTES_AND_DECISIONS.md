# Pravah: API Reference & Architecture Design Decisions

This document provides a comprehensive catalogue of all API endpoints in **Pravah** and documents the core technical decisions guiding its system design, execution streaming, credit metering, and observability engines.

---

## 1. System Architecture & Decisions

### Decision 1: Server-Sent Events (SSE) vs WebSockets for Execution
* **Approach**: Unidirectional Server-Sent Events (`text/event-stream`) for pipeline execution streaming.
* **Implementation Details**:
  - The client triggers the run via a standard POST request. The server responds with `Content-Type: text/event-stream` and keeps the HTTP connection open.
  - Telemetry spans are pushed as serialized JSON data packages separated by double newlines (`\n\n`), using the event format:
    ```http
    event: <event_type>
    data: {"nodeId": "node_1", "status": "completed", ...}
    ```
* **Rationale**:
  - **Connection Lifecycle**: Execution runs are short-lived (typically 2 to 45 seconds). Setting up and tearing down a full bi-directional WebSocket connection for a single run incurs unnecessary transport layer overhead.
  - **Serverless Friendly**: Next.js serverless functions (e.g., on Vercel) have strict execution timeout ceilings (60s) and connection pool limitations. SSE relies on standard HTTP request/response mechanisms, which map natively to serverless lifecycles and HTTP/2 multiplexing, avoiding socket leak scenarios.
  - **Native Resiliency**: Browsers natively manage SSE reconnections via `EventSource` protocol guidelines, providing auto-reconnect semantics for long-running streaming spans.

---

### Decision 2: Opt-Out Security Wrapper (`route()`)
* **Approach**: A unified, generic higher-order wrapper function `route<TBody, TQuery, TParams>` wrapping Next.js route handlers.
* **Implementation Details**:
  - Defined in [`src/lib/api/route.ts`](file:///Users/sairaghukiranavula/Projects/test_project_flow/src/lib/api/route.ts).
  - Automatically handles session extraction via `next-auth`, consumes rate limit buckets using Upstash Redis, parses incoming JSON payloads through Zod schemas, and standardizes exception formatting.
* **Rationale**:
  - **Security by Default**: Authentication is enabled by default (`auth: true`). A developer must explicitly specify `{ auth: false }` to expose a public route. This structural convention prevents unauthenticated data exposure if a route file is created without manual verification code.
  - **Rate Limiting Guardrails**: Integrates IP-based (for anonymous routes) and user-based token cost limits before execution payload handling starts. This protects downstream paid API models (Sarvam STT, Bulbul TTS) from credit depletion attacks.

---

### Decision 3: Atomic Credit Reservation & Settlement
* **Approach**: Two-phase credit ledger transaction (Reservation $\to$ Settlement).
* **Implementation Details**:
  1. **Phase 1 (Reservation)**: Before starting topological execution, a flat transaction hold (`RUN_RESERVATION = 25.0 credits`) is placed on the user's wallet via an atomic database check:
     ```sql
     UPDATE "User" SET "credits" = "credits" - 25.0 WHERE "id" = :userId AND "credits" >= 25.0;
     ```
  2. **Phase 2 (Settlement)**: As the nodes complete, the exact costs are accumulated based on character counts, page counts, or audio segment lengths. Upon run completion (or failure), an atomic settlement transaction corrects the balance:
     ```typescript
     const balanceCorrection = RUN_RESERVATION - actualCost;
     await prisma.user.update({
       where: { id: userId },
       data: { credits: { increment: balanceCorrection } }
     });
     ```
  3. **Reaper Task**: A background reaper cron daemon executes periodically to find stale runs (status: `running` for more than 120s) and automatically settles them using the initial reserved credits as the ceiling.
* **Rationale**:
  - **Concurrency Control**: Prevents double-spending race conditions where a user with ₹10 remaining triggers multiple concurrent ₹20 pipeline runs.
  - **Failure Resiliency**: If the Next.js execution process is forcefully terminated (e.g., Vercel execution timeout), the ledger retains the reserved credits on the pipeline run row, allowing the reaper to recover the funds cleanly without user intervention.

---

### Decision 4: Topological DAG Execution Engine
* **Approach**: Graph parsing, validation, and traversal using topological sorting (Kahn's Algorithm).
* **Implementation Details**:
  - Nodes and edges are modeled as a Directed Acyclic Graph (DAG).
  - Khan's algorithm processes in-degree dependencies to produce a valid linear execution schedule.
  - **Pruning & Router Handling**: A `router` node evaluates conditional rules on upstream outputs and disables output edges. Disabled paths propagate downstream as `skipped` spans, preventing execution of dead-end branches.
* **Rationale**:
  - **Parallelism & Dependency Safety**: Ensures that a node (e.g., Translation) never executes before its inputs (e.g., Speech-to-Text output) are fully generated and resolved.
  - **Fault Isolation**: If a node fails, independent branches that do not depend on the failed node continue running. Only nodes directly dependent on the failed node are marked as skipped due to lack of input.

---

### Decision 5: Private Storage Gateway (Cloudflare R2 range request proxy)
* **Approach**: Chunked streaming proxy for R2 object storage.
* **Implementation Details**:
  - Implemented in [`src/app/api/audio/[filename]/route.ts`](file:///Users/sairaghukiranavula/Projects/test_project_flow/src/app/api/audio/%5Bfilename%5D/route.ts).
  - Handles standard HTTP `Range` requests from HTML5 `<audio>` elements, fetching only the requested byte segments (e.g., `bytes=0-1023`) from the upstream bucket.
* **Rationale**:
  - **Security**: Audio and document files containing sensitive user data are stored in a private R2 bucket with zero public read access. The Next.js server validates the user's session before generating a temporary read stream.
  - **Performance**: Natively supports audio scrubbing and seeking in browser players without forcing the client to download multi-megabyte audio files entirely before playback starts.

---

## 2. Comprehensive API Catalog

### 2.1 Pipeline & Versioning APIs

#### `GET /api/pipelines`
* **Description**: Lists all pipelines belonging to the current user's projects.
* **Auth**: Required
* **Rate Limit Cost**: 1 credit
* **Query Parameters**: None
* **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": "cmtd7exft0004lhzwmo0o6lrn",
      "name": "Speech Translator",
      "description": "Translates regional audio to English text",
      "projectId": "proj_123",
      "createdAt": "2026-08-28T12:00:00.000Z",
      "updatedAt": "2026-08-28T12:15:00.000Z"
    }
  ]
  ```

#### `POST /api/pipelines`
* **Description**: Creates a new pipeline under a project.
* **Auth**: Required
* **Request Schema (Zod)**:
  ```typescript
  const createPipelineSchema = z.object({
    projectId: z.string(),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
  });
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": "cmtd7exft0004lhzwmo0o6lrn",
    "name": "Speech Translator",
    "projectId": "proj_123",
    "createdAt": "2026-08-28T12:00:00.000Z"
  }
  ```

#### `GET /api/pipelines/[id]`
* **Description**: Retrieves a pipeline configuration, node topologies, and edge connections.
* **Auth**: Required
* **Path Parameters**: `id` (Pipeline ID)
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": "cmtd7exft0004lhzwmo0o6lrn",
    "name": "Speech Translator",
    "description": "Translates regional audio to English text",
    "projectId": "proj_123",
    "nodes": [
      {
        "id": "stt_1",
        "type": "stt",
        "label": "Saaras STT",
        "positionX": 100.0,
        "positionY": 150.0,
        "config": { "language_code": "hi-IN" }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "input_1",
        "target": "stt_1",
        "sourceHandle": null,
        "targetHandle": null
      }
    ]
  }
  ```

#### `PUT /api/pipelines/[id]`
* **Description**: Updates pipeline properties, nodes, and edges layout.
* **Auth**: Required
* **Request Schema (Zod)**:
  ```typescript
  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().max(500).optional(),
    nodes: z.array(z.object({
      id: z.string(),
      type: z.string(),
      label: z.string(),
      positionX: z.number(),
      positionY: z.number(),
      config: z.record(z.any())
    })),
    edges: z.array(z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string().nullable().optional(),
      targetHandle: z.string().nullable().optional()
    }))
  });
  ```

#### `POST /api/pipelines/[id]/versions`
* **Description**: Saves the current state of a pipeline graph as a snapshot version.
* **Auth**: Required
* **Path Parameters**: `id` (Pipeline ID)
* **Request Schema (Zod)**:
  ```typescript
  const createVersionSchema = z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(250).optional()
  });
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": "ver_9901",
    "pipelineId": "cmtd7exft0004lhzwmo0o6lrn",
    "version": 2,
    "name": "Prod Release v2",
    "createdAt": "2026-08-28T12:20:00.000Z"
  }
  ```

---

### 2.2 Execution & Tracing APIs

#### `POST /api/pipelines/[id]/run`
* **Description**: Runs a pipeline, streaming live logs and per-node execution telemetry.
* **Auth**: Required
* **Rate Limit Cost**: 25 credits (reserved up front)
* **Request Schema (Zod)**:
  ```typescript
  const bodySchema = z.object({
    inputs: z.record(z.string(), z.any()).optional(),
    nodes: z.array(z.any()).optional(), // Optional unsaved editor state
    edges: z.array(z.any()).optional()
  });
  ```
* **Streaming Protocol Events**:
  - `run_started`: `data: { "runId": "run_993", "pipelineId": "...", "nodeCount": 4 }`
  - `node_started`: `data: { "nodeId": "stt_1", "nodeType": "stt", "label": "Saaras STT" }`
  - `node_completed`: `data: { "nodeId": "stt_1", "nodeType": "stt", "output": { "text": "नमस्ते" }, "durationMs": 780, "cost": 0.375 }`
  - `node_failed`: `data: { "nodeId": "stt_1", "nodeType": "stt", "error": "insufficient credits", "failure": { "title": "Billing Limit", ... } }`
  - `run_completed`: `data: { "runId": "run_993", "status": "completed", "outputs": { "final_output": "Hello" } }`

#### `GET /api/runs/[runId]`
* **Description**: Fetches execution logs, Gantt durations, cost metadata, and raw snapshots.
* **Auth**: Required
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": "run_993",
    "status": "completed",
    "startedAt": "2026-08-28T12:00:00.000Z",
    "finishedAt": "2026-08-28T12:00:01.560Z",
    "reservedCredits": 25.0,
    "costBreakdown": { "stt": 0.375, "translate": 0.15 },
    "nodeRuns": [
      {
        "id": "nr_stt_1",
        "nodeId": "stt_1",
        "nodeType": "stt",
        "status": "completed",
        "input": { "payload": { "durationSeconds": 15 } },
        "output": { "text": "नमस्ते" },
        "durationMs": 780,
        "cost": 0.375,
        "tokenUsage": { "charCount": 6, "audioDurationSec": 15, "segments": 1 },
        "retryCount": 0,
        "startedAt": "2026-08-28T12:00:00.100Z",
        "finishedAt": "2026-08-28T12:00:00.880Z"
      }
    ],
    "pipeline": {
      "nodes": [...],
      "edges": [...]
    }
  }
  ```

---

### 2.3 Audio & Storage APIs

#### `POST /api/audio/upload`
* **Description**: Uploads local client voice input to private R2 storage.
* **Auth**: Required
* **Request**: Multi-part Form Data containing a single `file` field.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "key": "audio_run_stt_1_1724019283.wav",
    "url": "https://pub-r2-gateway.pravah.dev/audio_run_stt_1_1724019283.wav"
  }
  ```

#### `GET /api/audio/[filename]`
* **Description**: Fetches audio bytes. Fully supports ranges (e.g. `Range: bytes=0-`) to enable audio scrubbing.
* **Auth**: Required
* **Headers**:
  - Request: `Range: bytes=start-end`
  - Response: `Content-Range: bytes start-end/total`, `Accept-Ranges: bytes`, `Content-Length: chunk_size`

---

### 2.4 Evals & Regression APIs

#### `POST /api/evals/compare`
* **Description**: Generates an A/B performance regression diff between a baseline run and a candidate run.
* **Auth**: Required
* **Request Schema (Zod)**:
  ```typescript
  const compareSchema = z.object({
    baselineRunId: z.string(),
    candidateRunId: z.string()
  });
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": "comp_9921",
    "baselineRunId": "run_baseline_12",
    "candidateRunId": "run_candidate_13",
    "datasetId": "dataset_123",
    "summary": {
      "deltaPassRate": 8.5,
      "deltaWer": -0.035,
      "deltaBleu": 0.045,
      "deltaLatency": -120.0,
      "deltaCost": 0.08,
      "improvedCount": 6,
      "regressedCount": 1,
      "unchangedCount": 38
    }
  }
  ```

---

### 2.5 Wallet & Payment APIs

#### `POST /api/payment/order`
* **Description**: Generates a verified Razorpay order for wallet top-ups.
* **Auth**: Required
* **Request Schema (Zod)**:
  ```typescript
  const orderSchema = z.object({
    amount: z.number().min(25).max(10000) // topups restricted from ₹25 to ₹10,000
  });
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "id": "order_Rzp9923881",
    "amount": 50000,
    "currency": "INR",
    "status": "created"
  }
  ```

#### `POST /api/payment/verify`
* **Description**: Confirms Razorpay signature authenticity and updates wallet.
* **Auth**: Required
* **Request Schema (Zod)**:
  ```typescript
  const verifySchema = z.object({
    razorpayOrderId: z.string(),
    razorpayPaymentId: z.string(),
    razorpaySignature: z.string()
  });
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "creditsAdded": 50.0,
    "newBalance": 75.0
  }
  ```

---

## 3. Error Classification Matrix

| Status Code | Error Message | Scenario |
| :--- | :--- | :--- |
| `400` | `Invalid configuration on node...` | Missing language code, speaker voice, or invalid URL structure. |
| `401` | `Unauthorized` | Session expired, missing authentication cookie. |
| `402` | `Insufficient credits` | Wallet balance is lower than transaction cost or pipeline execution budget. |
| `404` | `Run record not found` | The requested execution trace does not exist or belongs to another user. |
| `429` | `You already have X runs in progress` | Concurrency ceiling hit; pipeline execution throttled. |
| `429` | `Daily limit reached` | Total credit spend in the last 24 hours has exceeded the ceiling. |
