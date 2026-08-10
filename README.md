<div align="center">

# ⚡ Pravah — Visual AI Pipeline Builder

**Visual drag-and-drop workflow orchestration engine for building, connecting, and executing complex AI pipelines.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

Pravah is a powerful, full-stack workflow orchestration studio that allows users to programmatically design, connect, and execute Directed Acyclic Graph (DAG) pipelines for AI processing. With an intuitive drag-and-drop interface, developers and teams can easily build complex audio, translation, and text-processing workflows without writing backend integration code.

## 🚀 Key Features

* **Visual Workflow Orchestration**: Built on React Flow, enabling seamless drag-and-drop node connections to construct complex DAG pipelines.
* **Indic AI Integrations**: Deeply integrated with Sarvam AI to provide:
  * Real-time Speech-to-Text (STT) processing
  * Multilingual machine translation across 10+ Indic languages
  * Natural-sounding Text-to-Speech (TTS) synthesis
* **Custom Execution Engine**: A robust, topological sort-based backend engine that resolves dependencies and runs asynchronous multi-node data pipelines while capturing granular, node-level execution logs.
* **Pay-As-You-Go Billing**: Secure, credit-based billing system integrated with Razorpay. Features server-side webhook/payment signature verification and dynamic execution cost deduction.
* **File & Media Handling**: Automated upload processing and secure cloud storage utilizing Cloudflare R2.

## 🛠️ Tech Stack

* **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
* **State Management**: Zustand, React Flow
* **Backend**: Node.js API Routes, custom topological execution engine
* **Database**: PostgreSQL (hosted on Neon), Prisma ORM
* **Payments**: Razorpay SDK
* **Storage**: Cloudflare R2

## 📦 Getting Started

### Prerequisites
* Node.js 18+
* PostgreSQL Database URL
* Razorpay API Keys
* Sarvam AI API Keys
* Cloudflare R2 Credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sairaghukiran14/pravah.git
   cd pravah
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory and add your keys:
   ```env
   DATABASE_URL="postgresql://user:password@neon.tech/db"
   DIRECT_URL="postgresql://user:password@neon.tech/db"
   
   # Razorpay
   RAZORPAY_KEY_ID="your_key"
   RAZORPAY_KEY_SECRET="your_secret"
   
   # Sarvam AI
   SARVAM_API_KEY="your_sarvam_key"
   
   # Cloudflare R2
   R2_ACCOUNT_ID="your_account_id"
   R2_ACCESS_KEY_ID="your_access_key"
   R2_SECRET_ACCESS_KEY="your_secret_key"
   R2_BUCKET_NAME="your_bucket"
   ```

4. **Initialize the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   *The application will be available at `http://localhost:3000`.*

## 📄 License
This project is proprietary software. All rights reserved.
