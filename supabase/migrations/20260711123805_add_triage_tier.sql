ALTER TABLE chat_sessions 
ADD COLUMN triage_tier text DEFAULT 'green',
ADD COLUMN sbar_report text;
