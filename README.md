# VoltVocal — Field Estimating System

Voice-first estimating for Ontario electrical contractors. Speak your job site notes. Get a professional estimate in under 3 seconds.

---

## What It Does

VoltVocal lets electrical contractors walk through a job site, speak their materials and quantities out loud, and instantly receive a structured professional estimate ready to save and export as a PDF.

No typing. No spreadsheets. No guessing.

---

## Features

- Voice to Estimate — Groq Whisper transcribes audio, Llama 3.3 structures it into line items in under 3 seconds
- Your Price List — Save your own rates once, the AI uses your exact prices automatically
- Inline Editing — Tap any field to correct quantities, prices, or descriptions before saving
- PDF Export — Professional quote with your company name, ESA license number, and contact info
- Estimate History — All saved estimates stored securely, accessible anytime
- Contractor Settings — Company info saved to every PDF automatically
- PWA — Installs on your phone home screen, works offline
- Ontario-Specific — CAD pricing, HST calculation, built for the GTA market

---

## Tech Stack

- Framework: Next.js 15 App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Transcription: Groq Whisper Large v3
- Inference: Groq Llama 3.3 70B Versatile
- Database: Supabase / PostgreSQL
- Deployment: Vercel
- PDF: jsPDF + AutoTable

---

## Security

- All API keys server-only, never exposed to the client
- All AI calls via Next.js Server Actions
- Row Level Security on all Supabase tables
- Input sanitization with prompt injection detection
- Audio validation via MIME type and magic bytes
- Per-action rate limiting
- Security headers: CSP, X-Frame-Options, Referrer-Policy

---

## Local Setup

1. Clone the repo

```
git clone https://github.com/OmarA7860/contractor-saas
cd contractor-saas
npm install
```

2. Create .env.local

```
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Run this SQL in your Supabase SQL Editor

```sql
create table estimates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transcript text not null,
  total numeric(10,2) not null,
  notes text not null default '',
  line_items jsonb not null default '[]'
);

create table price_list (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  unit text not null default 'each',
  unit_price numeric(10,2) not null,
  category text not null default 'general'
);

create table contractor_profile (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  company_name text not null default '',
  license_number text not null default '',
  phone text not null default '',
  email text not null default ''
);

alter table estimates enable row level security;
alter table price_list enable row level security;
alter table contractor_profile enable row level security;
```

4. Start the dev server

```
npm run dev
```

Open http://localhost:3000/dashboard

---

## How It Works

1. Contractor taps Record and speaks their job site notes
2. Audio is sent to a Next.js Server Action
3. Groq Whisper transcribes the audio to text
4. The transcript is sent to Llama 3.3 with the contractor's saved price list
5. Llama returns structured JSON line items
6. Estimate renders in the UI with inline editing
7. Contractor saves and exports PDF

Total time from voice note to saved estimate: under 3 seconds.

---

## Roadmap

- Supabase Auth — per-contractor accounts
- Send quote to client via email
- Client approval flow
- Expo mobile app for iOS and Android
- Stripe subscription billing
- Live Canadian material pricing

---

## Built By

Omar Ahmed — Software Engineering Student

GitHub: https://github.com/OmarA7860

---

VoltVocal generates estimates based on contractor-provided information. All code compliance, permit requirements, and material specifications are the responsibility of the licensed contractor.
