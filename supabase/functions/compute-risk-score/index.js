/**
 * ArogyaMitra Triage Engine
 * 
 * Implements the Rural Vitals Score (RVS), single-parameter overrides,
 * pediatric/pregnancy adjustments, and combined multi-stream triage calculations.
 * 
 * Works natively in Deno (Supabase Edge Functions) and Node.js (testing).
 */

// ════════════════════════════════════════════════════════════════
// Individual Vitals Scoring Functions
// ════════════════════════════════════════════════════════════════

export function scoreSpO2(spo2) {
  if (spo2 === undefined || spo2 === null) return 0;
  if (spo2 >= 96) return 0;
  if (spo2 >= 94) return 1;
  if (spo2 >= 92) return 2;
  return 3; // < 92%
}

export function scoreRespiratoryRate(rr, ageYears = 18) {
  if (rr === undefined || rr === null) return 0;

  // Pediatric adjustments (§10.1)
  if (ageYears <= 1) { // 0-1 year
    if (rr >= 30 && rr <= 40) return 0;
    if ((rr >= 25 && rr <= 29) || (rr >= 41 && rr <= 50)) return 1;
    if ((rr >= 20 && rr <= 24) || (rr >= 51 && rr <= 60)) return 2;
    return 3; // < 20 or > 60
  }
  
  if (ageYears <= 5) { // 1-5 years
    if (rr >= 20 && rr <= 30) return 0;
    if ((rr >= 15 && rr <= 19) || (rr >= 31 && rr <= 40)) return 1;
    if ((rr >= 10 && rr <= 14) || (rr >= 41 && rr <= 50)) return 2;
    return 3; // < 10 or > 50
  }
  
  if (ageYears <= 12) { // 5-12 years
    if (rr >= 15 && rr <= 25) return 0;
    if ((rr >= 12 && rr <= 14) || (rr >= 26 && rr <= 30)) return 1;
    if ((rr >= 10 && rr <= 11) || (rr >= 31 && rr <= 35)) return 2;
    return 3; // < 10 or > 35
  }

  // Adult bands (§4.1)
  if (rr >= 12 && rr <= 20) return 0;
  if ((rr >= 9 && rr <= 11) || (rr >= 21 && rr <= 24)) return 1;
  if (rr >= 25 && rr <= 29) return 2;
  return 3; // <= 8 or >= 30
}

export function scoreAVPU(level) {
  if (!level) return 0;
  const normalized = level.toLowerCase();
  if (normalized === 'alert' || normalized === 'a') return 0;
  if (normalized === 'voice' || normalized === 'v') return 1;
  if (normalized === 'pain' || normalized === 'p') return 2;
  if (normalized === 'unresponsive' || normalized === 'u') return 3;
  return 0;
}

export function scoreMobility(canWalkUnassisted) {
  if (canWalkUnassisted === undefined || canWalkUnassisted === null) return 0;
  return canWalkUnassisted ? 0 : 2;
}

export function scoreTemperature(tempC) {
  if (tempC === undefined || tempC === null) return 0;
  if (tempC >= 36.1 && tempC <= 38.0) return 0;
  if ((tempC >= 35.1 && tempC <= 36.0) || (tempC >= 38.1 && tempC <= 39.0)) return 1;
  if (tempC >= 39.1 && tempC <= 40.0) return 2;
  return 3; // <= 35.0 or > 40.0
}

export function scoreSystolicBP(sbp) {
  if (sbp === undefined || sbp === null) return 0;
  if (sbp >= 110 && sbp <= 219) return 0;
  if (sbp >= 100 && sbp <= 109) return 1;
  if (sbp >= 220 || (sbp >= 91 && sbp <= 99)) return 2;
  return 3; // <= 90
}

