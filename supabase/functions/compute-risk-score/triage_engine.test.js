import test from 'node:test';
import assert from 'node:assert';
import { 
  scoreSpO2, 
  scoreRespiratoryRate, 
  scoreAVPU, 
  scoreMobility, 
  scoreTemperature, 
  scoreSystolicBP, 
  scoreHeartRate,
  checkHardOverrides,
  checkSymptomOverrides,
  computeCvTier,
  computeFinalTriage 
} from './index.js';

test('Individual Vital Sign Scoring Bands', async (t) => {
  await t.test('scoreSpO2', () => {
    assert.strictEqual(scoreSpO2(98), 0);
    assert.strictEqual(scoreSpO2(95), 1);
    assert.strictEqual(scoreSpO2(93), 2);
    assert.strictEqual(scoreSpO2(88), 3);
  });

  await t.test('scoreRespiratoryRate - Adult', () => {
    assert.strictEqual(scoreRespiratoryRate(16, 18), 0);
    assert.strictEqual(scoreRespiratoryRate(10, 18), 1);
    assert.strictEqual(scoreRespiratoryRate(22, 18), 1);
    assert.strictEqual(scoreRespiratoryRate(27, 18), 2);
    assert.strictEqual(scoreRespiratoryRate(32, 18), 3);
  });

  await t.test('scoreAVPU', () => {
    assert.strictEqual(scoreAVPU('Alert'), 0);
    assert.strictEqual(scoreAVPU('voice'), 1);
    assert.strictEqual(scoreAVPU('p'), 2);
    assert.strictEqual(scoreAVPU('unresponsive'), 3);
  });

  await t.test('scoreMobility', () => {
    assert.strictEqual(scoreMobility(true), 0);
    assert.strictEqual(scoreMobility(false), 2);
  });

  await t.test('scoreTemperature', () => {
    assert.strictEqual(scoreTemperature(36.5), 0);
    assert.strictEqual(scoreTemperature(38.5), 1);
    assert.strictEqual(scoreTemperature(39.5), 2);
    assert.strictEqual(scoreTemperature(34.8), 3);
  });

  await t.test('scoreSystolicBP', () => {
    assert.strictEqual(scoreSystolicBP(120), 0);
    assert.strictEqual(scoreSystolicBP(105), 1);
    assert.strictEqual(scoreSystolicBP(95), 2);
    assert.strictEqual(scoreSystolicBP(225), 2);
    assert.strictEqual(scoreSystolicBP(85), 3);
  });

  await t.test('scoreHeartRate - Adult', () => {
    assert.strictEqual(scoreHeartRate(72, 18), 0);
    assert.strictEqual(scoreHeartRate(45, 18), 1);
    assert.strictEqual(scoreHeartRate(95, 18), 1);
    assert.strictEqual(scoreHeartRate(120, 18), 2);
    assert.strictEqual(scoreHeartRate(135, 18), 3);
  });
});

test('Pediatric Adjustments', async (t) => {
  await t.test('scoreRespiratoryRate - Infant vs Adult', () => {
    // RR of 35 is normal for infant (<=1 yr) but severe (3 pts) for an adult
    assert.strictEqual(scoreRespiratoryRate(35, 0.5), 0);
    assert.strictEqual(scoreRespiratoryRate(35, 18), 3);
  });

  await t.test('scoreHeartRate - Child vs Adult', () => {
    // HR of 135 is normal (0 pts) for infant but severe (3 pts) for an adult
    assert.strictEqual(scoreHeartRate(135, 0.5), 0);
    assert.strictEqual(scoreHeartRate(135, 18), 3);
  });
});

test('Hard Override Rules', async (t) => {
  await t.test('Hypoxia Override (SpO2 < 90%)', () => {
    const vitals = { spo2: 87, consciousness: 'alert' };
    const overrides = checkHardOverrides(vitals);
    assert.ok(overrides.includes('spo2_critical_below_90'));
  });

  await t.test('AVPU Unresponsive Override', () => {
    const vitals = { spo2: 98, consciousness: 'unresponsive' };
    const overrides = checkHardOverrides(vitals);
    assert.ok(overrides.includes('avpu_unresponsive'));
  });

  await t.test('Acute weakness with other abnormal vital', () => {
    const vitals = { spo2: 95, can_walk_unassisted: false, consciousness: 'alert' };
    const overrides = checkHardOverrides(vitals);
    assert.ok(overrides.includes('acute_weakness_with_abnormal_vitals'));
  });
});

test('Pregnancy Specific Rules', async (t) => {
  await t.test('Pre-eclampsia BP Override (SBP >= 160)', () => {
    const vitals = { systolic_bp: 165, consciousness: 'alert' };
    const overrides = checkHardOverrides(vitals, 'F', true);
    assert.ok(overrides.includes('pregnancy_eclampsia_bp_threshold'));
  });
});

test('Symptom Override Keyword Matching', async (t) => {
  await t.test('Red-flag symptom match', () => {
    const res = checkSymptomOverrides("He is experiencing severe chest pain and left arm pain.");
    assert.strictEqual(res.redFlagHit, true);
    assert.strictEqual(res.redFlagTier, 'red');
    assert.ok(res.matchedKeywords.includes('chest pain'));
    assert.ok(res.matchedKeywords.includes('left arm pain'));
  });

  await t.test('Orange-flag symptom match', () => {
    const res = checkSymptomOverrides("His condition is getting worse rapidly.");
    assert.strictEqual(res.redFlagHit, true);
    assert.strictEqual(res.redFlagTier, 'orange');
    assert.ok(res.matchedKeywords.includes('getting worse rapidly'));
  });
});

