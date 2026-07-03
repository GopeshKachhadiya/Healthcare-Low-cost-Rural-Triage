// Supabase Edge Function: consent-gate
// Called by: orchestrators before any data operation requiring consent

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CONSENT_REQUIRED_ACTIONS = [
  "abdm_sync", "ai_processing", "data_sharing", "followup_sms", "doctor_view"
];

serve(async (req) => {
  try {
    const { patient_id, action, grant = false, granted_by = null } = await req.json();

    if (!CONSENT_REQUIRED_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ approved: true, reason: "Action does not require consent" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check existing consent
    const { data: existingConsent } = await supabase
      .from("consent_log")
      .select("*")
      .eq("patient_id", patient_id)
      .eq("consent_type", action)
      .eq("granted", true)
      .order("granted_at", { ascending: false })
      .limit(1)
      .single();

    if (existingConsent) {
      return new Response(JSON.stringify({
        approved: true,
        consent_id: existingConsent.id,
        granted_at: existingConsent.granted_at
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Grant new consent if requested
    if (grant) {
      const { data: newConsent, error } = await supabase
        .from("consent_log")
        .insert({
          patient_id,
          consent_type: action,
          granted: true,
          granted_by
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        approved: true,
        consent_id: newConsent.id,
        message: "Consent granted and recorded."
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      approved: false,
      reason: `Patient has not provided consent for action: ${action}`
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
