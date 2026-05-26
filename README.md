 VoltVocal 
                                                                                                                                        A field estimating SaaS for electrical contractors. Walk a job site, speak your observations, and get a structured, exportable      
  estimate in seconds — powered by AI.                                                                                                   
  **Workflow:** Record → Transcribe → Estimate → Export PDF                                                                           
  
  ---

  ## Features

  - **Voice recording** — capture job site observations hands-free via browser microphone
  - **AI transcription** — Groq Whisper converts audio to text accurately
  - **Smart estimation** — Llama 3.3-70b extracts line items, quantities, unit prices, and totals from natural speech
  - **Inline editing** — adjust any line item before saving
  - **Price list** — maintain a custom catalog of your common materials and labor rates
  - **PDF export** — generate a professional estimate PDF with your company name
  - **Saved estimates** — persist and retrieve past estimates via Supabase
  - **PWA** — installable as a mobile app, works offline

  ---

  ## Tech Stack

  | Layer | Technology |
  |-------|------------|
  | Framework | Next.js 16 (App Router, Server Actions) |
  | Language | TypeScript |
  | Styling | Tailwind CSS 4 |
  | AI — Transcription | Groq Whisper |
  | AI — Estimation | Groq `llama-3.3-70b-versatile` |
  | Database | Supabase (PostgreSQL) |
  | PDF | jsPDF + jspdf-autotable |
  | PWA | next-pwa |

  ---

  ## Prerequisites

  - Node.js 18+
  - A [Groq](https://console.groq.com) account (free tier available)
  - A [Supabase](https://supabase.com) project

  ---

  ## Setup

  ### 1. Install dependencies

  bash
  npm install

  2. Configure environment variables

  Copy .env.example to .env.local and fill in your values:

  cp .env.example .env.local

  # Required
  GROQ_API_KEY=your_groq_api_key

  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

  # Optional
  GROQ_MODEL=llama-3.3-70b-versatile        # default
  MAX_AUDIO_BYTES=26214400                   # default 25 MB, max 50 MB
  NEXT_PUBLIC_COMPANY_NAME=Your Company Name # appears on exported PDFs

  ▎ Note: SUPABASE_SERVICE_ROLE_KEY is a privileged key — it is server-only and never exposed to the client.

  3. Set up Supabase tables

  In your Supabase project, create the following tables:

  estimates

  ┌────────────┬─────────────┬────────────────────────────────────────┐
  │   Column   │    Type     │                 Notes                  │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ id         │ uuid        │ primary key, default gen_random_uuid() │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ created_at │ timestamptz │ default now()                          │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ total      │ numeric     │                                        │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ notes      │ text        │                                        │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ transcript │ text        │                                        │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ line_items │ jsonb       │                                        │
  └────────────┴─────────────┴────────────────────────────────────────┘

  price_list

  ┌────────────┬─────────────┬────────────────────────────────────────┐
  │   Column   │    Type     │                 Notes                  │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ id         │ uuid        │ primary key, default gen_random_uuid() │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ created_at │ timestamptz │ default now()                          │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ name       │ text        │                                        │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ unit       │ text        │                                        │
  ├────────────┼─────────────┼────────────────────────────────────────┤
  │ unit_price │ numeric     │                                        │
  └────────────┴─────────────┴────────────────────────────────────────┘

  contractor_profile

  ┌────────────────┬──────┬─────────────┐
  │     Column     │ Type │    Notes    │
  ├────────────────┼──────┼─────────────┤
  │ id             │ uuid │ primary key │
  ├────────────────┼──────┼─────────────┤
  │ company_name   │ text │             │
  ├────────────────┼──────┼─────────────┤
  │ license_number │ text │             │
  ├────────────────┼──────┼─────────────┤
  │ phone          │ text │             │
  ├────────────────┼──────┼─────────────┤
  │ email          │ text │             │
  └────────────────┴──────┴─────────────┘

  4. Run the development server

  npm run dev

  Open http://localhost:3000 in your browser.

  ---
  Usage

  1. Record — tap the microphone button and describe the job (e.g., "3 duplex outlets at $85 each, 2 hours labor at $95 an hour, one  
  panel upgrade $450")
  2. Review — the AI parses your speech into a line-item table with quantities, unit prices, and a total
  3. Edit — adjust any field inline if needed
  4. Save or Export — save the estimate to your history or download a PDF

  ---
  Project Structure

  src/
  ├── app/
  │   ├── dashboard/
  │   │   ├── page.tsx          # Main estimator UI
  │   │   ├── prices/page.tsx   # Price list management
  │   │   └── settings/page.tsx # Contractor profile & settings
  │   └── actions/
  │       ├── estimate-actions.ts  # Transcribe, generate, save, delete
  │       ├── price-actions.ts     # CRUD for price list
  │       └── settings-actions.ts  # Contractor profile
  ├── components/
  │   ├── estimate-recorder.tsx    # Recording UI + waveform
  │   ├── estimate-table.tsx       # Editable line-item table
  │   ├── saved-estimates.tsx      # Estimate history
  │   └── install-prompt.tsx       # PWA install prompt
  ├── lib/
  │   ├── audio-validation.ts      # File size + MIME validation
  │   ├── estimate-pdf.ts          # PDF generation
  │   ├── sanitize-ai-text.ts      # Input/output sanitization
  │   └── server/
  │       ├── groq-estimate.ts     # Groq API (Whisper + Llama)
  │       ├── supabase.ts          # Supabase client
  │       └── rate-limit.ts        # IP-based rate limiting
  └── types/
      ├── estimate.ts              # EstimateLineItem, EstimateResult
      └── price.ts                 # PriceItem

  ---
  Scripts

  npm run dev    # Development server (Webpack)
  npm run build  # Production build
  npm run start  # Production server
  npm run lint   # ESLint

  ---
  Security

  - All AI and database calls run exclusively in Server Actions — no API keys are ever sent to the client
  - Audio uploads are validated for MIME type and size before processing
  - AI responses are sanitized before storage or display
  - Security headers configured: HSTS, X-Frame-Options, Content Security Policy
  - IP-based rate limiting on transcription and estimate generation endpoints

  ---
  Deployment

  The app can be deployed to any platform that supports Next.js (Vercel, Railway, Render, self-hosted).

  Set all environment variables from .env.example in your hosting platform's dashboard before deploying.

  npm run build
  npm run start

❯ no actually regive me the code for readme or whatever without numbers i need to paste it right                                                                                                                                       
● Here it is — everything inside the code block, ready to paste:
                                                                                                                                        # VoltVocal                                                                                                                                                                                                                                                                 A field estimating SaaS for electrical contractors. Walk a job site, speak your observations, and get a structured, exportable        estimate in seconds — powered by AI.
                                                                                                                                      
  **Workflow:** Record → Transcribe → Estimate → Export PDF

  ---

  ## Features

  - **Voice recording** — capture job site observations hands-free via browser microphone
  - **AI transcription** — Groq Whisper converts audio to text accurately
  - **Smart estimation** — Llama 3.3-70b extracts line items, quantities, unit prices, and totals from natural speech
  - **Inline editing** — adjust any line item before saving
  - **Price list** — maintain a custom catalog of your common materials and labor rates
  - **PDF export** — generate a professional estimate PDF with your company name
  - **Saved estimates** — persist and retrieve past estimates via Supabase
  - **PWA** — installable as a mobile app, works offline

  ---

  ## Tech Stack

  | Layer | Technology |
  |-------|------------|
  | Framework | Next.js 16 (App Router, Server Actions) |
  | Language | TypeScript |
  | Styling | Tailwind CSS 4 |
  | AI — Transcription | Groq Whisper |
  | AI — Estimation | Groq `llama-3.3-70b-versatile` |
  | Database | Supabase (PostgreSQL) |
  | PDF | jsPDF + jspdf-autotable |
  | PWA | next-pwa |

  ---

  ## Prerequisites

  - Node.js 18+
  - A [Groq](https://console.groq.com) account (free tier available)
  - A [Supabase](https://supabase.com) project

  ---

  ## Setup

  ### 1. Install dependencies

  \```bash
  npm install
  \```

  ### 2. Configure environment variables

  Copy `.env.example` to `.env.local` and fill in your values:

  \```bash
  cp .env.example .env.local
  \```

  \```env
  # Required
  GROQ_API_KEY=your_groq_api_key

  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

  # Optional
  GROQ_MODEL=llama-3.3-70b-versatile        # default
  MAX_AUDIO_BYTES=26214400                   # default 25 MB, max 50 MB
  NEXT_PUBLIC_COMPANY_NAME=Your Company Name # appears on exported PDFs
  \```

  > **Note:** `SUPABASE_SERVICE_ROLE_KEY` is a privileged key — it is server-only and never exposed to the client.

  ### 3. Set up Supabase tables

  In your Supabase project, create the following tables:

  **`estimates`**
  | Column | Type | Notes |
  |--------|------|-------|
  | id | uuid | primary key, default `gen_random_uuid()` |
  | created_at | timestamptz | default `now()` |
  | total | numeric | |
  | notes | text | |
  | transcript | text | |
  | line_items | jsonb | |

  **`price_list`**
  | Column | Type | Notes |
  |--------|------|-------|
  | id | uuid | primary key, default `gen_random_uuid()` |
  | created_at | timestamptz | default `now()` |
  | name | text | |
  | unit | text | |
  | unit_price | numeric | |

  **`contractor_profile`**
  | Column | Type | Notes |
  |--------|------|-------|
  | id | uuid | primary key |
  | company_name | text | |
  | license_number | text | |
  | phone | text | |
  | email | text | |

  ### 4. Run the development server

  \```bash
  npm run dev
  \```

  Open [http://localhost:3000](http://localhost:3000) in your browser.

  ---

  ## Usage

  1. **Record** — tap the microphone button and describe the job (e.g., *"3 duplex outlets at $85 each, 2 hours labor at $95 an hour, 
  one panel upgrade $450"*)
  2. **Review** — the AI parses your speech into a line-item table with quantities, unit prices, and a total
  3. **Edit** — adjust any field inline if needed
  4. **Save or Export** — save the estimate to your history or download a PDF

  ---

  ## Project Structure

  \```
  src/
  ├── app/
  │   ├── dashboard/
  │   │   ├── page.tsx          # Main estimator UI
  │   │   ├── prices/page.tsx   # Price list management
  │   │   └── settings/page.tsx # Contractor profile & settings
  │   └── actions/
  │       ├── estimate-actions.ts  # Transcribe, generate, save, delete
  │       ├── price-actions.ts     # CRUD for price list
  │       └── settings-actions.ts  # Contractor profile
  ├── components/
  │   ├── estimate-recorder.tsx    # Recording UI + waveform
  │   ├── estimate-table.tsx       # Editable line-item table
  │   ├── saved-estimates.tsx      # Estimate history
  │   └── install-prompt.tsx       # PWA install prompt
  ├── lib/
  │   ├── audio-validation.ts      # File size + MIME validation
  │   ├── estimate-pdf.ts          # PDF generation
  │   ├── sanitize-ai-text.ts      # Input/output sanitization
  │   └── server/
  │       ├── groq-estimate.ts     # Groq API (Whisper + Llama)
  │       ├── supabase.ts          # Supabase client
  │       └── rate-limit.ts        # IP-based rate limiting
  └── types/
      ├── estimate.ts              # EstimateLineItem, EstimateResult
      └── price.ts                 # PriceItem
  \```

  ---

  ## Scripts

  \```bash
  npm run dev    # Development server (Webpack)
  npm run build  # Production build
  npm run start  # Production server
  npm run lint   # ESLint
  \```

  ---

  ## Security

  - All AI and database calls run exclusively in Server Actions — no API keys are ever sent to the client
  - Audio uploads are validated for MIME type and size before processing
  - AI responses are sanitized before storage or display
  - Security headers configured: HSTS, `X-Frame-Options`, Content Security Policy
  - IP-based rate limiting on transcription and estimate generation endpoints

  ---

  ## Deployment

  The app can be deployed to any platform that supports Next.js (Vercel, Railway, Render, self-hosted).

  Set all environment variables from `.env.example` in your hosting platform's dashboard before deploying.

  \```bash
  npm run build
  npm run start
  \```