test('CV Screening Modality Override Mapping', async (t) => {
  await t.test('Skin photo Melanoma override (Orange)', () => {
    const cvResult = { modality: 'skin_photo', predicted_class: 'Melanoma', confidence: 0.45 };
    assert.strictEqual(computeCvTier(cvResult), 'orange');
  });

  await t.test('Chest X-ray Pneumonia (Orange)', () => {
    const cvResult = { modality: 'xray', predicted_class: 'Pneumonia', confidence: 0.85 };
    assert.strictEqual(computeCvTier(cvResult), 'orange');
  });

  await t.test('Chest X-ray TB (Yellow)', () => {
    const cvResult = { modality: 'xray', predicted_class: 'Tuberculosis', confidence: 0.45 };
    assert.strictEqual(computeCvTier(cvResult), 'yellow');
  });

  await t.test('MRI Glioma (Red)', () => {
    const cvResult = { modality: 'mri', predicted_class: 'Glioma', confidence: 0.90 };
    assert.strictEqual(computeCvTier(cvResult), 'red');
  });
});

test('End-to-End Triage Calculations (Worked Examples from Spec)', async (t) => {
  await t.test('Example 1: Healthy Adult (Green)', () => {
    const vitals = {
      heart_rate: 72, resp_rate: 16, spo2: 98, temp_c: 36.8, systolic_bp: 120,
      consciousness: 'alert', can_walk_unassisted: true
    };
    const res = computeFinalTriage(vitals, 'M', false, 'Minor headache for 2 days');
    
    assert.strictEqual(res.tier, 'green');
    assert.strictEqual(res.score, 0);
    assert.strictEqual(res.rationale.vitals_tier, 'green');
    assert.strictEqual(res.rationale.symptom_override.triggered, false);
  });

  await t.test('Example 2: Moderate Concern (Yellow)', () => {
    const vitals = {
      heart_rate: 105, resp_rate: 22, spo2: 95, temp_c: 38.5, systolic_bp: 135,
      consciousness: 'alert', can_walk_unassisted: true
    };
    const res = computeFinalTriage(vitals, 'F', false, 'Cough and fever for 3 days');
    
    assert.strictEqual(res.tier, 'yellow');
    assert.strictEqual(res.score, 4);
    assert.strictEqual(res.rationale.point_breakdown.spo2, 1);
    assert.strictEqual(res.rationale.point_breakdown.rr, 1);
    assert.strictEqual(res.rationale.point_breakdown.temp, 1);
    assert.strictEqual(res.rationale.point_breakdown.hr, 1);
  });

  await t.test('Example 3: Hard Override (Red)', () => {
    const vitals = {
      heart_rate: 78, resp_rate: 18, spo2: 87, temp_c: 37.0, systolic_bp: 130,
      consciousness: 'alert', can_walk_unassisted: true
    };
    const res = computeFinalTriage(vitals, 'M', false, 'Feeling slightly breathless');
    
    assert.strictEqual(res.tier, 'red'); // Overridden to Red
    assert.strictEqual(res.score, 3); // Vitals score was 3 (from SpO2)
    assert.ok(res.rationale.hard_overrides.includes('spo2_critical_below_90'));
  });

  await t.test('Example 4: CV Screening Escalation (Orange)', () => {
    const vitals = {
      heart_rate: 75, resp_rate: 15, spo2: 98,
      consciousness: 'alert', can_walk_unassisted: true
    };
    const cvResult = { modality: 'skin_photo', predicted_class: 'Melanoma', confidence: 0.68 };
    const res = computeFinalTriage(vitals, 'F', false, 'Noticed a dark spot on my arm that has been growing', cvResult);
    
    assert.strictEqual(res.tier, 'orange');
    assert.strictEqual(res.score, 0); // Vitals score is 0
    assert.strictEqual(res.rationale.cv_override.triggered, true);
    assert.strictEqual(res.rationale.cv_override.cv_tier, 'orange');
  });

  await t.test('Example 5: Multi-Stream Escalation (Red)', () => {
    const vitals = {
      heart_rate: 115, resp_rate: 26, spo2: 91, temp_c: 39.5, systolic_bp: 95,
      consciousness: 'voice', can_walk_unassisted: false
    };
    const cvResult = { modality: 'xray', predicted_class: 'Pneumonia', confidence: 0.89 };
    const res = computeFinalTriage(vitals, 'M', false, 'Severe chest pain, can\'t breathe', cvResult);
    
    assert.strictEqual(res.tier, 'red');
    assert.strictEqual(res.score, 14); // 3 (spo2) + 2 (rr) + 1 (avpu) + 2 (mobility) + 2 (temp) + 2 (sbp) + 2 (hr) = 14
    assert.strictEqual(res.rationale.symptom_override.triggered, true);
    assert.ok(res.rationale.symptom_override.keywords_matched.includes('chest pain'));
    assert.ok(res.rationale.symptom_override.keywords_matched.includes("can't breathe"));
    assert.strictEqual(res.rationale.cv_override.cv_tier, 'orange');
  });
});
