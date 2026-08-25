# 🎓 Pravah AI — The Complete Senior Frontend & Full-Stack Interview Handbook

> **Project Name:** Pravah AI (Visual Multimodal Indic AI Workflow Platform)  
> **Target Roles:** Senior Frontend Engineer / Full-Stack Engineer / Frontend Architect  
> **Key Technologies:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, `@xyflow/react` (React Flow), Zustand, Server-Sent Events (SSE), Web Audio API, Cloudflare R2, Prisma ORM, PostgreSQL.

---

## 📑 Table of Contents
1. [The 60-Second Elevator Pitch](#1-the-60-second-elevator-pitch)
2. [Complete Architecture & Data Flow Diagram](#2-complete-architecture--data-flow-diagram)
3. [Deep-Dive Module Breakdowns](#3-deep-dive-module-breakdowns)
   - A. React Flow Canvas & Custom Node Rendering
   - B. Zustand State Architecture & Temporal History Engine (`⌘Z` / `⌘⇧Z`)
   - C. Real-Time Streaming & Topological Execution Engine (SSE)
   - D. Client-Side Audio Engineering & In-Browser WAV Encoding
   - E. Security, Multi-Tenancy & Financial Integrity
4. [30+ Technical Interview Questions & Model Answers](#4-30-technical-interview-questions--model-answers)
   - Core React & Next.js Architecture
   - Canvas & State Management
   - Audio & Binary Streaming
   - Performance & Optimization
   - Security & Backend Integration
5. [System Design & Scale (Handling 100k+ Users)](#5-system-design--scale-handling-100k-users)
6. [STAR Method Behavioral Answers](#6-star-method-behavioral-answers)

---

## 1. The 60-Second Elevator Pitch

> *"**Pravah AI** is a visual workflow builder and execution engine designed to chain multimodal Indic AI capabilities across 22+ languages—including Speech-to-Text, Indic LLMs, Multi-speaker Voice Cloning, Document OCR, and Translation.*
> 
> *As the frontend architect, I built a zero-latency canvas experience using **React Flow** and **Zustand**, implementing a custom **temporal history ring-buffer for instant Undo/Redo**, a fuzzy-search **`⌘K` Command Palette**, client-side **16-bit PCM WAV encoding** using `DataView` buffers, and real-time **Server-Sent Events (SSE)** streaming that visualizes DAG execution progress live with sub-millisecond node state updates."*

---

## 2. Complete Architecture & Data Flow Diagram

```mermaid
graph TD
    subgraph Client [Browser / React 19 Client Engine]
        UI[App Router UI & Tailwind CSS v4]
        Canvas[React Flow Canvas Engine / @xyflow/react]
        Store[Zustand Store: State + 30-State History Ring Buffer]
        CmdPal[Command Palette ⌘K & Keyboard Manager]
        AudioWorklet[In-Browser Float32Array to 16-Bit PCM WAV Encoder]
        WaveVisual[Wavesurfer.js Reactive Audio Player]
    end

    subgraph StreamingLayer [Real-Time Streaming & Communication]
        SSEStream[Server-Sent Events / ReadableStream over HTTP]
        APIRoute[Next.js Typed Route Handlers with Zod Validation]
    end

    subgraph ServerEngine [Backend Orchestration & Storage]
        DAGExecutor[Topological DAG Engine & Variable Resolver]
        DB[(Prisma ORM + PostgreSQL / Neon Serverless)]
        R2Storage[(Cloudflare R2 Object Store)]
        SarvamAI[Sarvam AI Indic Foundation Models]
    end

    Canvas <--> Store
    Store <--> CmdPal
    Canvas --> AudioWorklet
    Canvas --> WaveVisual
    UI --> APIRoute
    Canvas -->|POST /api/pipelines/[id]/run| SSEStream
    SSEStream <--> DAGExecutor
    DAGExecutor --> SarvamAI
    DAGExecutor --> DB
    AudioWorklet -->|Upload / Proxy| R2Storage
```

---

## 3. Deep-Dive Module Breakdowns

### A. React Flow Canvas & Custom Node Rendering
* **How It Works:** The canvas leverages `@xyflow/react` to render a zoomable, pannable infinite graph.
* **Custom Nodes:** Custom node components (e.g., `STTNode`, `TranslateNode`, `TTSNode`, `GenericNode`) render category-based accents, live execution badges (`pending`, `running`, `completed`, `failed`), and embedded audio wave players.
* **Custom Edges (`DeletableEdge`):** Custom animated SVG edges with interactive deletion buttons and hover effects.
* **Performance Strategy:** Snap-to-grid (`[15, 15]`), viewport culling (React Flow only renders what is inside the viewport), and memoized node renderers prevent DOM bloat on large diagrams.

---

### B. Zustand State Architecture & Temporal History Engine (`⌘Z` / `⌘⇧Z`)
* **State Decoupling:** Canvas state (`nodes`, `edges`, `selectedNodeId`, `nodeStatuses`, `nodeOutputs`) is maintained in an external Zustand store. React components subscribe only to granular selectors (`usePipelineStore(s => s.selectedNodeId)`), eliminating unnecessary re-renders across unaffected nodes.
* **Smart Change Filter (`isPersistedChange`):** React Flow triggers internal measurement events (`dimensions`) and focus events (`select`). We implemented an event filter so internal layout bookkeeping does not mark a saved pipeline as "Dirty".
* **Undo/Redo Ring Buffer:**
  * `past: HistorySnapshot[]` (bounded to 30 snapshots).
  * `future: HistorySnapshot[]`.
  * Every topological mutation (`addNode`, `removeEdge`, `duplicateNode`, `pasteNode`) takes a structured clone snapshot of the graph before applying updates.
  * `undo()` and `redo()` actions restore graphs cleanly without mutating references.
* **Power Shortcuts:**
  * `⌘D` / `Ctrl+D`: Clones selected node with duplicate configuration at `(+40px, +40px)`.
  * `⌘C` / `⌘V`: In-memory node clipboard copy and paste.
  * Input-safe: Automatically suppressed when typing in form controls or content-editable elements.

---

### C. Real-Time Streaming & Topological Execution Engine (SSE)
* **The Challenge:** Multi-step pipelines take 5–25 seconds. Polling is inefficient; single-response HTTP leaves users with no progress visibility.
* **The Solution (SSE):**
  * The frontend initiates a single `fetch` request to `/api/pipelines/[id]/run` with an `Accept: text/event-stream` header.
  * The server runs a **Kahn’s Topological Sort** on nodes and edges, resolving upstream outputs into downstream inputs (supporting variable substitution like `{{node_1.transcript}}`).
  * The server emits SSE events:
    1. `run_started`: Initializes pipeline run record in DB.
    2. `node_started`: Activates pulsing border animations on the active node.
    3. `node_completed`: Sends output payload; updates Zustand store; downstream node picks up data.
    4. `node_skipped`: Sent if a conditional router branch evaluated to false.
    5. `run_completed`: Finalizes execution and settles held wallet credits.
* **Client Cancellation:** If the user clicks "Stop Execution", the frontend triggers an `AbortController.abort()`, terminating the readable stream. The backend `finally` block catches the termination and immediately refunds unspent held credits.

---

### D. Client-Side Audio Engineering & In-Browser WAV Encoding
* **The Problem:** Modern browser microphone recording (`MediaRecorder`) outputs compressed WebM chunks. When sending audio to external speech APIs that require sentence chunking, WebM cannot be sliced on byte boundaries without server-side transcoding.
* **The Solution:**
  * Created an in-browser **PCM WAV encoder** using `AudioContext` and `DataView`.
  * Directly converts `Float32Array` audio samples into 16-bit signed PCM integers and writes a standard **44-byte RIFF/WAVE header** at 16kHz Mono.
  * **Result:** Audio recordings are 100% compliant with speech recognition APIs and can be cleanly split into sentence chunks on the fly.
* **Binary WAV Concatenation:** For multi-sentence TTS synthesis, the backend parallelizes speech generation and concatenates WAV buffers by dynamically recalculating the RIFF total size and data subchunk length.

---

### E. Security, Multi-Tenancy & Financial Integrity
* **IDOR (Insecure Direct Object Reference) Protection:** Every DB query enforces tenant boundaries (`where: { id: params.id, project: { userId } }`).
* **Financial Integrity:** In `/api/payment/verify`, the wallet credit amount is read strictly from the server-side `PaymentOrder` record, ignoring client-supplied values. Signatures are validated with `crypto.timingSafeEqual` to eliminate timing attacks.
* **Instant Session Revocation:** When a user clicks "Sign Out Everywhere", the server updates `sessionsRevokedAt`. The NextAuth JWT callback verifies `token.iat` against `sessionsRevokedAt`, instantly invalidating tokens on the next request.
* **Storage Access Verification:** Cloudflare R2 audio downloads check object provenance via `assertObjectAccess`, verifying that either the key embeds the user ID (`audio_input_<userId>_*`) or belongs to a `NodeRun` owned by that user's project.

---

## 4. 30+ Technical Interview Questions & Model Answers

### Category 1: React 19, Next.js 16 & Frontend Core

#### Q1: "Why did you use Next.js 16 App Router instead of standard React SPA (Vite)?"
> **Answer:** *"Next.js 16 App Router gave us the ideal balance of fast static landing page rendering with zero-JS server components (RSC), paired with client-rendered dynamic interactive routes (`'use client'`) for the canvas. It also provided built-in edge middleware for cookie session verification and unified route handlers (`/api/*`) with streaming `ReadableStream` responses, eliminating the need for a separate Node.js server."*

#### Q2: "How does React 19 change the way state and forms are handled in this app?"
> **Answer:** *"React 19 provides enhanced hydration and refined event dispatching. We utilized React 19's optimized ref handling (direct `ref` props without `forwardRef` boilerplate) and paired it with Zustand's out-of-component subscription model to keep high-frequency node dragging at 60 FPS without triggering React component re-renders."*

#### Q3: "How do you prevent hydration mismatches with dynamic client state (like canvas nodes or local theme)?"
> **Answer:** *"For canvas components that rely on browser dimensions and local storage, we render them inside `'use client'` boundaries with a mounted check (`useEffect`) or suppress hydration warnings on dynamic timestamps. In React Flow, `<ReactFlowProvider>` ensures canvas layout coordinates are calculated only after the browser DOM is ready."*

---

### Category 2: Graph Canvas & State Architecture

#### Q4: "How does Zustand prevent re-renders when dragging nodes on the canvas?"
> **Answer:** *"Zustand uses an external store with publish-subscribe mechanics. Instead of doing `const store = usePipelineStore()`, which subscribes the component to every state change, components use atomic selectors like `usePipelineStore(s => s.nodes)`. When a single node's position changes, only components selecting that specific slice re-render, while toolbar, sidebar, and config panels remain untouched."*

#### Q5: "How does your Undo/Redo history stack work under the hood?"
> **Answer:** *"We maintain two arrays in Zustand: `past` and `future`, capped at 30 snapshots to bound memory usage. Before any destructive or structural action (`addNode`, `removeNode`, `removeEdge`, `duplicateNode`), we take a structured clone of `{ nodes, edges }` and push it onto `past`, while resetting `future`. When `undo()` is triggered, we pop from `past`, push the current state to `future`, and restore the previous graph."*

#### Q6: "How did you ensure that clicking around or internal React Flow events don't mark the pipeline as unsaved?"
> **Answer:** *"React Flow emits `onNodesChange` events with different types: `dimensions`, `select`, `position`, `remove`, etc. On initial mount, React Flow fires `dimensions` changes to measure nodes in the DOM. We wrote a helper `isPersistedChange` that ignores `dimensions` and `select` changes, only setting `isDirty = true` when position or graph structure changes."*

#### Q7: "How did you build the `⌘K` Command Palette?"
> **Answer:** *"We created `CommandPalette.tsx` which listens for global `⌘K` / `Ctrl+K` keydowns. It maintains an active query filter across all 25+ node types with category tagging. It handles full keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter` to insert, `Esc` to close) and calculates the exact center coordinates of the current viewport using `screenToFlowPosition` so the node drops right in front of the user."*

---

### Category 3: Streaming, Execution & Web Audio

#### Q8: "Why did you choose Server-Sent Events (SSE) over WebSockets for pipeline execution?"
> **Answer:** *"Pipeline execution is strictly a one-way stream from server to client (progress logs, node statuses, outputs) initiated by a single HTTP POST request. SSE runs over standard HTTP/2, requires no socket server infrastructure, natively supports browser reconnection, and works out-of-the-box in serverless Next.js route handlers via `ReadableStream`."*

#### Q9: "How does the DAG executor handle circular dependencies or branch pruning?"
> **Answer:** *"The executor runs **Kahn's Algorithm** for topological sorting. It calculates in-degrees of all nodes. If a cycle exists, any remaining nodes are appended safely to prevent infinite loops. For conditional routing, if a router node chooses the 'false' branch, all downstream edges on the 'true' branch are added to a `deadEdges` set, and dependent nodes are marked `skipped` without executing."*

#### Q10: "How does the in-browser WAV encoder work?"
> **Answer:** *"Microphone audio from `AudioContext` produces raw floating-point PCM samples (`Float32Array`). We allocate an `ArrayBuffer` with 44 bytes for the RIFF/WAVE header plus `samples.length * 2` bytes for 16-bit audio. Using a `DataView`, we write ASCII tags (`RIFF`, `WAVE`, `fmt `, `data`), specify 16kHz mono PCM (format 1, 1 channel, 16-bit depth), convert floats to signed 16-bit integers (`s < 0 ? s * 0x8000 : s * 0x7fff`), and return a standard `Blob` with MIME `audio/wav`."*

#### Q11: "How do you handle variable substitution like `{{node_123.text}}` between nodes?"
> **Answer:** *"We built a regex resolver `replaceVariables(text, nodeOutputs)` that matches `\{\{([^}]+)\}\}`. It parses dot-notation paths (e.g. `nodeId.property`), resolves against completed node outputs in the run context, and substitutes the extracted text or JSON property before dispatching the node to Sarvam AI."*

---

### Category 4: Performance, Memory & Production Resilience

#### Q12: "How do you prevent memory leaks when dealing with audio playback in the browser?"
> **Answer:** *"Whenever dynamic audio is received via Base64 or Blob, converting it to an Object URL (`URL.createObjectURL(blob)`) allocates memory in the browser's native heap. We ensure all audio player components call `URL.revokeObjectURL(url)` in their `useEffect` cleanup return function when nodes unmount or when audio sources change."*

#### Q13: "What prevents a malicious user from minting unlimited wallet credits in your payment flow?"
> **Answer:** *"The client never dictates the top-up credit amount in the verification request. When `/api/payment/order` creates a Razorpay order, the amount is saved in our PostgreSQL database. During `/api/payment/verify`, the credited amount is read strictly from the server's `PaymentOrder` record, and we verify the payment status directly with Razorpay's API inside an atomic database transaction with `status: { not: 'paid' }` concurrency guards."*

#### Q14: "How do you prevent large audio files from blowing up your database size when saving pipelines?"
> **Answer:** *"Before saving a pipeline graph, `pipelineStore.savePipeline` scans node configs with `stripBinaryData`. If a node contains base64 audio, it uploads the binary to Cloudflare R2 storage first, replaces the base64 payload with a clean R2 key URL (`/api/audio/file?key=...`), and saves only the metadata JSON in PostgreSQL."*

---

## 5. System Design & Scale (Handling 100k+ Users)

If asked: *"How would you scale Pravah AI from 1,000 to 100,000 active users?"*

```
Scalability Roadmap:
1. Execution Queue:
   - Move from Next.js serverless HTTP SSE to an asynchronous worker tier using Redis + BullMQ.
   - Serverless route enqueues a job; distributed worker pools execute Sarvam AI calls; WebSockets (Socket.io/Pusher) push events to client.

2. Database Connection Pooling:
   - Use Neon Connection Pooling with PgBouncer to handle 10,000+ concurrent database connections without exhaustion.

3. Canvas Web Workers:
   - Offload heavy graph topology calculations, Dagre auto-align algorithms, and client-side WAV encoding to dedicated Web Workers.

4. Edge Caching:
   - Serve static node icons, pipeline templates, and public voice samples through Cloudflare CDN Edge Cache with Cache-Control immutable headers.
```

---

## 6. STAR Method Behavioral Answers

### Behavioral Question 1: "Describe a time when you had to debug a difficult performance issue."
* **Situation:** Early in development, dragging nodes on large visual pipelines caused noticeable stutter and frame drops below 30 FPS.
* **Task:** I needed to eliminate rendering bottlenecks and ensure 60 FPS buttery smooth interactions on any device.
* **Action:** I profiled the canvas using Chrome DevTools Performance tab and discovered that React Flow's `onNodesChange` was triggering whole-canvas re-renders. I migrated graph state to Zustand, added atomic selectors to custom nodes, and introduced `isPersistedChange` to filter out non-essential dimensions measurements.
* **Result:** Reduced canvas re-render count by **85%**, maintaining a consistent 60 FPS even with 100+ interconnected nodes.

---

### Behavioral Question 2: "Tell me about a time you prioritized user experience over quick implementation."
* **Situation:** When implementing voice recording, default browser `MediaRecorder` outputs WebM format, which failed when sent to speech models that chunk audio on sentence boundaries.
* **Task:** Rather than forcing users to manually upload pre-formatted WAV files, I wanted seamless one-click microphone recording.
* **Action:** I wrote a custom in-browser PCM WAV encoder using `AudioContext` and `DataView` to construct 16kHz mono WAV files directly in memory before upload.
* **Result:** Users can record voice notes of any length in any browser and immediately transcribe them across 22 Indic languages with zero conversion errors.

---

*This guide contains everything you need to showcase senior-level engineering mastery across React, Next.js, state machines, real-time audio, and scalable architecture.*
