<div align="center">

# ⚡ Pravah — Visual AI Pipeline Builder

**Enterprise-grade visual workflow orchestration engine for designing, connecting, and executing multi-modal Indic AI pipelines.**

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?logo=nodedotjs)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)](https://neon.tech/)
[![Vitest](https://img.shields.io/badge/Tests-400%20Passing-brightgreen?logo=vitest)](https://vitest.dev/)

[Features](#-key-features) • [Canvas Velocity](#-canvas-velocity--shortcuts) • [Templates](#-pre-built-pipeline-templates) • [Architecture](#-system-architecture) • [Deep Dive Docs](#-documentation--handbooks) • [Getting Started](#-getting-started) • [Tech Stack](#%EF%B8%8F-tech-stack)

</div>

---

## 📖 Overview

**Pravah** is a high-performance, full-stack visual workflow orchestration studio that empowers developers and teams to visually design, connect, and execute Directed Acyclic Graph (DAG) pipelines for advanced AI processing. 

Built on top of React Flow (`@xyflow/react`), Zustand, Next.js 16 (App Router), and integrated with **Sarvam AI**, Pravah enables end-to-end multi-modal workflows—spanning speech-to-text, translation, speech synthesis, document OCR, text classification, and custom LLM reasoning—without writing complex backend glue code.

---

## 🚀 Key Features

### ⚡ Flow Velocity & Modern Canvas UX
* **Multi-Step Undo / Redo History**: Complete state history stack (`⌘Z` / `⌘⇧Z`) with deep-cloned snapshot batching, preventing unintentional state loss.
* **Instant Command Palette (`⌘K`)**: Rapidly search, filter, and insert nodes directly onto the canvas at cursor coordinates, trigger canvas actions, or execute pipelines.
* **Topological Auto-Layout ("Tidy DAG")**: Layered rank BFS auto-layout algorithm that cleanly reorganizes chaotic or overlapping graphs into structured horizontal columns with vertical centering.
* **Pipeline JSON Export & Import**: Single-click export of complete workflow schemas to `.json` files and instant import to restore nodes and connections.
* **Empty Canvas Starter State**: Interactive watermark hero card offering 1-click access to templates, node search, and quick starter actions for blank pipelines.
* **Keyboard Hotkeys & Canvas Controls**: Fast node/edge deletion (`Delete`/`Backspace`), selection management (`⌘A`), canvas auto-fit (`⌘0`), zoom controls, and visual shortcut help (`?`).

### 📦 Pre-Built Indic AI Templates
* **🎙️ Voice Dubber & Translator**: `Audio Upload` ➔ `Saaras STT` ➔ `Mayura Translate` ➔ `Bulbul TTS` ➔ `Audio Out`
* **📄 Multilingual Document OCR & Summary**: `Document Input` ➔ `Sarvam Vision OCR` ➔ `Summarizer` ➔ `Text Out`
* **🎧 2-Speaker Indic Podcast Generator**: `Topic Prompt` ➔ `Conversational Podcast (2 hosts)` ➔ `Podcast Audio Out`
* **📊 Customer Audio Sentiment Analyzer**: `Customer Call Audio` ➔ `Saaras STT` ➔ `Sentiment Classifier` ➔ `Sentiment Report`

### 🎙️ Conversational AI Pipeline Builder
* **Natural Language Pipeline Generation**: Powered by Sarvam Sovereign LLM (`sarvam-105b`), allowing users to describe workflow requirements via text or voice to receive auto-configured visual flow previews.
* **In-Browser 16kHz PCM WAV Audio Capture**: Custom Web Audio API recording engine that encodes mono 16kHz PCM WAV files in-browser with automatic chunking, enabling voice descriptions up to 5 minutes without duration bottlenecks.
* **Spoken Language Selector & Structural Guarantees**: Choose speech input languages (EN, HI, TE, TA, BN, KN, MR) with automated translation and guaranteed fully connected DAG topologies (zero orphaned or dangling nodes).

### 🌐 Comprehensive Indic AI Integrations (Sarvam AI)
* **Speech-to-Text (STT)**: High-accuracy speech recognition across 23 Indic languages with automatic audio segment chunking for long-form recordings.
* **Multilingual Machine Translation**: Context-aware translation across 23 Indian languages.
* **Bulbul Text-to-Speech (TTS)**: Expressive, natural-sounding voice synthesis across 11 supported languages with multiple speaker personas and pacing controls.
* **Transliteration & Language Detection**: Script conversion and automated script/language identification for Romanised and code-mixed inputs.
* **Document & Vision OCR**: Extract structured text and tabular data from scanned documents, PDFs, and images with automated page counting.
* **Text Classification & Keyword Extraction**: Intelligent classification, tagging, and entity/keyword extraction nodes.

### 🧠 Enterprise RAG & Semantic Vector Search (`pgvector`)
* **Google Gemini Dense Embeddings**: Generates 768-dimensional semantic embeddings using `models/gemini-embedding-2` for passages, document chunks, and queries.
* **Sentence & Grapheme-Bounded Chunking (`pdf_splitter`)**: Splits English and Indic text on sentence boundaries (`.`, `!`, `?`, `।`) with word-safe overlap windows to prevent sliced words or broken Unicode matras.
* **Native PostgreSQL `pgvector` with HNSW Index**: Approximate Nearest Neighbor (ANN) index (`vector_cosine_ops`) delivering sub-millisecond retrieval across millions of vectors with strict tenant and pipeline isolation.
* **Smart Content-Hash Caching**: Deterministic SHA-256 fingerprinting that automatically detects unchanged documents and instantly reuses existing `pgvector` vectors—skipping redundant embedding API calls (100% credit savings and ~100x faster execution).

### ⚙️ Topological DAG Execution Engine
* **Dependency-Resolved Graph Execution**: Custom topological sorting algorithm (`Kahn's Algorithm`) that resolves node dependencies, detects circular dependencies, and executes parallelizable branches asynchronously.
* **Live Execution Stopwatch & Monitor**: Real-time streaming logs, node status indicators (idle, running, success, error), live stopwatch timer (`⏱ 00:04.2s`), and 1-click clipboard copy for node outputs.
* **Payload Inspection & Downloads**: Instant preview and single-click downloading of generated audio, translated text, and OCR artifacts.

### 🛡️ Granular Error Diagnostics & Self-Healing
* **Node Error Inspection Modal**: In-depth error dialogues with HTTP response codes, provider error mapping, stack traces, and actionable remediation steps.
* **Automatic Audio Normalization**: Automatic sample rate conversion, channel downmixing, and WAV header validation.

### 💳 Ledger-Backed Credit & Payment System
* **Razorpay Payment Gateway**: Seamless credit top-ups with server-side `HmacSHA256` signature verification and protection against mock payment bypasses in production.
* **Immutable Double-Entry Ledger**: Complete auditability with balance reservations, actual usage deduction, and automated credit refunds for failed runs.
* **Dynamic Cost Metering**: Granular pricing calculated per audio second, text character length, document page count, and LLM token usage.

### 📚 Interactive Public Docs & Node Catalog
* **Interactive Documentation (`/docs`)**: Built-in interactive documentation covering node configurations, pipeline execution rules, error handling, and API guides.
* **Node Catalog (`/nodes`)**: Comprehensive reference detailing all input/output schemas, configuration parameters, and recommended pipeline patterns.

---

## ⌨️ Canvas Velocity & Shortcuts

| Action | macOS Shortcut | Windows / Linux Shortcut | Description |
| :--- | :--- | :--- | :--- |
| **Command Palette** | `⌘ + K` | `Ctrl + K` | Search & insert nodes, run pipeline, fit view |
| **Zoom to Fit View** | `⌘ + 0` | `Ctrl + 0` | Center and fit graph within screen |
| **Keyboard Help** | `?` or `⌘ + /` | `?` or `Ctrl + /` | Open keyboard shortcuts modal |
| **Undo** | `⌘ + Z` | `Ctrl + Z` | Revert the last canvas change |
| **Redo** | `⌘ + ⇧ + Z` | `Ctrl + Y` / `Ctrl + ⇧ + Z` | Reapply the reverted canvas change |
| **Duplicate Node** | `⌘ + D` | `Ctrl + D` | Clone selected node with config |
| **Copy Node** | `⌘ + C` | `Ctrl + C` | Copy node to clipboard buffer |
| **Paste Node** | `⌘ + V` | `Ctrl + V` | Paste copied node onto canvas |
| **Run Pipeline** | `⌘ + ↵` | `Ctrl + Enter` | Trigger pipeline execution |
| **Save Flow** | `⌘ + S` | `Ctrl + S` | Persist pipeline changes |
| **Delete Selected** | `Backspace` / `Delete` | `Delete` | Remove selected nodes or edges |
| **Select All** | `⌘ + A` | `Ctrl + A` | Select all nodes on the canvas |
| **Pan Canvas** | `Space + Drag` | `Space + Drag` | Pan across the infinite canvas |

---

## 🏗️ System Architecture

Pravah follows an enterprise-grade, multi-tiered architecture designed for high-concurrency visual workflow design, resilient DAG execution, deterministic financial auditing, and sub-millisecond semantic retrieval across Indic languages.

```mermaid
graph TB
    %% Master Subgraphs
    subgraph CLIENT["🖥️ 1. Presentation & Flow Studio (Next.js 16 + React 19)"]
        UI["Visual Canvas Studio (/pipeline/[id])<br/>@xyflow/react & Viewport Culling"]
        ZS["Zustand 5 Store<br/>30-State Undo/Redo Ring Buffer (⌘Z/⌘⇧Z)"]
        CP["Command Palette (⌘K) &<br/>Topological Layered BFS Auto-Layout"]
        WA["In-Browser 16kHz PCM WAV Audio Encoder<br/>& Wavesurfer.js Reactive Visualizer"]
        NL["Conversational Pipeline Builder<br/>(Voice/Text Prompts via Sarvam-105B)"]
        UI <--> ZS
        ZS <--> CP & WA & NL
    end

    subgraph GATEWAY["🛡️ 2. Edge Gateway & Defensive Security Layer"]
        MW["Edge Middleware<br/>Session Cookie & Route Matcher"]
        NA["Auth.js / NextAuth v5<br/>Google OAuth + JWT + Instant Revocation"]
        RW["Typed route() Wrapper<br/>Opt-out Auth, Zod Validation, Error Sanitizer"]
        RL["Distributed Token-Bucket Rate Limiter<br/>Upstash Redis (Per-User & Per-IP Budgets)"]
        MW --> NA & RW
        RW --> RL
    end

    subgraph ENGINE["⚙️ 3. Topological DAG Execution Engine & Streaming"]
        DAG["Kahn's Topological Sorting Engine<br/>Dependency Graph & Cycle Detection"]
        VAR["Dynamic Variable Resolver<br/>{{nodeId.property}} State Interpolation"]
        PRN["Router & Branch Pruner<br/>Dead-Edge Pruning & Skip Propagation"]
        SSE["Server-Sent Events (SSE) Streamer<br/>POST /api/pipelines/[id]/run"]
        DAG --> VAR --> PRN --> SSE
    end

    subgraph RAG_SYS["🧠 4. Semantic RAG & Vector Engine (pgvector)"]
        SPLIT["Sentence & Grapheme-Safe Chunker<br/>(pdf_splitter with Indic Matra Preservation)"]
        GEMINI["Google Gemini Embedding Engine<br/>models/gemini-embedding-2 (768-dim Vectors)"]
        VEC["PostgreSQL pgvector Store<br/>HNSW Index (vector_cosine_ops)"]
        CACHE["Smart Content-Hash Cache<br/>SHA-256 Fingerprint Deduplication"]
        SPLIT --> CACHE
        CACHE -->|Cache Miss| GEMINI --> VEC
        CACHE -->|Cache Hit (100% Credit Saved)| VEC
    end

    subgraph SARVAM["🌐 5. Indic AI Foundation Layer (Sarvam AI)"]
        SDK["Sarvam API Client<br/>Exponential Backoff, Jitter & 25s Timeout"]
        STT["Saaras:v3 STT<br/>(Auto 30s Audio Slicing)"]
        TTS["Bulbul:v3 TTS<br/>(Sentence Slicing & WAV Concatenation)"]
        TR["Mayura:v1 Translate<br/>(23 Indic Languages & Dialects)"]
        LLM["Sarvam-105B LLM<br/>(Structured JSON Extraction & Reasoning)"]
        OCR["Document AI OCR<br/>(Multipage PDF & Scanned Images)"]
        LID["Transliteration & LID<br/>(Romanised to Native Script Conversion)"]
        SDK --> STT & TTS & TR & LLM & OCR & LID
    end

    subgraph FINANCES["💳 6. Financial Ledger & Wallet Engine"]
        RZ["Razorpay Payment Gateway<br/>Timing-Safe HMAC-SHA256 Verification"]
        HOLD["2-Phase Reservation Engine<br/>(RUN_RESERVATION Upfront Hold)"]
        METER["Dynamic Cost Metering<br/>(Per-Second, Per-Char, Per-Page, Per-Token)"]
        REAP["Stale Run Auto-Reaper Daemon<br/>(Auto-Refund Aborted & Lingering Runs)"]
        RZ --> HOLD
        HOLD <--> METER
        REAP -.-> HOLD
    end

    subgraph DATA["🗄️ 7. Storage & Multi-Tenant Persistence"]
        PG[("Neon Serverless PostgreSQL<br/>Prisma 6 ORM + pgvector")]
        R2[("Cloudflare R2 Object Storage<br/>Multi-Tenant Audio & File Isolation")]
        REDIS[("Upstash Redis Cluster<br/>Rate Limiting & Token Buckets")]
    end

    %% Cross-Tier Connections
    CLIENT -->|Save / Run Requests| MW
    RW -->|Dispatch Execution| DAG
    RL <--> REDIS
    DAG -->|Reserve Upfront Credits| HOLD
    HOLD <--> PG
    PRN -->|Execute Node Task| SDK
    PRN -->|Document & Query Retrieval| RAG_SYS
    RAG_SYS <--> PG
    SDK -->|Persist Media Outputs| R2
    SDK -->|Node Payloads| DAG
    DAG -->|Deduct Actual Cost / Refund Hold| HOLD
    DAG -->|Stream Node Spans via SSE| UI
    RZ <--> PG
    DAG -->|Persist PipelineRun & NodeRun Spans| PG
```

### 🏛️ Subsystem Architecture Breakdown

#### 1. Frontend & Visual Canvas State Engine (`src/store`, `src/components/flow`)
* **Decoupled Zustand 5 Architecture**: Canvas nodes and edges live in an external Zustand store, isolated from root layout renders. UI subcomponents subscribe through fine-grained atomic selectors (`usePipelineStore(s => s.nodes)`), preventing whole-canvas recalculations during node dragging.
* **30-State Deep-Cloned Ring Buffer**: Full undo/redo (`⌘Z` / `⌘⇧Z`) time-travel history. Structural mutations (`addNode`, `removeNode`, `duplicateNode`, `pasteNode`) push immutable structured clone snapshots onto the history stack.
* **Smart Change Filter (`isPersistedChange`)**: Filters out internal `@xyflow/react` dimension measurements and click selection events—ensuring the canvas is marked dirty **only** when graph topology or node configurations change.
* **Client-Side 16kHz PCM WAV Encoder**: Bypasses browser `MediaRecorder` WebM chunking limitations by capturing raw `Float32Array` audio via Web Audio API, prepending a 44-byte RIFF header, and writing signed 16-bit PCM samples in-memory for seamless downstream speech processing.

#### 2. Defensive Edge Gateway & Security Envelope (`src/lib/api/route.ts`, `src/middleware.ts`)
* **Secure-by-Default Wrapper**: All backend endpoints are wrapped with `route()`, enforcing authentication by default (`auth: true`), Zod input schema validation, and structured error masking (preventing internal stack trace leakage).
* **NextAuth v5 with Instant Revocation**: Authentication checks cross-reference session JWT timestamps against `User.sessionsRevokedAt` in Neon PostgreSQL on every request, ensuring instant revocation upon sign-out without waiting for JWT expiration.
* **Distributed Token-Bucket Rate Limiter**: Backed by Upstash Redis, enforcing tiered token budgets (e.g., cheap reads cost 1 token, Sarvam AI invocations cost 5–10 tokens, and full pipeline runs cost 25 tokens) with per-user and IP fallback limits.

#### 3. Topological DAG Execution Engine (`src/lib/execution.ts`)
* **Kahn's Topological Sorting**: Analyzes the directed acyclic graph, computes in-degrees, verifies acyclicity, and derives optimal execution sequences with parallelizable branch dispatch.
* **Dynamic Variable Interpolation**: Resolves template variables (`{{nodeId.property}}` or `{{nodeId}}`) across upstream outputs before passing input arguments downstream.
* **Router Nodes & Dead-Edge Pruning**: Evaluates conditional expressions (`equals`, `contains`, `sentiment`, `gt`, `lt`). Unmatched branches are tagged as `deadEdges`, propagating `skipped` status downstream without consuming API credits or halting execution.
* **Real-time Server-Sent Events (SSE)**: Streams execution events (`run_started`, `node_started`, `node_completed`, `node_failed`, `run_completed`) directly over an HTTP/2 `ReadableStream`. Client disconnection triggers `AbortController.abort()`, invoking cleanup handlers that immediately refund unspent held credits.

#### 4. Semantic RAG & Vector Engine (`src/lib/geminiEmbeddings.ts`, `src/lib/vectorStore.ts`)
* **Sentence & Grapheme-Safe Splitter**: Splits multi-lingual text along sentence boundaries (`.`, `!`, `?`, `।`) while preserving Indic Unicode conjuncts (matras), preventing fragmented character corruption.
* **Google Gemini Dense Embeddings**: Generates 768-dimensional semantic vector embeddings using `models/gemini-embedding-2` for passages, queries, and document chunks.
* **Neon PostgreSQL `pgvector` with HNSW Indexing**: Approximate Nearest Neighbor (ANN) vector indexing (`vector_cosine_ops`) enabling sub-millisecond vector similarity search with strict project- and tenant-level isolation.
* **Smart Content-Hash Caching**: SHA-256 fingerprinting recognizes identical documents, skipping external embedding calls completely and reusing existing vector rows (delivering 100% cost savings and ~100x retrieval speedups on unchanged documents).

#### 5. Indic AI Foundation Layer (`src/lib/sarvam.ts`)
* **Unified Sarvam AI Client**: Resilient wrapper supporting Saaras STT (with automatic 30s chunking), Bulbul TTS (with parallel sentence slicing and binary WAV header concatenation), Mayura Translation across 23 Indic languages, Sarvam-105B Sovereign LLM, and Document AI OCR.
* **Fault-Tolerant Exponential Backoff**: Automatic retry policies for transient network failures (`408`, `425`, `429`, `5xx`) with jitter, `Retry-After` adherence, and strict 25-second timeouts.

#### 6. Double-Entry Credit Ledger & Financial Integrity (`src/lib/api/credits.ts`, `src/lib/api/pricing.ts`)
* **Two-Phase Reservation System**: Reserves `RUN_RESERVATION` credits upfront prior to invoking third-party APIs. On pipeline completion or failure, the actual cost is metered and the difference is refunded back to the user's wallet.
* **Timing-Safe Payment Verification**: Razorpay order signatures are validated using `crypto.timingSafeEqual` against server-calculated HMAC-SHA256 digests. Payment credit amounts are strictly retrieved from server database records, ignoring client-submitted payloads.
* **Concurrency Lock**: Prevents duplicate credit race conditions through status guards (`where: { status: { not: 'paid' } }`) within an atomic Prisma transaction.
* **Stale Run Auto-Reaper**: Background daemon scans for runs lingering beyond threshold timeouts (due to node crashes or server restarts), safely marking them failed and restoring reserved balances.

#### 7. Multi-Tenant Storage & Persistence (`prisma/schema.prisma`, `src/lib/r2.ts`)
* **Neon Serverless PostgreSQL**: Relational persistence managed via Prisma ORM 6 with connection pooling for serverless elasticity.
* **Cloudflare R2 Object Storage**: Private S3-compatible bucket storing user-uploaded audio and synthesized artifacts, protected by provenance checks (`assertObjectAccess`) to prevent Insecure Direct Object References (IDOR).
* **Distributed Redis**: Upstash Redis powering global sliding-window rate limit counters and transient caches.

---

## 📚 Documentation & Handbooks

Deep-dive technical guides and architectural specifications are available in the repository:

* 🏛️ **[Master System Architecture & Interview Compendium](file:///Users/sairaghukiranavula/Projects/test_project_flow/PRAVAH_MASTER_SYSTEM_ARCHITECTURE_AND_INTERVIEW_COMPENDIUM.md)**: End-to-end architecture, DAG engine design, state management, and technical reference.
* 💳 **[Payment Integration & Wallet Ledger Deep Dive](file:///Users/sairaghukiranavula/Projects/test_project_flow/PAYMENT_INTEGRATION_AND_CREDIT_SYSTEM_DEEP_DIVE.md)**: Razorpay webhooks, signature verification, balance reservation lifecycle, and credit metering.
* 🎙️ **[Sarvam AI Integrations & Methods Deep Dive](file:///Users/sairaghukiranavula/Projects/test_project_flow/SARVAM_AI_INTEGRATIONS_DEEP_DIVE.md)**: Detailed API contracts, audio chunking, STT/TTS limits, and translation integrations.
* 🎯 **[Senior Frontend Interview Master Guide](file:///Users/sairaghukiranavula/Projects/test_project_flow/INTERVIEW_MASTER_GUIDE.md)**: React 19 performance patterns, canvas rendering optimization, and architectural decisions.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Runtime & Framework** | Node.js 24.x, Next.js 16 (App Router), React 19, TypeScript 5 |
| **Flow Canvas & UI** | `@xyflow/react` (React Flow), Tailwind CSS 4, Lucide React, WaveSurfer.js |
| **State Management** | Zustand 5 with custom snapshot history stack & auto-layout engine |
| **Database & ORM** | Neon Serverless PostgreSQL, Prisma ORM 6, `pgvector` with HNSW Indexing |
| **Authentication** | Auth.js / NextAuth v5 (Google OAuth & Credentials) |
| **AI & Indic Processing**| Sarvam AI (STT, TTS, Translate, Transliterate, Vision OCR, Sarvam-105b LLM) |
| **Embeddings & RAG** | Google Gemini (`gemini-embedding-2` - 768-dim dense semantic vectors) |
| **Storage & Caching** | Cloudflare R2 (S3-compatible SDK), Upstash Redis (Distributed Rate Limiting) |
| **Payments** | Razorpay SDK with `HmacSHA256` webhook/order verification |
| **Testing & Quality** | Vitest 3 (400 Tests Passing), ESLint 9 |

---

## 📦 Getting Started

### Prerequisites
* **Node.js**: `24.x` (or `>= 20.x`)
* **Package Manager**: `npm` (or `pnpm` / `yarn`)
* **PostgreSQL Database**: [Neon](https://neon.tech/) or standard PostgreSQL instance with `pgvector`
* **API Keys**:
  * [Google Gemini API Key](https://aistudio.google.com/) (for RAG & Vector Embeddings)
  * [Sarvam AI API Key](https://www.sarvam.ai/)
  * [Razorpay Key ID & Secret](https://razorpay.com/)
  * [Cloudflare R2 Credentials & Bucket](https://www.cloudflare.com/developer-platform/r2/)
  * [Upstash Redis URL & Token](https://upstash.com/) (for rate limiting)
  * Google OAuth Credentials (for NextAuth)

---

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sairaghukiran14/pravah.git
   cd pravah
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Copy the example environment template and configure your secrets:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your `.env.local` file:
   ```env
   # Auth.js / NextAuth v5
   NEXTAUTH_URL="http://localhost:3000"
   AUTH_URL="http://localhost:3000"
   AUTH_SECRET="your_generated_32_character_secret"
   AUTH_GOOGLE_ID="your_google_client_id"
   AUTH_GOOGLE_SECRET="your_google_client_secret"

   # Neon PostgreSQL Database with pgvector
   DATABASE_URL="postgresql://user:password@ep-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://user:password@ep.us-east-2.aws.neon.tech/neondb?sslmode=require"

   # Google Gemini (Dense Embeddings & RAG)
   GEMINI_API_KEY="your_gemini_api_key"

   # Sarvam AI
   SARVAM_API_KEY="your_sarvam_api_key"

   # Cloudflare R2 Storage
   R2_ACCOUNT_ID="your_r2_account_id"
   R2_ACCESS_KEY_ID="your_r2_access_key"
   R2_SECRET_ACCESS_KEY="your_r2_secret_key"
   R2_BUCKET_NAME="your_bucket_name"

   # Razorpay Payments
   RAZORPAY_KEY_ID="your_razorpay_key_id"
   RAZORPAY_KEY_SECRET="your_razorpay_key_secret"

   # Upstash Redis (Rate Limiting)
   UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your_upstash_token"
   ```

4. **Initialize Database Schema & pgvector Extension**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Pravah comes with a comprehensive Vitest suite covering execution engine topology, node error diagnostics, rate limiting, audio encoding, credit metering, state store history, and vector search.

```bash
# Run all unit and integration tests (400 tests)
npm test

# Run tests in watch mode
npm run test:watch

# Run route safety verification
npm run verify:routes

# Run full project validation (routes, types, lint, tests)
npm run check
```

---

## 📂 Project Structure

```text
├── src/
│   ├── app/                    # Next.js App Router (pages, layouts, API routes)
│   │   ├── api/                # REST API routes (pipelines, payments, audio, sarvam)
│   │   ├── dashboard/          # Project dashboard and pipeline listings
│   │   ├── docs/               # Interactive public documentation route
│   │   ├── nodes/              # Public node catalog directory
│   │   ├── pipeline/[id]/      # Visual workflow canvas workspace
│   │   └── profile/            # User account, ledger, and billing settings
│   ├── components/
│   │   ├── flow/               # React Flow canvas, Toolbar, ConfigPanel, NodeErrorDialog
│   │   │   ├── nodes/          # Custom node types (STT, TTS, Translate, Generic, Base)
│   │   │   ├── AIPipelineBuilder.tsx # Conversational AI builder with voice input
│   │   │   ├── CommandPalette.tsx    # Fast search & insertion palette
│   │   │   ├── TemplatesModal.tsx    # Pre-built Indic pipeline templates picker
│   │   │   └── ShortcutsModal.tsx    # Keyboard shortcuts cheat sheet
│   │   └── layout/             # Navigation header, modals, notifications
│   ├── lib/
│   │   ├── api/                # Rate limiting, pricing, retention, and error utilities
│   │   ├── audio/              # WAV encoding, limits, normalization & chunking
│   │   ├── documents/          # Document & OCR page count utilities
│   │   ├── execution.ts        # Topological DAG engine & Kahn's sorting algorithm
│   │   ├── geminiEmbeddings.ts # Google Gemini dense embedding service & cosine similarity
│   │   ├── vectorStore.ts      # PostgreSQL pgvector persistence, HNSW search & smart cache
│   │   ├── sarvam.ts           # Sarvam AI API client integration
│   │   └── templates.ts        # Pipeline presets catalog & auto-layout algorithm
│   └── store/
│       └── pipelineStore.ts    # Zustand canvas state, history stack & DAG operations
├── prisma/
│   ├── schema.prisma           # Prisma database schema and models
│   └── migrations/             # SQL migrations (pgvector & HNSW index setup)
└── public/                     # Static assets and brand logos
```

---

## 📄 License

This project is proprietary software. All rights reserved.
