# BioVault — Biobank Marketplace SaaS

## Project Overview

BioVault is a full-stack SaaS marketplace that connects biomedical researchers with biological sample repositories (biobanks) worldwide. Researchers can discover, filter, and request tissue, blood, DNA, and RNA specimens from verified biobanks. Biobanks manage their inventory, track incoming requests, handle shipping, and monetize leads through a built-in payment system.

**Live URL:** Deployed on Vercel (auto-deploys from GitHub)
**Domain:** biovault.us
**Role:** Product owner & implementation developer — designed the product vision, directed feature development, managed deployment pipeline, and tested all user flows. AI-assisted development with Claude handling the majority of code generation.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework — single-page application with component-based architecture |
| **Vite** | Build tool and dev server — fast HMR, optimized production bundles |
| **JavaScript (ES6+)** | Primary language — async/await, destructuring, functional patterns |
| **CSS-in-JS (inline styles)** | Dark-mode biotech aesthetic with a custom design system |
| **Google Fonts** | Space Grotesk (headings) + Inter (body) typography |

### Backend & Database
| Technology | Purpose |
|---|---|
| **Supabase** | Backend-as-a-Service — PostgreSQL database, auth, real-time subscriptions |
| **PostgreSQL** | Relational database with Row Level Security (RLS) policies |
| **Supabase Auth** | Email/password authentication with role-based access (researcher vs. biobank) |
| **Supabase Realtime** | WebSocket subscriptions for live messaging and request status updates |
| **Supabase Storage** | File storage infrastructure (available for future document uploads) |

### Deployment & DevOps
| Technology | Purpose |
|---|---|
| **Vercel** | Frontend hosting with automatic deployments from GitHub |
| **GitHub** | Version control and CI/CD trigger for Vercel |
| **Environment Variables** | `.env` files for Supabase URL and API keys (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) |

### AI-Assisted Development
| Technology | Purpose |
|---|---|
| **Claude (Anthropic)** | AI pair programmer — wrote ~95% of the application code including React components, Supabase schema, API integration, real-time messaging, and iterative bug fixes across 14 versions |
| **Prompt Engineering** | Directed Claude through feature specs, bug reports, and architectural decisions via natural language conversation |

### Payment Integration
| Technology | Purpose |
|---|---|
| **Stripe** (planned) | Payment processing for lead unlock fees ($50/lead) |
| **Lead paywall UI** | Built and functional — currently uses confirm dialog, ready for Stripe Checkout integration |

---

## Database Schema

### Tables (8 total)

**profiles** — User accounts synced with Supabase Auth
- `id` (UUID, FK → auth.users), `email`, `name`, `role` (researcher/biobank), `institution`, `location`, `bio`
- Auto-created via database trigger on signup

**biobanks** — Biobank organizations
- `id` (UUID), `owner_id` (FK → profiles), `name`, `location`, `bio`, `specialties` (array), `certifications` (array), `verified` (boolean), `contact_email`, `founded`, `response_time`

**samples** — Biological specimens listed for sale
- `id` (UUID), `biobank_id` (FK → biobanks), `type` (Tissue/Blood/DNA/RNA), `subtype`, `disease`, `organ`, `preservation`, `quantity`, `unit`, `price`, `consent`, `matched_data` (array), `availability`

**requests** — Sample requests from researchers to biobanks
- `id` (UUID), `researcher_id` (FK → profiles), `sample_id` (FK → samples), `biobank_id` (FK → biobanks), `quantity`, `message`, `status` (pending/approved/shipped/delivered/rejected)

**favorites** — Researcher saved samples
- `id` (UUID), `user_id` (FK → profiles), `sample_id` (FK → samples)

**threads** — Messaging conversation threads
- `id` (UUID), `researcher_id` (FK → profiles), `biobank_id` (FK → biobanks), `sample_id` (FK → samples), `last_message`, `last_message_at`

**messages** — Individual messages within threads
- `id` (UUID), `thread_id` (FK → threads), `sender_id` (FK → profiles), `sender_name`, `text`, `created_at`