export function scoreHeartRate(hr, ageYears = 18) {
  if (hr === undefined || hr === null) return 0;

  // Pediatric adjustments (§10.2)
  if (ageYears <= 1) { // 0-1 year
    if (hr >= 100 && hr <= 160) return 0;
    if ((hr >= 90 && hr <= 99) || (hr >= 161 && hr <= 180)) return 1;
    if ((hr >= 80 && hr <= 89) || (hr >= 181 && hr <= 200)) return 2;
    return 3; // < 80 or > 200
  }
  
  if (ageYears <= 5) { // 1-5 years
    if (hr >= 80 && hr <= 140) return 0;
    if ((hr >= 70 && hr <= 79) || (hr >= 141 && hr <= 160)) return 1;
    if ((hr >= 60 && hr <= 69) || (hr >= 161 && hr <= 180)) return 2;
    return 3; // < 60 or > 180
  }
  
  if (ageYears <= 12) { // 5-12 years
    if (hr >= 70 && hr <= 120) return 0;
    if ((hr >= 60 && hr <= 69) || (hr >= 121 && hr <= 140)) return 1;
    if ((hr >= 50 && hr <= 59) || (hr >= 141 && hr <= 160)) return 2;
    return 3; // < 50 or > 160
  }

  // Adult bands (§4.2)
  if (hr >= 51 && hr <= 90) return 0;
  if ((hr >= 41 && hr <= 50) || (hr >= 91 && hr <= 110)) return 1;
  if (hr >= 111 && hr <= 130) return 2;
  return 3; // <= 40 or > 130
}

// ════════════════════════════════════════════════════════════════
// Hard Override Assessment (§5 & §11)
// ════════════════════════════════════════════════════════════════

export function checkHardOverrides(vitals, patientGender = 'M', isPregnant = false) {
  const overrides = [];
  const ageYears = vitals.age_years || 18;

  // SpO2 < 90% is a critical override to RED
  if (vitals.spo2 !== undefined && vitals.spo2 !== null && vitals.spo2 < 90) {
    overrides.push('spo2_critical_below_90');
  }

  // AVPU Unresponsive is a critical override to RED
  if (vitals.consciousness && vitals.consciousness.toLowerCase() === 'unresponsive') {
    overrides.push('avpu_unresponsive');
  }

  // Respiratory Rate overrides
  if (vitals.resp_rate !== undefined && vitals.resp_rate !== null) {
    if (ageYears > 12) {
      if (vitals.resp_rate < 8 || vitals.resp_rate > 30) {
        overrides.push('rr_critical');
      }
    } else {
      // Pediatric critical rates
      const limit = ageYears <= 1 ? 60 : ageYears <= 5 ? 50 : 35;
      const lowLimit = ageYears <= 1 ? 20 : 10;
      if (vitals.resp_rate < lowLimit || vitals.resp_rate > limit) {
        overrides.push('rr_pediatric_critical');
      }
    }
  }

  // Systolic BP overrides
  if (vitals.systolic_bp !== undefined && vitals.systolic_bp !== null) {
    if (vitals.systolic_bp <= 90) {
      overrides.push('sbp_critical_below_90');
    }
  }

  // Heart Rate overrides
  if (vitals.heart_rate !== undefined && vitals.heart_rate !== null) {
    if (ageYears > 12) {
      if (vitals.heart_rate <= 40 || vitals.heart_rate > 130) {
        overrides.push('hr_critical');
      }
    } else {
      const limit = ageYears <= 1 ? 200 : ageYears <= 5 ? 180 : 160;
      const lowLimit = ageYears <= 1 ? 80 : ageYears <= 5 ? 60 : 50;
      if (vitals.heart_rate < lowLimit || vitals.heart_rate > limit) {
        overrides.push('hr_pediatric_critical');
      }
    }
  }

  // Temperature overrides
  if (vitals.temp_c !== undefined && vitals.temp_c !== null) {
    if (vitals.temp_c <= 35.0 || vitals.temp_c > 40.0) {
      overrides.push('temp_critical');
    }
  }

  // Mobility override (acute inability to walk + other abnormal vital)
  if (vitals.can_walk_unassisted === false) {
    const hasOtherAbnormal = 
      (vitals.spo2 !== undefined && scoreSpO2(vitals.spo2) > 0) ||
      (vitals.resp_rate !== undefined && scoreRespiratoryRate(vitals.resp_rate, ageYears) > 0) ||
      (vitals.consciousness && scoreAVPU(vitals.consciousness) > 0) ||
      (vitals.temp_c !== undefined && scoreTemperature(vitals.temp_c) > 0) ||
      (vitals.systolic_bp !== undefined && scoreSystolicBP(vitals.systolic_bp) > 0) ||
      (vitals.heart_rate !== undefined && scoreHeartRate(vitals.heart_rate, ageYears) > 0);

    if (hasOtherAbnormal) {
      overrides.push('acute_weakness_with_abnormal_vitals');
    }
  }

  // Pregnancy-specific overrides (§11.1)
  if (patientGender === 'F' && isPregnant) {
    if (vitals.systolic_bp >= 160 || (vitals.diastolic_bp !== undefined && vitals.diastolic_bp >= 110)) {
      overrides.push('pregnancy_eclampsia_bp_threshold');
    }
  }

  return overrides;
}

