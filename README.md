# 🏢 UrbanGaon AI Todo Platform & Executive Operating System

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)](https://react.js.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%209.1-green?logo=mongodb)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Container-Docker%20Ready-2496ed?logo=docker)](https://www.docker.com/)

A modern, high-performance enterprise executive operating system and AI-powered task workflow platform built for **UrbanGaon**. Featuring role-based access control, real-time audit trails, automated morning email digests, multi-assignee task distribution, and 28 verified business workflows.

---

## 📁 Repository Structure

```text
├── .github/
│   └── workflows/
│       └── docker-build-push.yml   # CI/CD: Automated Docker build & GHCR container push
├── docs/                           # Enterprise Documentation & Architecture
│   ├── architecture/               # Architecture recommendations & workflow flowcharts
│   │   ├── flowcharts/             # 28 system lifecycle flowcharts & visual diagrams
│   │   └── TODO_Dashboard_Improvements_For_Agents.md
│   ├── audit/                      # Implementation audit reports (HTML & PDF)
│   │   ├── UrbanGaon_Todos_Implementation_Audit_Report.html
│   │   └── UrbanGaon_Todos_Implementation_Audit_Report.pdf
│   └── deployment/                 # Deployment manuals
│       └── SYNOLOGY_DS925_DEPLOYMENT_GUIDE.md  # 1-click Synology DS925+ NAS deployment
├── public/                         # Public static web assets & brand emblems
├── scripts/                        # Automation & deployment scripts
│   ├── generate-pdf.js             # Headless Edge PDF audit generator
│   ├── nas-auto-update.sh          # Synology NAS automatic pull & container updater
│   └── package-cpanel.js           # Production standalone packager for cPanel / PM2
├── app/                            # Next.js App Router (routing layer only — thin)
│   ├── layout.tsx, page.tsx        # Root layout & entry page
│   └── api/                        # REST route handlers → delegate to backend/
├── frontend/                       # 🎨 FRONTEND (client-side UI)
│   ├── components/                 # React 19 UI Components (Portals, Modals, Views)
│   ├── context/                    # AppContext: Global state & dispatch
│   ├── hooks/                      # Custom hooks (e.g. useTaskDeadlines)
│   ├── lib/                        # Browser-only utils (XLSX export, sound)
│   └── styles/                     # Design tokens & responsive global styles
├── backend/                        # ⚙️ BACKEND (server-side only)
│   ├── lib/                        # Server engines (db, auth, email, cron, digest, overdue, retention)
│   └── models/                     # Mongoose Schemas (Task, User, AuditLog, Member)
├── shared/                         # 🔗 Isomorphic code used by both frontend & backend
│   ├── lib/                        # Date utils, roster/RBAC, AI parser, multi-assignee logic
│   └── types/                      # TypeScript definitions & data contracts
├── instrumentation.ts              # Server boot hook (starts cron schedulers)
├── tests/                          # Automated Verification & Audit Test Suite
│   └── audit/                      # Flowchart, retention, and responsive audit tests
├── Dockerfile                      # Multi-stage production container build
├── docker-compose.yml              # Local container orchestration
└── next.config.ts                  # Next.js platform configuration
```

---

## ⚡ Tech Stack

- **Core**: Next.js 15.2 (App Router) with React 19
- **Type Safety**: TypeScript 5.7 (Strict mode, 100% typecheck pass)
- **Database & ODM**: MongoDB with Mongoose 9.10
- **Security & Auth**: JWT + bcryptjs with strict role-based access control (RBAC)
- **Automation**: Node-cron background jobs & Nodemailer SMTP integration
- **Reporting**: XLSX multi-sheet export with OWASP formula-injection sanitization

---

## 🚀 Getting Started

### Prerequisites
- Node.js `20.x` or `22.x`
- MongoDB instance (local or MongoDB Atlas)

### 1. Installation
```bash
git clone <repository-url>
cd "TODO Dashboard  New updated Version"
npm install
```

### 2. Environment Configuration
Copy the sample environment file and configure your credentials:
```bash
cp .env.local.example .env.local
```

Required variables:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for session encryption
- `SMTP_USER` & `SMTP_PASS`: SMTP email credentials (for morning digests & alerts)

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Audit Suite

Run the full automated verification suite to validate system integrity, OWASP formula defenses, and cross-device responsiveness:

```bash
# Run automated audit and responsive test suite
npm run test:audit

# Type-check TypeScript codebase
npx tsc --noEmit
```

---

## 🚢 Deployment Options

### Option A: Synology NAS DS925+ (1-Click)
See the complete deployment guide in [`docs/deployment/SYNOLOGY_DS925_DEPLOYMENT_GUIDE.md`](docs/deployment/SYNOLOGY_DS925_DEPLOYMENT_GUIDE.md).
- Windows: Run `deploy-to-nas.bat`
- Linux/NAS: Execute `scripts/nas-auto-update.sh`

### Option B: Docker Container
```bash
docker compose up -d --build
```

### Option C: cPanel / PM2 Node.js Hosting
```bash
npm run build
npm run package:cpanel
```

---

## 📄 Documentation Links

- **NAS Deployment Guide**: [`docs/deployment/SYNOLOGY_DS925_DEPLOYMENT_GUIDE.md`](docs/deployment/SYNOLOGY_DS925_DEPLOYMENT_GUIDE.md)
- **Architecture & Recommendations**: [`docs/architecture/TODO_Dashboard_Improvements_For_Agents.md`](docs/architecture/TODO_Dashboard_Improvements_For_Agents.md)
- **Implementation Audit Report**: [`docs/audit/UrbanGaon_Todos_Implementation_Audit_Report.html`](docs/audit/UrbanGaon_Todos_Implementation_Audit_Report.html)
- **Verified Flowcharts**: [`docs/architecture/flowcharts/`](docs/architecture/flowcharts/)

---

## 🛡️ License & Ownership
Copyright © 2026 UrbanGaon. All rights reserved. Confidential and proprietary enterprise operating system.
