# Anvaya — Healthcare Low-Cost Rural Triage System

> AI-powered multi-agent healthcare triage for low-resource rural settings in India.

## 🏗 Architecture

```
27 AI Agents  →  n8n Orchestration  →  Supabase Backend  →  Two Frontend Panels
```

## 📁 Project Structure

```
├── orchestrators/
│   ├── patient_orchestrator/     # Agent P0 — Master Patient Router (Port 8000)
│   └── hospital_orchestrator/    # Agent H0 — Master Hospital Router (Port 8050)
│
├── cv_agents/
│   ├── skin_screener/            # Agents P2/P1 (Port 8005)
│   ├── brain_tumor_segmenter/    # Agent H2   (Port 8003)
│   ├── brain_tumor_classifier/   # Agent H3   (Port 8003)
│   ├── xray_analyzer/            # Agent H4   (Port 8004)
│   ├── cancer_screening_engine/  # Agent H5   (Port 8009)
│   ├── imaging_interpreter/      # Agent H6   (Port 8016)
│   └── mri_preprocessor/         # Agent H1   (Port 8008)
│
├── nlp_agents/
│   ├── language_processor/       # Agent R1 — Bhashini ASR/MT/TTS (Port 8001)
│   └── query_understanding/      # Agent R2 — NLP NER & Intent    (Port 8002)
│
├── rag_agents/
│   ├── rag_pipeline/             # Agents R3+R4+R5 — RAG Engine    (Port 8031)
│   └── ingest_corpus.py          # One-time corpus ingestion script
│
├── action_agents/
│   ├── appointment_manager/      # Agent A1 (Port 8011)
│   ├── hospital_locator/         # Agent A2 (Port 8012)
│   ├── followup_scheduler/       # Agent A3 (Port 8013)
│   ├── prescription_generator/   # Agent A4 (Port 8014)
│   ├── drug_interaction_checker/ # Agent A5 (Port 8015)
│   └── referral_manager/         # Agent A6 (Port 8016)
│
├── safety_agents/
│   ├── red_flag_monitor/         # Agent S1 (Port 8021)
│   └── consent_gate/             # Agent S2 (Port 8022)
│
├── monitoring_agents/
│   └── dashboard/                # Agents M1+M2+M3 (Port 8041)
│
├── supabase/
│   ├── migrations/               # Full schema SQL
│   └── functions/                # Edge Functions (compute-risk-score, rag-retrieve, consent-gate)
│
├── frontend/
│   ├── patient.html / patient.css / patient.js   # Patient PWA
│   └── hospital.html / hospital.css / hospital.js # Hospital Command Centre
│
├── n8n_workflows.json            # All 9 n8n orchestration workflows
└── .env.example                  # Environment variables template
```

## 🚀 Quick Start

### 1. Set up environment variables
```bash
cp .env.example .env
# Fill in your Supabase, OpenRouter, Bhashini, WhatsApp keys
```

### 2. Run the Supabase database migration
```bash
# In Supabase dashboard → SQL Editor → paste supabase/migrations/20260702000000_initial_schema.sql
```

### 3. Deploy Supabase Edge Functions
```bash
supabase functions deploy compute-risk-score
supabase functions deploy rag-retrieve
supabase functions deploy consent-gate
```

### 4. Ingest RAG knowledge corpus
```bash
pip install httpx
# Add your .txt document files to rag_corpus/
python rag_agents/ingest_corpus.py
```

### 5. Start the agents
Each agent is an independent FastAPI service. Run each in a terminal:
```bash
# Example: start the RAG pipeline
cd rag_agents/rag_pipeline
pip install -r requirements.txt
uvicorn main:app --port 8031

# Or start the patient orchestrator
cd orchestrators/patient_orchestrator
uvicorn main:app --port 8000
```

### 6. Open the frontend
Open `frontend/patient.html` for the Patient Panel  
Open `frontend/hospital.html` for the Hospital Command Centre

### 7. Import n8n workflows
- Open your n8n instance
- Import `n8n_workflows.json` via **Import from file**
- Configure your Supabase and WhatsApp credentials

## 🤖 Models Needed

When your YOLO `.pt` files are ready, place them in the agent folder and uncomment the YOLO lines in `main.py`:

| Agent | Model File | Port |
|---|---|---|
| Skin Screener (P2) | `skin_model.pt` | 8005 |
| Brain Segmenter (H2) | `brain_seg.pt` | 8003 |
| Brain Classifier (H3) | `brain_cls.pt` | 8003 |
| X-Ray Analyzer (H4) | `xray_model.pt` | 8004 |
| Cancer Engine (H5) | `lung_cancer.pt`, `breast_cancer.pt` | 8009 |

## 📚 Tech Stack

- **Backend**: Python · FastAPI · Uvicorn
- **AI Models**: YOLOv8 (Ultralytics) · HuggingFace Transformers · OpenRouter
- **Database**: Supabase (PostgreSQL · pgvector · PostGIS · Realtime · Edge Functions)
- **Orchestration**: n8n (self-hosted)
- **Language AI**: Bhashini API (ASR · MT · TTS)
- **Frontend**: Vanilla HTML/CSS/JS (PWA)
