# 📚 Pravah AI Documentation Directory

Welcome to the **Pravah AI** documentation and architectural specifications library. This folder contains all technical deep dives, system blueprints, payment lifecycle specifications, evaluation roadmaps, interview guides, and interactive visual architecture diagrams.

---

## 📑 Table of Contents

### 🏛️ System Architecture & Engineering
* **[Master System Architecture & Interview Compendium](./PRAVAH_MASTER_SYSTEM_ARCHITECTURE_AND_INTERVIEW_COMPENDIUM.md)**
  * Complete end-to-end technical reference: React 19 / Next.js 16 App Router frontend, Zustand 5 state machine with 30-state time-travel ring buffer, Kahn's topological DAG execution engine, in-browser 16kHz PCM WAV encoding, SSE streaming, and 25+ model interview Q&As.
* **[API Routes & Architectural Decisions](./API_ROUTES_AND_DECISIONS.md)**
  * Defensive API route design (`route()` wrapper), rate limiting policies, multi-tenant database isolation, Zod validation schemas, and error sanitization strategies.

### 🌐 AI Models & Multimodal Integrations
* **[Sarvam AI Integrations Deep Dive](./SARVAM_AI_INTEGRATIONS_DEEP_DIVE.md)**
  * Exhaustive reference for Sarvam Indic foundation models: Saaras:v3 Speech-to-Text with automated 30s chunking, Bulbul:v3 Text-to-Speech with sentence slicing and WAV header concatenation, Mayura translation across 23 Indic languages, Sarvam-105B LLM prompt engineering, Document AI OCR, and phonetic transliteration.

### 💳 Payments, Ledger & Credit Economics
* **[Payment Integration & Credit System Deep Dive](./PAYMENT_INTEGRATION_AND_CREDIT_SYSTEM_DEEP_DIVE.md)**
  * Razorpay payment lifecycle, timing-safe HMAC-SHA256 signature verification, two-phase credit reservations (`RUN_RESERVATION`), dynamic cost metering, double-credit concurrency locks, and stale run auto-reaper mechanics.

### 🎯 Evaluation, Quality & Roadmaps
* **[Eval & Regression Suite Roadmap](./EVAL_AND_REGRESSION_SUITE_ROADMAP.md)**
  * Quality metrics suite covering STT Word Error Rate (WER), translation BLEU/ChrF scoring, LLM Judge evaluation harness, and dataset regression test matrix.
* **[Senior Frontend Interview Master Guide](./INTERVIEW_MASTER_GUIDE.md)**
  * Senior and Staff Frontend engineering questions: React Flow performance optimization, viewport culling, canvas layout algorithms, state subscription isolation, and Web Audio API architecture.

---

## 🎨 Interactive Visual Reports & Architecture Tools (HTML)

The following standalone HTML applications can be opened directly in any web browser for interactive visualization:

| Document | Format | Description |
| :--- | :--- | :--- |
| **[Master Architecture Diagram](./pravah-architecture-diagram.html)** | Interactive HTML | Zoomable, pan-able interactive Mermaid architecture diagrams with dark modern UI |
| **[Architecture PDF Report](./pravah-architecture-pdf.html)** | Printable HTML | Print-ready, single-document formatted system architecture compendium |
| **[Upstash Redis Architecture](./upstash-redis-architecture.html)** | Interactive HTML | Visual diagram and explanation of distributed token-bucket rate limiting |
| **[Pitch Playbook](./pravah-pitch-playbook.html)** | Interactive HTML | Product presentation deck, competitive differentiators, and system capabilities |
| **[Post-Launch Playbook](./pravah-post-2-playbook.html)** | Interactive HTML | Platform rollout playbook and user acquisition strategy |
| **[Verification Report](./pravah-verification-report.html)** | HTML Report | Test execution suite, route safety audits, and project health checks |
