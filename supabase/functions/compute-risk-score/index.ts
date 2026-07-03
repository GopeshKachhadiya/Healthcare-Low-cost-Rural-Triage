// Supabase Edge Function: compute-risk-score
// Triggered by: new row in vitals_readings or symptom_queries
// Writes to: risk_flags table
// Calls: n8n escalation webhook if tier is orange/red

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const N8N_WEBHOOK_BASE = Deno.env.get("N8N_WEBHOOK_BASE_URL") || "http://localhost:5678/webhook";

serve(async (req) => {
  try {
    const { record, type } = await req.json(); // Supabase webhook payload

    const patientId = record.patient_id;
    let score = 0;
    let tier = "green";
    const rationale: Record<string, unknown> = {};

    // ─── Vitals-based scoring ────────────────────────────────────────────────
    if (type === "vitals") {
      const v = record;

      // SpO2 scoring
      if (v.spo2 !== null) {
        if (v.spo2 < 90)  { score += 30; rationale.spo2 = "Critical hypoxia (<90%)"; }
        else if (v.spo2 < 94) { score += 15; rationale.spo2 = "Low SpO2 (90–93%)"; }
      }

      // Heart rate
      if (v.heart_rate !== null) {
        if (v.heart_rate > 120 || v.heart_rate < 50) { score += 20; rationale.hr = "Abnormal HR"; }
      }

      // Consciousness (AVPU)
      const avpuScore: Record<string, number> = { alert: 0, voice: 5, pain: 20, unresponsive: 40 };
      if (v.consciousness) {
        score += avpuScore[v.consciousness] ?? 0;
        if ((avpuScore[v.consciousness] ?? 0) > 0) rationale.avpu = `AVPU: ${v.consciousness}`;
      }

      // Temperature
      if (v.temp_c !== null) {
        if (v.temp_c > 40.5 || v.temp_c < 35) { score += 25; rationale.temp = `Extreme temp: ${v.temp_c}°C`; }
        else if (v.temp_c > 39) { score += 10; rationale.temp = `High fever: ${v.temp_c}°C`; }
      }

      // BP
      if (v.systolic_bp !== null) {
        if (v.systolic_bp < 90) { score += 20; rationale.bp = `Hypotension: ${v.systolic_bp}mmHg`; }
        else if (v.systolic_bp > 180) { score += 15; rationale.bp = `Hypertensive: ${v.systolic_bp}mmHg`; }
      }
    }

    // ─── Red-flag keyword scoring ────────────────────────────────────────────
    if (type === "symptom") {
      const text = (record.raw_text || record.translated_text || "").toLowerCase();
      const redFlagKeywords = [
        "chest pain", "breathlessness", "convulsion", "bleeding",
        "facial droop", "slurred speech", "suicide", "unconscious"
      ];

      for (const kw of redFlagKeywords) {
        if (text.includes(kw)) {
          score += 40;
          rationale.keyword = `Red-flag keyword detected: "${kw}"`;
          break;
        }
      }
    }

    // ─── Determine tier ─────────────────────────────────────────────────────
    if (score >= 50)      tier = "red";
    else if (score >= 30) tier = "orange";
    else if (score >= 15) tier = "yellow";
    else                  tier = "green";

    // ─── Write to risk_flags ─────────────────────────────────────────────────
    const { data: flag, error } = await supabase
      .from("risk_flags")
      .insert({
        patient_id: patientId,
        vitals_id: type === "vitals" ? record.id : null,
        score,
        tier,
        rationale
      })
      .select()
      .single();

    if (error) throw error;

    // ─── Escalate if Orange/Red ──────────────────────────────────────────────
    if (tier === "red" || tier === "orange") {
      await fetch(`${N8N_WEBHOOK_BASE}/escalation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          tier,
          rationale,
          risk_flag_id: flag.id
        })
      });
    }

    return new Response(JSON.stringify({ success: true, tier, score, flag_id: flag.id }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
