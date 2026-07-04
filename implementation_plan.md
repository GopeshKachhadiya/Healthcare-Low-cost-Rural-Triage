# Upgrade to Conversational Multi-Agent Intake System (BandRME Style)

The goal is to transform the chatbot from a simple Q&A bot into an active, empathetic **Medical Intake Interviewer** (similar to the BandRME hackathon project). It will systematically ask questions to gather the patient's identity, chief complaint, symptom details, and medical history before handing off to a clinical expert with a generated summary.

## Proposed Changes

### 1. Frontend: Context-Aware Payload
Currently, the frontend only sends the latest text string to the backend. To have a continuous conversation, the backend needs the chat history.

#### [MODIFY] `patient-website/src/hooks/useChat.ts`
- Update the `POST /route` payload to include the full `chatHistory`.
- Map the frontend's `chatHistory` array into a standard LLM format: `[{ role: "user" | "assistant", content: "..." }]`.

### 2. Backend: Conversational Agents
The Patient Orchestrator needs to accept the history and use it to maintain the interview state.

#### [MODIFY] `orchestrators/patient_orchestrator/main.py`
- **Agent 2 (Interaction):** Update the OpenRouter System Prompt to act as the Intake Assistant. It will be instructed to ask exactly one question at a time, moving sequentially through: Basic Info -> Chief Complaint -> Specifics -> Medical History. We will inject the `history` into the OpenRouter payload.
- **Agent 3 (Summary):** Update the Groq Clinical Scribe prompt to not just summarize, but to format the final handoff exactly like the BandRME system (e.g. `@clinical-expert please provide medical assessment...`) when the interview is complete.

## Verification Plan
1. Send a message like "I am sick".
2. Verify the bot asks for ID/basic info.
3. Respond to the questions sequentially and verify the bot remembers context from previous turns.
4. Reach the end of the interview and verify the SBAR Summary is generated.
