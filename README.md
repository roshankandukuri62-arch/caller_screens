# PDGMS - Prospect Data & Growth Management System

PDGMS is a full-stack enterprise web application designed to help sales and growth teams train effectively using an AI-powered interactive Call Simulator, log prospect calls, and track key interaction metrics.

## 🚀 Live Deployment URLs
* **Frontend (Vercel):** [https://callerscreensfrontend.vercel.app/](https://callerscreensfrontend.vercel.app/)
* **Backend API (Render):** [https://caller-screens.onrender.com](https://caller-screens.onrender.com)

---

## 🏗️ System Architecture & Tech Stack

### 1. Frontend (Hosted on Vercel)
* **Tech:** Pure HTML5, Vanilla JavaScript, and Tailwind CSS (via CDN) styled with custom responsive glassmorphism UI components.
* **Role:** Delivers a dynamic, fluid user interface, manages multi-step configuration forms, real-time chat interactions with simulated prospects, and handles dynamic modal popups for performance evaluation reports.

### 2. Backend (Hosted on Render)
* **Tech:** Node.js, Express.js, and CORS middleware.
* **Role:** Acts as the secure middle-tier API layer. It coordinates calls between the frontend client, your Supabase database, and the Google Gemini LLM SDK. It exposes dedicated endpoints for fetching historical logs, company lists, building dynamic multi-turn conversation contexts, and streaming chat completions.

### 3. Database (Supabase)
* **Tech:** PostgreSQL hosted on Supabase.
* **Role:** Stores all historical call logs, company metadata, prospect roles, and translated transcript turn details (`call_details` and `transcript_details_translated` tables).

### 4. LLM Logic & AI Integration
* **Tech:** Google Generative AI SDK (`@google/generative-ai`) powered by Google's **Gemini** models (`gemini-2.0-flash` / `gemini-3.8-flash`).
* **Logic:** 
  - **Context Construction:** When simulating an *Existing Prospect*, the backend queries Supabase for historical transcripts associated with that specific company and role, packages them into a structured JSON history, and injects them directly into the core system prompt.
  - **Behavioral Tuning:** Dynamically maps user-selected mood sliders (from *1: Highly Hesitant* to *5: Highly Receptive*) and custom caller notes to shape the persona and responsiveness of the AI prospect.
  - **Evaluation Reporting:** When the simulation concludes (via manual end or typing `END`), the model transitions modes to generate a structured, professional performance report evaluating the caller's approach and actionable improvement tips.

---

## 📄 Page Descriptions

* **`index.html` (or Dashboard):** The central hub providing quick access points to core platform utilities, analytics, and navigation links.
* **`simulator.html` (AI Call Simulator):** An interactive training module featuring a multi-tab setup. Users configure prospect type (Existing vs. New), company name, target role, company kind, initial mood, and caller objectives. It launches a real-time chat interface simulating the prospect and concludes with a frosted-glass modal popup showing a detailed performance breakdown report.
* **`call_logger.html`:** A dedicated logging interface allowing team members to record and submit new prospect interaction logs directly into the Supabase database backend.

---

## 🗄️ Setting Up Supabase via SQL

If you need to set up or recreate your database tables in Supabase using raw SQL, you can easily do so through the Supabase Dashboard.

### How to run SQL in Supabase:
1. Log in to your **Supabase Dashboard** and select your project.
2. On the left-hand navigation menu, click on the **SQL Editor** (icon with a terminal prompt).
3. Click **New query**.
4. Paste the SQL schema script below and click **Run**:

```sql
-- 1. Create Call Details Table
CREATE TABLE IF NOT EXISTS call_details (
    id SERIAL PRIMARY KEY,
    caller TEXT,
    company TEXT,
    company_kind TEXT,
    prospect_role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Create Transcript Details Translated Table
CREATE TABLE IF NOT EXISTS transcript_details_translated (
    id SERIAL PRIMARY KEY,
    call_details_id INTEGER REFERENCES call_details(id) ON DELETE CASCADE,
    turn_count INTEGER,
    turn_speaker TEXT,
    turn_content TEXT,
    translated_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