// ════════════════════════════════════════════════════════════════
// Symptom Red-Flag Scanner (§6)
// ════════════════════════════════════════════════════════════════

export function checkSymptomOverrides(symptomsText) {
  if (!symptomsText) return { redFlagHit: false, redFlagTier: 'green', matchedKeywords: [] };

  const normalized = symptomsText.toLowerCase();
  const matchedKeywords = [];

  // Red Category Keywords
  const redKeywords = [
    "chest pain", "left arm pain", "crushing pain", "heart attack", "palpitations with fainting",
    "can't breathe", "breathlessness", "choking", "turning blue", "gasping",
    "facial droop", "slurred speech", "one side weakness", "seizure", "convulsion", "fitting", "unconscious",
    "uncontrolled bleeding", "vomiting blood", "blood in stool",
    "abdominal pain in pregnancy", "bleeding during pregnancy", "baby not moving", "water broke",
    "neck stiffness", "fever with rash", "fever with confusion",
    "wants to die", "suicidal", "self-harm", "poisoning", "overdose",
    "throat swelling", "tongue swelling", "can't swallow", "anaphylaxis"
  ];

  // Orange Category Keywords
  const orangeKeywords = [
    "getting worse rapidly", "sudden severe pain", "high fever in infant"
  ];

  for (const kw of redKeywords) {
    if (normalized.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  if (matchedKeywords.length > 0) {
    return {
      redFlagHit: true,
      redFlagTier: 'red',
      matchedKeywords
    };
  }

  for (const kw of orangeKeywords) {
    if (normalized.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  if (matchedKeywords.length > 0) {
    return {
      redFlagHit: true,
      redFlagTier: 'orange',
      matchedKeywords
    };
  }

  return {
    redFlagHit: false,
    redFlagTier: 'green',
    matchedKeywords: []
  };
}

// ════════════════════════════════════════════════════════════════
// CV Screening Override Mapping (§7)
// ════════════════════════════════════════════════════════════════

export function computeCvTier(cvResult) {
  if (!cvResult) return 'green';

  const { modality, predicted_class, confidence } = cvResult;
  if (!modality || !predicted_class) return 'green';

  const normalizedClass = predicted_class.toLowerCase();
  const conf = confidence || 0;

  // Skin/Oral Screening
  if (['skin_photo', 'oral_photo'].includes(modality)) {
    if (['melanoma', 'basal cell carcinoma', 'bcc', 'squamous cell carcinoma', 'scc', 'oral squamous cell carcinoma', 'oscc'].includes(normalizedClass)) {
      return 'orange'; // Melanoma/BCC/SCC at any confidence warrants Orange minimum
    }
    if (conf >= 0.80) {
      return 'yellow'; // High confidence triggers Yellow review minimum
    }
    return 'green';
  }

  // Eye Screening
  if (modality === 'eye_photo') {
    if (normalizedClass.includes('proliferative') || normalizedClass.includes('severe')) {
      return conf >= 0.70 ? 'orange' : 'yellow';
    }
    if (normalizedClass.includes('diabetic retinopathy')) {
      return conf >= 0.70 ? 'yellow' : 'green';
    }
    return conf >= 0.80 ? 'yellow' : 'green';
  }

  // Brain MRI
  if (modality === 'mri') {
    if (normalizedClass.includes('glioma')) return 'red';
    if (normalizedClass.includes('meningioma')) return 'orange';
    if (normalizedClass.includes('pituitary')) return 'yellow';
    return 'green';
  }

  // Chest X-ray
  if (modality === 'xray') {
    if (normalizedClass.includes('pneumonia') && conf >= 0.80) return 'orange';
    if (normalizedClass.includes('tuberculosis') && conf >= 0.40) return 'yellow';
    return 'green';
  }

  // CT or Histopathology (Cancer Screening)
  if (['ct', 'histopath'].includes(modality)) {
    if (normalizedClass.includes('malignant') || normalizedClass.includes('adenocarcinoma') || normalizedClass.includes('cancer')) {
      return conf >= 0.70 ? 'red' : 'orange';
    }
    return 'green';
  }

  return 'green';
}

// ════════════════════════════════════════════════════════════════
// Main Combined Triage Calculator (§8)
// ════════════════════════════════════════════════════════════════

export function computeFinalTriage(vitals, patientGender = 'M', isPregnant = false, symptomsText = '', cvResult = null) {
  const ageYears = vitals.age_years || 18;
  const breakdown = {};
  let score = 0;

  // 1. Calculate Core RVS Score
  if (vitals.spo2 !== undefined && vitals.spo2 !== null) {
    breakdown.spo2 = {
      value: vitals.spo2,
      points: scoreSpO2(vitals.spo2),
      range: vitals.spo2 >= 96 ? ">= 96%" : vitals.spo2 >= 94 ? "94-95%" : vitals.spo2 >= 92 ? "92-93%" : "< 92%"
    };
    score += breakdown.spo2.points;
  }
  
  if (vitals.resp_rate !== undefined && vitals.resp_rate !== null) {
    breakdown.rr = {
      value: vitals.resp_rate,
      points: scoreRespiratoryRate(vitals.resp_rate, ageYears),
      range: `${vitals.resp_rate} breaths/min`
    };
    score += breakdown.rr.points;
  }
  
  if (vitals.consciousness) {
    breakdown.avpu = {
      value: vitals.consciousness,
      points: scoreAVPU(vitals.consciousness)
    };
    score += breakdown.avpu.points;
  }
  
  if (vitals.can_walk_unassisted !== undefined && vitals.can_walk_unassisted !== null) {
    breakdown.mobility = {
      value: vitals.can_walk_unassisted,
      points: scoreMobility(vitals.can_walk_unassisted)
    };
    score += breakdown.mobility.points;
  }

  // 2. Calculate Extended RVS Score
  if (vitals.temp_c !== undefined && vitals.temp_c !== null) {
    breakdown.temp = {
      value: vitals.temp_c,
      points: scoreTemperature(vitals.temp_c),
      range: `${vitals.temp_c}°C`
    };
    score += breakdown.temp.points;
  }
  
  if (vitals.systolic_bp !== undefined && vitals.systolic_bp !== null) {
    breakdown.sbp = {
      value: vitals.systolic_bp,
      points: scoreSystolicBP(vitals.systolic_bp),
      range: `${vitals.systolic_bp} mmHg`
    };
    score += breakdown.sbp.points;
  }
  
  if (vitals.heart_rate !== undefined && vitals.heart_rate !== null) {
    breakdown.hr = {
      value: vitals.heart_rate,
      points: scoreHeartRate(vitals.heart_rate, ageYears),
      range: `${vitals.heart_rate} bpm`
    };
    score += breakdown.hr.points;
  }

  // Map baseline vitals score to tier
  let vitalsTier = 'green';
  if (score >= 10) vitalsTier = 'red';
  else if (score >= 7) vitalsTier = 'orange';
  else if (score >= 4) vitalsTier = 'yellow';

  // Apply Hard Overrides
  const hardOverrides = checkHardOverrides(vitals, patientGender, isPregnant);
  if (hardOverrides.length > 0) {
    vitalsTier = 'red';
  }

  // 3. Process Symptoms Override
  const symptomOverride = checkSymptomOverrides(symptomsText);

  // 4. Process CV Override
  const cvTier = computeCvTier(cvResult);

  // 5. Final Tier is the maximum of all three channels
  const tierOrder = { 'green': 0, 'yellow': 1, 'orange': 2, 'red': 3 };
  const finalTier = ['green', 'yellow', 'orange', 'red'].reduce((currentMax, tier) => {
    const isHigher = (tier === vitalsTier || tier === symptomOverride.redFlagTier || tier === cvTier) &&
                     (tierOrder[tier] > tierOrder[currentMax]);
    return isHigher ? tier : currentMax;
  }, 'green');

  // Assembly of Rationale JSON matching §17.1 schema
  const rationale = {
    engine_version: "1.0.0",
    vitals_score: score,
    vitals_tier: vitalsTier,
    point_breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, v.points])
    ),
    point_details: breakdown, // added helper for full audit
    parameters_available: Object.keys(breakdown).length,
    parameters_possible: 7,
    hard_overrides: hardOverrides,
    symptom_override: {
      triggered: symptomOverride.redFlagHit,
      keywords_matched: symptomOverride.matchedKeywords,
      symptom_tier: symptomOverride.redFlagTier
    },
    final_tier: finalTier,
    tier_sources: {
      vitals: vitalsTier,
      symptoms: symptomOverride.redFlagTier,
      cv: cvTier,
      determined_by: "max_of_all"
    },
    computed_at: new Date().toISOString()
  };

  if (cvResult) {
    rationale.cv_override = {
      triggered: cvTier !== 'green',
      modality: cvResult.modality,
      predicted_class: cvResult.predicted_class,
      confidence: cvResult.confidence,
      cv_tier: cvTier
    };
  }

  return {
    tier: finalTier,
    score,
    rationale
  };
}

// ════════════════════════════════════════════════════════════════
// Deno Edge Function Server Entrypoint
// ════════════════════════════════════════════════════════════════

if (typeof Deno !== 'undefined') {
  // We dynamic import Deno std lib only when running in Deno to prevent Node crash
  const { serve } = await import("https://deno.land/std@0.131.0/http/server.ts");
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

  serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      });
    }

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      );

      const body = await req.json();
      const { record, table } = body; // standard Supabase webhook payload

      let patientId, vitalsRecord = {}, gender = 'M', isPregnant = false, symptomsText = '', cvResult = null;

      if (table === 'vitals_readings') {
        vitalsRecord = record;
        patientId = record.patient_id;

        // Fetch patient context
        const { data: patient } = await supabase
          .from('patients')
          .select('gender, dob')
          .eq('id', patientId)
          .single();

        if (patient) {
          gender = patient.gender || 'M';
          if (patient.dob) {
            const ageDifMs = Date.now() - new Date(patient.dob).getTime();
            const ageDate = new Date(ageDifMs);
            vitalsRecord.age_years = Math.abs(ageDate.getUTCFullYear() - 1970);
          }
        }

        // Fetch recent pregnancy consent or symptom context
        const { data: consent } = await supabase
          .from('consent_log')
          .select('granted')
          .eq('patient_id', patientId)
          .eq('consent_type', 'pregnancy')
          .eq('granted', true)
          .order('granted_at', { ascending: false })
          .limit(1);
        isPregnant = consent && consent.length > 0;

        // Fetch recent symptom query
        const { data: symptomQuery } = await supabase
          .from('symptom_queries')
          .select('translated_text')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        symptomsText = symptomQuery?.translated_text || '';

        // Fetch recent CV screening
        const { data: cv } = await supabase
          .from('cv_screenings')
          .select('modality, prediction, confidence')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (cv) {
          // Find max probability class
          let maxClass = '';
          let maxConf = 0;
          if (cv.prediction && typeof cv.prediction === 'object') {
            for (const [cls, conf] of Object.entries(cv.prediction)) {
              if (conf > maxConf) {
                maxConf = conf;
                maxClass = cls;
              }
            }
          }
          cvResult = {
            modality: cv.modality,
            predicted_class: maxClass,
            confidence: maxConf
          };
        }
      }

      // Compute final triage
      const triage = computeFinalTriage(vitalsRecord, gender, isPregnant, symptomsText, cvResult);

      // Save to risk_flags
      const { data: insertedFlag, error: insertError } = await supabase
        .from('risk_flags')
        .insert({
          patient_id: patientId,
          vitals_id: vitalsRecord.id,
          score: triage.score,
          tier: triage.tier,
          rationale: triage.rationale
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // n8n Hook Dispatcher
      if (['orange', 'red'].includes(triage.tier)) {
        const n8nUrl = Deno.env.get('N8N_WEBHOOK_BASE_URL');
        if (n8nUrl) {
          // Log automation event start
          const { data: eventRow } = await supabase
            .from('automation_events')
            .insert({
              workflow_name: 'red_flag_escalation',
              trigger_table: 'risk_flags',
              trigger_row_id: insertedFlag.id,
              patient_id: patientId,
              status: 'triggered',
              channel: 'whatsapp'
            })
            .select()
            .single();

          const startTime = Date.now();
          try {
            const n8nRes = await fetch(`${n8nUrl}/escalation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_id: eventRow?.id,
                patient_id: patientId,
                tier: triage.tier,
                score: triage.score,
                rationale: triage.rationale
              })
            });

            const latency = Date.now() - startTime;
            await supabase
              .from('automation_events')
              .update({
                status: n8nRes.ok ? 'sent' : 'failed',
                latency_ms: latency,
                payload: { status_code: n8nRes.status }
              })
              .eq('id', eventRow.id);

          } catch (n8nErr) {
            await supabase
              .from('automation_events')
              .update({
                status: 'failed',
                latency_ms: Date.now() - startTime,
                payload: { error: n8nErr.message }
              })
              .eq('id', eventRow.id);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, result: triage }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  });
}