**reviews** — Biobank ratings and reviews
- `id` (UUID), `biobank_id` (FK → biobanks), `reviewer_id` (FK → profiles), `rating`, `comment`

### Security
- Row Level Security (RLS) policies on all tables
- Users can only read/write their own data
- Biobanks can only see requests for their own samples
- Admin-only features gated by UUID check

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  React SPA (Vite build)                         │
│  ┌─────────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Marketplace  │  │ Dashboard│  │  Profile   │  │
│  │ (Researcher) │  │ (Biobank)│  │  (Shared)  │  │
│  └──────┬───────┘  └─────┬────┘  └─────┬─────┘  │
│         └────────────┬───┘─────────────┘         │
│                      │                           │
│              Supabase JS Client                  │
│              (inline db object)                  │
└──────────────────────┬───────────────────────────┘
                       │ HTTPS / WebSocket
┌──────────────────────┴───────────────────────────┐
│              Supabase Cloud                       │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │   Auth   │  │ Realtime │  │   PostgreSQL   │  │
│  │ (email/  │  │ (WS sub) │  │  + RLS + Trig  │  │
│  │ password)│  │          │  │                │  │
│  └──────────┘  └──────────┘  └────────────────┘  │
└───────────────────────────────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────┐
│                  Vercel                            │
│  Auto-deploy from GitHub main branch              │
│  CDN-served static React bundle                   │
└───────────────────────────────────────────────────┘
```

---

## Features

### Researcher Experience
- **Sample Marketplace** — Browse biological specimens with search, type filters (Tissue, Blood, DNA, RNA), and advanced filters (price range, preservation method, matched data type)
- **Biobank Profiles** — Click any biobank name to see their full catalog, certifications, stats, and rating
- **Favorites** — Heart icon to save samples, persisted to database, accessible via saved samples modal
- **Request Cart** — Add multiple samples, write a message, submit requests to biobanks
- **Request Tracker** — Visual progress bar (Pending → Approved → Shipped → Delivered) for all submitted requests
- **Real-time Messaging** — Chat with biobanks about specific samples, messages delivered via Supabase Realtime WebSockets
- **Personalized Welcome** — Dashboard greets researcher by name

### Biobank Experience
- **Dashboard Overview** — Stats cards showing total samples, pending requests, active threads
- **Inventory Management** — Full table view of all listed samples with type, disease, quantity, price
- **Add Sample Form** — Rich form with type chips, subtype selection, disease/organ fields, preservation method, pricing, consent type, and data matching options
- **Request Management** — Incoming requests with researcher name, institution, sample details, and approve/decline actions
- **Shipping Tracker** — 3-step visual tracker (Preparing → In Transit → Delivered) with status update buttons
- **Lead Paywall** — Researcher details are blurred until the biobank pays $50 to unlock each lead. Requests tab only shows unlocked leads.
- **Real-time Messaging** — Threaded conversations with researchers
- **Profile Management** — Editable bank name, location, bio that syncs to the biobanks table

### Admin Features (Owner Only)
- **Bulk Import** — Admin-only tab with two import modes:
  - Quick Add: Single-row form for rapid data entry
  - JSON Import: Paste arrays of scraped sample data for batch insertion
- **Biobank Selector** — Choose which biobank to import samples for
- **Create New Biobank** — Inline form to add new biobank organizations with name, location, bio, and specialties
- **UUID-gated access** — Bulk import tab only visible to the admin account

### Authentication & Security
- Email/password signup with role selection (Researcher or Biobank)
- Automatic profile creation via database trigger
- Automatic biobank record creation for biobank signups
- Session persistence via Supabase Auth
- Row Level Security on all database tables

---

## Technical Decisions & Patterns

### Single-File Architecture
The entire frontend is a single `App.jsx` file (~1,700 lines) with the Supabase client and all database helpers defined inline. This eliminates module import issues that were causing silent failures in the deployment pipeline and makes the codebase easy to deploy via GitHub's web editor.

### DB-First Write Pattern
All write operations (create sample, send request, toggle favorite) wait for Supabase confirmation before updating the UI. This prevents the common "ghost data" problem where the UI shows success but the database write actually failed.

```javascript
const { data, error } = await db.createSample({...});
if (error) { setError("Failed: " + error.message); return; }
// Only update UI after DB confirms
setSamples([...samples, newSample]);
```

### Optimistic Reads with Realtime Sync
For messaging, the sent message is added to the local state immediately for instant UI feedback. The Supabase Realtime subscription handles incoming messages from other users, with a deduplication check to prevent double-rendering:

```javascript
if (m.sender_id === userId) return; // Skip own messages
```

### Functional setState
All form state updates use the functional pattern to prevent stale closure bugs:

```javascript
const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
```

### No getUser() in Hot Paths
Early iterations called `supabase.auth.getUser()` inside every API helper, which made a network request each time. Under rapid clicks, these requests piled up and hung. The fix was passing `userId` directly from React state to all database functions, eliminating the auth round-trip entirely.

### .select() on Every Insert
Supabase's `.insert()` returns `null` for data by default. Every insert call chains `.select()` to get the inserted row back, enabling DB-first confirmation.

---

## Key Metrics

- **Database Tables:** 8 with full RLS policies
- **Frontend Components:** 15+ React components
- **Real-time Features:** Live messaging, request status updates
- **Auth Flows:** Signup, login, role-based routing, session persistence
- **Build Size:** Single-file React SPA, ~1,700 lines
- **Deploy Pipeline:** GitHub → Vercel auto-deploy in ~30 seconds

---

## Future Roadmap

- [ ] Stripe Checkout integration for lead payments (UI built, needs Stripe keys)
- [ ] Email notifications for new requests and messages
- [ ] Advanced search with disease ontology autocomplete
- [ ] Biobank verification workflow
- [ ] File upload for Material Transfer Agreements (MTAs)
- [ ] Analytics dashboard with conversion funnels
- [ ] Mobile-responsive redesign
- [ ] Multi-language support for international biobanks

---

## Development Methodology

### AI-Assisted Pair Programming
BioVault was built through a collaborative workflow between a product-focused implementation developer and Claude (Anthropic's AI). The development process followed an iterative conversation-driven approach:

**Human role (Product & Implementation):**
- Defined the product vision and target market (biobank marketplace)
- Specified features through natural language descriptions
- Managed the deployment pipeline (GitHub → Vercel → Supabase)
- Tested every build on the live site and reported bugs with console logs
- Made all product decisions (pricing model, user flows, admin features)
- Configured Supabase (tables, RLS policies, auth settings, realtime)

**Claude role (Code & Architecture):**
- Generated all React components, styling, and UI logic
- Designed and wrote the PostgreSQL database schema with RLS policies
- Built the Supabase integration layer (auth, CRUD, realtime subscriptions)
- Debugged deployment issues (Vite build errors, JSX parsing, brace balancing)
- Diagnosed and fixed runtime bugs from browser console logs
- Iterated through 14 versions based on real-time feedback

**Workflow:** Each feature followed a tight loop — describe what's needed → Claude writes the code → deploy to Vercel → test on live site → report issues → Claude fixes → repeat. This enabled building a production-grade SaaS in a single extended session.

---

## Development Timeline

Built through AI-assisted pair programming with Claude (Anthropic). Iterative approach with 14 versions, progressively adding features and fixing bugs through rapid deploy-test cycles.

| Phase | What was built |
|---|---|
| v1–v2 | Frontend prototype: landing page, marketplace UI, biobank dashboard, dark theme |
| v3–v5 | Supabase integration: auth, database schema, API client, Vercel deployment |
| v6–v8 | Database persistence fixes: removed mock data, fixed RLS policies, inline db helpers |
| v9–v11 | Feature completion: messaging, bulk import, shipping tracker, lead paywall |
| v12–v14 | Polish: welcome names, profile editing, real activity data, request gating behind payments |
