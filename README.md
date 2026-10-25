# PDGMS - Caller Intelligence

This project is a comprehensive, full-stack enterprise web application engineered to optimize sales and growth operations. It provides robust tools for employee authentication, tracking manual call interactions, and training sales reps via an AI-powered interactive Call Simulator.

## 🚀 Live Deployment & Infrastructure URLs
* **Frontend Application (Vercel):** [https://callerscreensfrontend.vercel.app/](https://callerscreensfrontend.vercel.app/)
* **Backend API Server (Render):** [https://caller-screens.onrender.com](https://caller-screens.onrender.com)

---

## 📄 Detailed Page Overview & Navigation Guide

* **1. Login / Authentication Page (`/index.html` or login route)**
  * **Purpose:** Serves as the primary security gateway for the application. Employees must enter valid credentials which are authenticated against the database backend before gaining access to protected internal tools.
* **2. Dashboard (`/dashboard.html`)**
  * **Purpose:** The central operational hub and command center. It offers a structured overview of workflow options and gives users immediate, one-click navigation links to launch training sessions or log new calls.
* **3. AI Call Simulator (`/simulator.html`)**
  * **Purpose:** An immersive training module where team members practice objection handling and pitching against AI-driven prospects. 
  * **Workflow:** Users choose between an *Existing* or *New* prospect configuration, select target companies, roles, and company types, and adjust an initial mood slider (ranging from highly hesitant to highly receptive). It initializes a live chat session simulating the prospect, and upon completion, renders a detailed performance evaluation breakdown inside a frosted-glass modal popup.
* **4. Call Logger (`/call_logger.html`)**
  * **Purpose:** A structured data entry form allowing representatives to record real-world prospect interaction details, track progress stages, log prospect attitudes, and persist call records directly to the database.

---

## 🏗️ Exhaustive System Architecture & Tech Stack

### 1. Frontend Layer (Vercel)
* **Core Technologies:** HTML5, Vanilla JavaScript, and Tailwind CSS (via CDN).
* **Design System:** Custom glassmorphism UI architecture featuring translucent frosted panels (`backdrop-filter`), dynamic background gradients, and responsive layouts optimized for all viewport sizes.
* **Client-Side Responsiveness:** Manages asynchronous REST API communication with the backend, dynamic dropdown population (for companies and roles), multi-step tab navigation, and modal state controls.

### 2. Backend API Layer (Render)
* **Core Technologies:** Node.js, Express.js, and CORS middleware.
* **API Routing Architecture:** 
  * `/api/auth` — Handles employee authentication and access verification.
  * `/api/calls` — Manages call logging endpoints and database records.
  * `/api/simulator` — Coordinates dynamic drop-down searches (`/companies`, `/roles`, `/company-kind`), context assembly (`/context`), and chat completions (`/chat`).

### 3. Database Layer (Supabase PostgreSQL)
* **Core Technologies:** PostgreSQL hosted via Supabase (`@supabase/supabase-js`).
* **Database Design:** Fully relational schema managing employee credentials, historic call metadata, translated turn-by-turn chat transcripts, and manual interaction logs.

### 4. LLM & AI Engine (Google Gemini SDK)
* **Core Technologies:** `@google/generative-ai` utilizing advanced active models (`gemini-2.0-flash` / `gemini-3.8-flash`).
* **Contextual Injection Logic:** When an *Existing Prospect* is configured, the backend queries `call_details` and `transcript_details_translated`, builds a structured historical JSON dialogue tree, and embeds it directly into the core system prompt.
* **Behavioral Prompt Engineering:** Maps user-defined mood variables and caller objectives into persona guidelines, forcing the LLM to dynamically adapt its temperament and response patterns during the simulation.
* **Evaluation Formatting:** At the end of a session, the model switches execution modes to generate a structured post-call review assessing the user's performance and providing targeted improvement suggestions.

---

## 📊 Complete Supabase Database Schema

The application database relies upon the following table structures:

### 1. `call_details`
Stores metadata regarding historic calls, target companies, and roles.
```sql
CREATE TABLE public.call_details (
    id text NOT NULL,
    duration_seconds bigint,
    outcome text,
    prospect_role text,
    company_kind text,
    company text,
    caller text,
    turns bigint,
    CONSTRAINT call_details_pkey PRIMARY KEY (id)
);
```

### 2. `transcript_details`
Stores untranslated turn-by-turn dialogue turns linked to historic calls.
```sql
CREATE TABLE public.transcript_details (
    call_details_id text,
    duration_seconds bigint,
    outcome text,
    prospect_role text,
    company_kind text,
    company text,
    caller text,
    turn_count bigint,
    turn_speaker text,
    turn_content text,
    CONSTRAINT transcript_details_call_details_id_fkey FOREIGN KEY (call_details_id) REFERENCES public.call_details(id)
);
```

### 3. `transcript_details_translated`
Stores translated turn-by-turn dialogue histories utilized by the simulator context builder.
```sql
CREATE TABLE public.transcript_details_translated (
    call_details_id text,
    duration_seconds bigint,
    outcome text,
    prospect_role text,
    company_kind text,
    company text,
    caller text,
    turn_count bigint,
    turn_speaker text,
    turn_content text,
    translated_content text,
    CONSTRAINT transcript_details_translated_call_details_id_fkey FOREIGN KEY (call_details_id) REFERENCES public.call_details(id)
);
```

### 4. `employees`
Stores authentication credentials for platform users.
```sql
CREATE TABLE public.employees (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    employee_id text NOT NULL,
    password text,
    CONSTRAINT employees_pkey PRIMARY KEY (id)
);
```

### 5. `call_logs`
Stores manual call logger submissions from team members.
```sql
CREATE TABLE public.call_logs (
    call_logger_id uuid NOT NULL DEFAULT gen_random_uuid(),
    employee_id text NOT NULL,
    company_name text NOT NULL,
    prospect_name text NOT NULL,
    prospect_role text NOT NULL,
    is_new_prospect text NOT NULL,
    final_stage_reached integer NOT NULL,
    final_mood text NOT NULL,
    stage_notes jsonb DEFAULT '{}'::jsonb,
    selected_responses jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT call_logs_pkey PRIMARY KEY (call_logger_id)
);
```

---

## ⚙️ Environment Configuration

Ensure the following variables are correctly populated within your deployment dashboards (Render and Vercel):
* `PORT` = `5000` (Backend runtime port)
* `SUPABASE_URL` = `your_supabase_project_url`
* `SUPABASE_ANON_KEY` = `your_supabase_anon_key`
