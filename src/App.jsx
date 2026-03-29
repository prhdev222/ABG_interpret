import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Activity, Wind, Calculator, Stethoscope, BookOpen, CheckCircle2, Info, Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function format1(n) {
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(1);
}

function rangeText(low, high) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return "-";
  return `${low.toFixed(1)}–${high.toFixed(1)}`;
}

function abgInterpretation({ ph, pco2, hco3, pao2, fio2, na, cl, albumin }) {
  const notes = [];
  const warnings = [];
  const suggestions = [];

  if (ph == null || pco2 == null || hco3 == null) {
    return {
      primary: "กรอกค่า pH, PaCO₂ และ HCO₃⁻ เพื่อเริ่มแปลผล",
      details: [],
      warnings: [],
      suggestions: [],
      calculations: {},
      formulas: {},
    };
  }

  let acidBaseStatus = "mixed/near normal";
  if (ph < 7.35) acidBaseStatus = "acidemia";
  else if (ph > 7.45) acidBaseStatus = "alkalemia";

  let primary = "ไม่สามารถสรุป primary disorder ได้ชัดเจน";
  const expected = {};
  const formulas = {};

  if (ph < 7.35) {
    if (hco3 < 22 && (pco2 <= 45 || hco3 < 18)) {
      primary = "Primary metabolic acidosis";
      expected.winterLow = 1.5 * hco3 + 8 - 2;
      expected.winterHigh = 1.5 * hco3 + 8 + 2;
      formulas.winters = {
        label: "Winter's formula",
        formula: "Expected PaCO₂ = (1.5 × HCO₃⁻) + 8 ± 2",
        substitution: `= (1.5 × ${format1(hco3)}) + 8 ± 2`,
        result: `ช่วงที่คาดได้ ≈ ${rangeText(expected.winterLow, expected.winterHigh)} mmHg`,
        reference: "ใช้ประเมิน respiratory compensation ใน primary metabolic acidosis",
      };
      if (pco2 < expected.winterLow) notes.push("มี respiratory alkalosis ร่วมด้วย");
      else if (pco2 > expected.winterHigh) notes.push("มี respiratory acidosis ร่วมด้วย หรือมี hypoventilation เกินคาด");
      else notes.push("respiratory compensation ใกล้เคียง Winter's formula");
    } else if (pco2 > 45) {
      primary = "Primary respiratory acidosis";
      const delta = pco2 - 40;
      expected.acuteHco3 = 24 + (delta / 10) * 1;
      expected.chronicHco3 = 24 + (delta / 10) * 3.5;
      formulas.respAcidosis = {
        label: "Expected compensation in respiratory acidosis",
        formula: "Acute: HCO₃⁻ = 24 + 1 × ((PaCO₂ − 40)/10), Chronic: HCO₃⁻ = 24 + 3.5 × ((PaCO₂ − 40)/10)",
        substitution: `Acute = 24 + 1 × ((${format1(pco2)} − 40)/10), Chronic = 24 + 3.5 × ((${format1(pco2)} − 40)/10)`,
        result: `Acute expected HCO₃⁻ ≈ ${format1(expected.acuteHco3)} mEq/L, Chronic expected HCO₃⁻ ≈ ${format1(expected.chronicHco3)} mEq/L`,
        reference: "ใช้เทียบว่ามี metabolic acidosis/alkalosis ร่วมด้วยหรือไม่",
      };
      if (hco3 < expected.acuteHco3 - 2) notes.push("HCO₃⁻ ต่ำกว่าที่ควร อาจมี metabolic acidosis ร่วม");
      else if (hco3 > expected.chronicHco3 + 2) notes.push("HCO₃⁻ สูงเกิน expected อาจมี metabolic alkalosis ร่วม");
      else notes.push("ลักษณะสอดคล้องกับ respiratory acidosis แบบ acute/chronic overlap ตามบริบท");
    }
  } else if (ph > 7.45) {
    if (hco3 > 26 && (pco2 <= 45 || hco3 > 30)) {
      primary = "Primary metabolic alkalosis";
      expected.metAlkLow = 0.7 * (hco3 - 24) + 40 - 5;
      expected.metAlkHigh = 0.7 * (hco3 - 24) + 40 + 5;
      formulas.metAlkalosis = {
        label: "Expected compensation in metabolic alkalosis",
        formula: "Expected PaCO₂ ≈ 40 + 0.7 × (HCO₃⁻ − 24) ± 5",
        substitution: `= 40 + 0.7 × (${format1(hco3)} − 24) ± 5`,
        result: `ช่วงที่คาดได้ ≈ ${rangeText(expected.metAlkLow, expected.metAlkHigh)} mmHg`,
        reference: "ใช้ประเมินว่าการคั่ง CO₂ อยู่ในช่วงที่เหมาะกับ metabolic alkalosis หรือไม่",
      };
      if (pco2 < expected.metAlkLow) notes.push("มี respiratory alkalosis ร่วมด้วย");
      else if (pco2 > expected.metAlkHigh) notes.push("มี respiratory acidosis ร่วมด้วย");
      else notes.push("respiratory compensation ใกล้เคียง expected");
    } else if (pco2 < 35) {
      primary = "Primary respiratory alkalosis";
      const delta = 40 - pco2;
      expected.acuteHco3 = 24 - (delta / 10) * 2;
      expected.chronicHco3 = 24 - (delta / 10) * 4;
      formulas.respAlkalosis = {
        label: "Expected compensation in respiratory alkalosis",
        formula: "Acute: HCO₃⁻ = 24 − 2 × ((40 − PaCO₂)/10), Chronic: HCO₃⁻ = 24 − 4 × ((40 − PaCO₂)/10)",
        substitution: `Acute = 24 − 2 × ((40 − ${format1(pco2)})/10), Chronic = 24 − 4 × ((40 − ${format1(pco2)})/10)`,
        result: `Acute expected HCO₃⁻ ≈ ${format1(expected.acuteHco3)} mEq/L, Chronic expected HCO₃⁻ ≈ ${format1(expected.chronicHco3)} mEq/L`,
        reference: "ใช้เทียบว่ามี metabolic acidosis/alkalosis ร่วมด้วยหรือไม่",
      };
      if (hco3 > expected.acuteHco3 + 2) notes.push("HCO₃⁻ สูงเกิน expected อาจมี metabolic alkalosis ร่วม");
      else if (hco3 < expected.chronicHco3 - 2) notes.push("HCO₃⁻ ต่ำเกิน expected อาจมี metabolic acidosis ร่วม");
      else notes.push("ลักษณะสอดคล้องกับ respiratory alkalosis ตามการชดเชย");
    }
  } else {
    if (pco2 > 45 && hco3 > 26) primary = "Near-normal pH with combined respiratory acidosis + metabolic alkalosis or compensated respiratory acidosis";
    else if (pco2 < 35 && hco3 < 22) primary = "Near-normal pH with combined respiratory alkalosis + metabolic acidosis or compensated respiratory alkalosis";
    else primary = "pH ใกล้ปกติ ต้องดูแนวโน้มและบริบทคลินิกร่วม";
  }

  const calculations = {};

  if (na != null && cl != null && hco3 != null) {
    const ag = na - cl - hco3;
    calculations.ag = ag;
    formulas.ag = {
      label: "Anion gap",
      formula: "AG = Na⁺ − (Cl⁻ + HCO₃⁻)",
      substitution: `= ${format1(na)} − (${format1(cl)} + ${format1(hco3)})`,
      result: `AG = ${format1(ag)} mEq/L`,
      reference: "ช่วยแยก high anion gap metabolic acidosis ออกจาก non-gap acidosis",
    };
    if (albumin != null) {
      calculations.agCorrected = ag + 2.5 * (4 - albumin);
      formulas.agCorrected = {
        label: "Albumin-corrected AG",
        formula: "Corrected AG = AG + 2.5 × (4 − albumin)",
        substitution: `= ${format1(ag)} + 2.5 × (4 − ${format1(albumin)})`,
        result: `Corrected AG = ${format1(calculations.agCorrected)} mEq/L`,
        reference: "albumin ต่ำอาจทำให้ AG ดูต่ำกว่าความจริง",
      };
    }
    if (ag > 12) {
      notes.push("anion gap สูง");
      if (albumin != null) notes.push("ควรพิจารณา corrected AG ตาม albumin");
    }
  }

  if (calculations.ag != null && calculations.ag > 12) {
    const correctedAG = calculations.agCorrected ?? calculations.ag;
    const deltaAG = correctedAG - 12;
    const deltaHco3 = 24 - hco3;
    calculations.deltaRatio = deltaHco3 !== 0 ? deltaAG / deltaHco3 : null;
    formulas.deltaRatio = {
      label: "Delta ratio",
      formula: "Delta ratio = (Corrected AG − 12) / (24 − HCO₃⁻)",
      substitution: `= (${format1(correctedAG)} − 12) / (24 − ${format1(hco3)})`,
      result: `Delta ratio = ${format1(calculations.deltaRatio)}`,
      reference: "ช่วยมองหา mixed disorder ใน high anion gap metabolic acidosis",
    };
    if (calculations.deltaRatio != null) {
      if (calculations.deltaRatio < 0.8) notes.push("อาจมี non-anion gap metabolic acidosis ร่วม");
      else if (calculations.deltaRatio > 2) notes.push("อาจมี metabolic alkalosis ร่วมหรือ chronic CO₂ retention");
    }
  }

  if (pao2 != null && fio2 != null && fio2 > 0) {
    calculations.pfRatio = pao2 / fio2;
    const PAO2 = fio2 * (760 - 47) - (pco2 / 0.8);
    calculations.alveolarO2 = PAO2;
    calculations.aAGradient = PAO2 - pao2;

    formulas.pfRatio = {
      label: "P/F ratio",
      formula: "P/F ratio = PaO₂ / FiO₂",
      substitution: `= ${format1(pao2)} / ${format1(fio2)}`,
      result: `P/F ratio = ${format1(calculations.pfRatio)}`,
      reference: "ใช้ประเมินความรุนแรงของ oxygenation defect",
    };

    formulas.alveolarO2 = {
      label: "Alveolar gas equation",
      formula: "PAO₂ = FiO₂ × (760 − 47) − (PaCO₂ / 0.8)",
      substitution: `= ${format1(fio2)} × (760 − 47) − (${format1(pco2)} / 0.8)`,
      result: `PAO₂ ≈ ${format1(PAO2)} mmHg`,
      reference: "คำนวณ alveolar oxygen ที่ระดับน้ำทะเล โดยใช้ RQ ≈ 0.8",
    };

    formulas.aAGradient = {
      label: "A–a gradient",
      formula: "A–a gradient = PAO₂ − PaO₂",
      substitution: `= ${format1(PAO2)} − ${format1(pao2)}`,
      result: `A–a gradient = ${format1(calculations.aAGradient)} mmHg`,
      reference: "ค่าสูงสนับสนุน V/Q mismatch, shunt หรือ diffusion problem",
    };

    if (calculations.pfRatio < 100) notes.push("oxygenation defect รุนแรงมาก (P/F < 100)");
    else if (calculations.pfRatio < 200) notes.push("oxygenation defect รุนแรง (P/F < 200)");
    else if (calculations.pfRatio < 300) notes.push("oxygenation defect ระดับปานกลาง (P/F < 300)");

    if (calculations.aAGradient > 20) notes.push("A–a gradient สูง สนับสนุน V/Q mismatch, shunt หรือ diffusion problem");
  }

  if (ph < 7.20) warnings.push("ภาวะ acidemia รุนแรง ควรประเมินสาเหตุและการระบาย CO₂ อย่างเร่งด่วน");
  if (pco2 > 60) warnings.push("PaCO₂ สูงมาก ต้องประเมิน minute ventilation, dead space, fatigue และ airway issues");
  if (pao2 != null && pao2 < 60) warnings.push("PaO₂ ต่ำ เข้ากับ hypoxemia ที่มีนัยสำคัญ");

  suggestions.push("ให้ประเมินร่วมกับภาพรวมผู้ป่วย เช่น work of breathing, hemodynamics, mental status, secretion, compliance และ X-ray/ultrasound ปอด");

  return {
    primary: `${acidBaseStatus.toUpperCase()}: ${primary}`,
    details: notes,
    warnings,
    suggestions,
    calculations,
    formulas,
  };
}

function ventAdvice({ mode, rr, vt, ibw, fio2, peep, pco2, pao2, ph, spo2, plateu, pip }) {
  const items = [];
  const cautions = [];

  if (pco2 != null && ph != null) {
    if (pco2 > 45 && ph < 7.35) {
      items.push("แนวโน้ม hypoventilation / ventilation ไม่พอ");
      if (rr != null) items.push("พิจารณาเพิ่ม RR ทีละเล็กน้อย หากยังไม่มี auto-PEEP และ expiratory time ยังพอ");
      if (vt != null && ibw != null) {
        const vtPerKg = vt / ibw;
        if (vtPerKg < 6) items.push("หากจำเป็นอาจขยับ VT แบบระมัดระวังให้อยู่ในกรอบ lung-protective โดยหลีกเลี่ยงเกินประมาณ 6–8 mL/kg IBW");
      }
      items.push("ตรวจ circuit, airway obstruction, secretion, bronchospasm, patient-ventilator asynchrony และ dead space");
    }

    if (pco2 < 35 && ph > 7.45) {
      items.push("แนวโน้ม hyperventilation");
      items.push("พิจารณาลด RR หรือ VT ตาม mode และ clinical target");
      items.push("ประเมิน pain, anxiety, fever, sepsis, hypoxemia หรือ central drive สูง");
    }
  }

  if (pao2 != null && fio2 != null) {
    const pf = pao2 / fio2;
    if (pao2 < 60 || pf < 150) {
      items.push("oxygenation ยังไม่ดี ควรประเมิน recruitment, PEEP adequacy, secretion, atelectasis, pulmonary edema, pneumonia หรือ shunt");
      if (fio2 < 0.6) items.push("อาจพิจารณาเพิ่ม FiO₂ ชั่วคราวเพื่อความปลอดภัยระหว่างประเมินสาเหตุ");
      if (peep != null) items.push("พิจารณาปรับ PEEP อย่างค่อยเป็นค่อยไป หาก hemodynamics รับได้ และไม่มีข้อห้าม");
      items.push("ประเมินการจัดท่า, suction, lung ultrasound/CXR และสาเหตุที่แก้ได้");
    } else if (fio2 != null && fio2 > 0.6 && pao2 > 80) {
      items.push("หาก oxygenation คงที่ดี อาจพิจารณาลด FiO₂ ก่อน เพื่อลด oxygen toxicity โดยคง SpO₂ เป้าหมายตามบริบทโรค");
    }
  }

  if (spo2 != null) {
    if (spo2 < 90) cautions.push("SpO₂ ต่ำ ควรประเมินผู้ป่วยจริงทันที ไม่ควรอาศัยตัวเลข ABG เพียงอย่างเดียว");
    if (spo2 > 98 && fio2 != null && fio2 >= 0.6) cautions.push("SpO₂ สูงมากบน FiO₂ สูง อาจลด FiO₂ ได้ถ้าเหมาะกับบริบทผู้ป่วย");
  }

  if (plateu != null && plateu > 30) cautions.push("Plateau pressure > 30 cmH₂O เพิ่มความเสี่ยง ventilator-induced lung injury");
  if (pip != null && plateu != null && pip - plateu > 10) cautions.push("PIP สูงกว่า plateau มาก คิดถึง airway resistance สูง เช่น secretion, bronchospasm, kinked tube");

  if (vt != null && ibw != null) {
    const vtPerKg = vt / ibw;
    if (vtPerKg > 8) cautions.push(`VT ประมาณ ${format1(vtPerKg)} mL/kg IBW ค่อนข้างสูง ควรทบทวน lung-protective strategy`);
    else if (vtPerKg < 4) cautions.push(`VT ประมาณ ${format1(vtPerKg)} mL/kg IBW ค่อนข้างต่ำ ต้องดู CO₂ clearance และ patient comfort`);
  }

  if (mode === "PSV") {
    items.push("ใน PSV ต้องประเมิน tidal volume ที่ได้จริง, RR จริง, work of breathing และ mental status ร่วมด้วย");
    items.push("หาก gas exchange แย่ลงหรือเหนื่อยมาก อาจต้องพิจารณากลับสู่ mode ที่ควบคุมได้มากขึ้นตามสถานการณ์");
  }

  return { items, cautions };
}

function waveformGuide({ ph, pco2, hco3, pao2, fio2, pip, plateu, mode }) {
  const items = [];

  if (mode) {
    const modeMap = {
      VCV: "VCV: เน้นดู peak pressure, plateau pressure, inspiratory flow และ flow กลับ baseline เพื่อแยก resistance vs compliance",
      PCV: "PCV: เน้นดู VT ที่ได้จริง, decelerating flow, และ VT เปลี่ยนหรือไม่เมื่อ mechanics เปลี่ยน",
      PSV: "PSV: เน้นดู patient effort, trigger, cycling, RR จริง และ work of breathing",
      SIMV: "SIMV: ต้องแยก mandatory breath ออกจาก spontaneous breath ก่อนแปลผล",
      PRVC: "PRVC: ดูทั้ง target VT และ pressure trend เพราะเครื่องจะปรับ pressure อัตโนมัติ",
    };
    items.push({
      title: `Mode-specific guide: ${mode}`,
      lookFor: [modeMap[mode]],
      meaning: ["เริ่มจาก waveform ที่เหมาะกับ mode นี้ก่อน แล้วจึงตีความร่วมกับ ABG และ clinical context"],
      action: "ใช้ข้อมูลจาก mode เป็นตัวกำหนดว่าควรดู pressure, flow, volume หรือ patient effort เป็นหลัก",
    });
  }

  if (pco2 != null && ph != null && pco2 > 45 && ph < 7.35) {
    items.push({
      title: "PaCO₂ สูงร่วมกับ acidemia",
      lookFor: [
        "ดู flow-time curve ว่า expiratory flow กลับ baseline หรือไม่",
        "ดู pressure scalar เปรียบเทียบ PIP กับ plateau",
        mode === "PCV" ? "ดู VT ที่ได้จริงว่าลดลงจากเดิมหรือไม่" : "ดู RR, VT และ expiratory time ปัจจุบัน",
      ],
      meaning: [
        "ถ้า expiratory flow ไม่กลับ baseline → คิดถึง auto-PEEP / air trapping",
        "ถ้า PIP สูงกว่า plateau มาก → คิดถึง airway resistance สูง",
        "ถ้า plateau สูง → คิดถึง compliance ต่ำ เช่น ARDS หรือปอดแข็ง",
      ],
      action: mode === "PSV"
        ? "พิจารณาว่าผู้ป่วยเหนื่อยหรือ assist ไม่พอ และทบทวน pressure support/trigger/cycling"
        : "พิจารณาลด air trapping, แก้ obstruction, suction, bronchodilator และทบทวน RR/VT/I:E ตามบริบท",
    });
  }

  if (pco2 != null && ph != null && pco2 < 35 && ph > 7.45) {
    items.push({
      title: "PaCO₂ ต่ำร่วมกับ alkalemia",
      lookFor: [
        "ดู RR ที่ตั้งและ RR ที่ได้จริง",
        "ดู VT ที่ได้จริงว่าเกินเป้าหมายหรือไม่",
        mode === "PSV" ? "ดู pressure support ว่าสูงเกินจน VT มากเกินหรือไม่" : "ดูว่าผู้ป่วย trigger เครื่องบ่อยหรือไม่",
      ],
      meaning: [
        "อาจมี hyperventilation จาก setting มากเกิน หรือ patient overbreathing",
        "ใน PSV อาจมี pressure support มากเกินหรือมี central drive สูง",
      ],
      action: "พิจารณาลด RR, VT หรือ pressure support ตาม mode และประเมิน pain, anxiety, fever, sepsis ร่วม",
    });
  }

  if (pao2 != null && fio2 != null && fio2 > 0 && (pao2 < 60 || pao2 / fio2 < 300)) {
    items.push({
      title: "Hypoxemia / oxygenation defect",
      lookFor: [
        "ดู plateau pressure หรือ lung mechanics",
        "ดูแนวโน้ม PEEP ที่ใช้และ response หลังปรับ PEEP/FiO₂",
        mode === "VCV" ? "ใน VCV ดู plateau pressure หลังปรับ PEEP เพื่อเฝ้าระวัง overdistension" : "ดู VT trend หลังปรับ pressure/PEEP",
      ],
      meaning: [
        "ถ้า plateau สูงหรือปอดแข็ง → compliance ต่ำ",
        "ถ้า oxygenation แย่เด่นแต่ ventilation พอได้ → problem อยู่ที่ oxygenation มากกว่า ventilation",
      ],
      action: "พิจารณาเพิ่ม PEEP แบบระมัดระวัง, recruitment strategy, positioning, suction และแก้สาเหตุของ shunt/VQ mismatch",
    });
  }

  if (hco3 != null && pco2 != null && hco3 < 22) {
    const winterLow = 1.5 * hco3 + 8 - 2;
    const winterHigh = 1.5 * hco3 + 8 + 2;
    if (pco2 > winterHigh) {
      items.push({
        title: "Metabolic acidosis แต่ PaCO₂ สูงเกิน expected",
        lookFor: [
          "ดู flow-time ว่ามี air trapping หรือไม่",
          "ดู minute ventilation ว่าพอหรือไม่",
          mode === "PSV" ? "คิดถึง muscle fatigue หรือ assist ไม่พอเป็นพิเศษ" : "ดู fatigue, dead space และ asynchrony",
        ],
        meaning: [`PaCO₂ จริงสูงกว่า Winter's expected (${rangeText(winterLow, winterHigh)} mmHg) → ventilation ไม่พอร่วมด้วย`],
        action: "ทบทวนการระบาย CO₂ และสาเหตุ mechanical/physiologic ที่ทำให้ compensation ไม่พอ",
      });
    }
  }

  if (pip != null && plateu != null) {
    if (pip - plateu > 10) {
      items.push({
        title: "PIP สูงกว่า plateau มาก",
        lookFor: [
          "ดู pressure scalar และค่า PIP-plateau difference",
          "ดู secretion, bronchospasm, kinked tube, ETT obstruction",
        ],
        meaning: ["เข้าได้กับ airway resistance สูงมากกว่าปัญหา compliance"],
        action: "พิจารณา suction, bronchodilator, ตรวจท่อและ circuit รวมทั้งประเมิน obstruction",
      });
    } else if (plateu > 30) {
      items.push({
        title: "Plateau pressure สูง",
        lookFor: [
          "ดู plateau pressure, VT/IBW, driving pressure หากมีข้อมูล",
          "ประเมิน compliance ต่ำหรือ overdistension",
        ],
        meaning: ["เสี่ยง ventilator-induced lung injury และสื่อถึงปอดแข็ง/pressure burden สูง"],
        action: "พิจารณา lung-protective strategy, ลด VT หากเหมาะสม และทบทวน PEEP/underlying lung mechanics",
      });
    }
  }

  if (items.length === 0) {
    items.push({
      title: "ยังไม่มี pattern เด่นจากข้อมูลที่กรอก",
      lookFor: [
        "ดู flow-time curve เป็นอันดับแรกเพื่อหา air trapping",
        "ดู pressure scalar เพื่อแยก resistance กับ compliance",
        "ดู RR/VT/PEEP/FiO₂ และภาพรวมผู้ป่วยร่วมกัน",
      ],
      meaning: ["ให้ใช้ waveform เป็นเครื่องมือยืนยันกลไกหลังจากอ่าน ABG แล้ว"],
      action: "ประเมินตามบริบทผู้ป่วยจริง ไม่ใช้ app นี้แทนการดูเครื่องและผู้ป่วย",
    });
  }

  return items;
}

function FormulaCard({ title, value, formula, substitution, result, reference, citation, accent = "slate" }) {
  const colors = {
    rose: "border-l-rose-500 bg-rose-50/40",
    amber: "border-l-amber-500 bg-amber-50/40",
    emerald: "border-l-emerald-500 bg-emerald-50/40",
    blue: "border-l-blue-500 bg-blue-50/40",
    violet: "border-l-violet-500 bg-violet-50/40",
    slate: "border-l-slate-300 bg-white",
  };
  return (
    <div className={`rounded-xl border border-l-4 ${colors[accent] || colors.slate} p-4 space-y-1.5 transition-all hover:shadow-md`}>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-400">สูตร: {formula}</div>
      <div className="text-[11px] text-slate-500">แทนค่า: {substitution}</div>
      <div className="text-[11px] text-slate-700 font-medium">ผลลัพธ์: {result}</div>
      <div className="text-[11px] text-slate-400">{reference}</div>
      {citation ? <div className="text-[10px] text-slate-300">อ้างอิง: {citation}</div> : null}
    </div>
  );
}

function WeaningCriteriaCard({ title, passed, reason }) {
  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${passed ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-sm">{title}</div>
        <Badge className={passed ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}>{passed ? "ผ่าน" : "ยังไม่ผ่าน"}</Badge>
      </div>
      <div className="mt-2 text-xs text-slate-600">{reason}</div>
    </div>
  );
}

function InlineTooltip({ label, content }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 align-middle transition-colors">
          <Info className="h-3.5 w-3.5" />
          <span className="text-xs underline decoration-dotted">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-5">
        <div>{content}</div>
      </TooltipContent>
    </Tooltip>
  );
}

function buildWeaningAssessment({ fio2, peep, spo2, pao2, ph, pco2, rr, vt, mode }) {
  const pf = pao2 != null && fio2 ? pao2 / fio2 : null;
  const vtLiters = vt != null ? vt / 1000 : null;
  const rsbi = rr != null && vtLiters ? rr / vtLiters : null;

  const oxygenationPassed = (fio2 != null && fio2 <= 0.5) && (peep != null && peep <= 8) && ((spo2 != null && spo2 >= 90) || (pf != null && pf >= 150));
  const ventilationPassed = (ph == null || ph >= 7.25) && (rr == null || rr < 35) && (pco2 == null || pco2 < 60);
  const rsbiPassed = rsbi == null ? false : rsbi < 105;

  const criteria = [
    {
      title: "Oxygenation readiness",
      passed: Boolean(oxygenationPassed),
      reason: `คาดหวัง FiO₂ ≤ 0.5, PEEP ≤ 8 และ SpO₂ ≥ 90% หรือ P/F ≥ 150; ปัจจุบัน FiO₂ ${format1(fio2)}, PEEP ${format1(peep)}, SpO₂ ${format1(spo2)}, P/F ${format1(pf)}`,
    },
    {
      title: "Ventilation readiness",
      passed: Boolean(ventilationPassed),
      reason: `คาดหวัง pH ≥ 7.25, RR < 35 และไม่มี severe hypercapnia; ปัจจุบัน pH ${format1(ph)}, RR ${format1(rr)}, PaCO₂ ${format1(pco2)}`,
    },
    {
      title: "RSBI support",
      passed: Boolean(rsbiPassed),
      reason: rsbi == null ? "ต้องกรอก RR และ VT เพื่อคำนวณ RSBI" : `RSBI = RR / VT(L) = ${format1(rsbi)}; โดยทั่วไป < 105 สนับสนุนโอกาส weaning สำเร็จ`,
    },
  ];

  let pathway = "ยังมีข้อมูลไม่พอสำหรับสรุป pathway";
  if (oxygenationPassed && ventilationPassed) {
    if (rsbiPassed) pathway = "พร้อมเข้าสู่ SBT ได้ หากผู้ป่วย clinically ready และปกป้อง airway ได้";
    else pathway = "พอเริ่ม SBT ได้ในบางกรณี แต่ RSBI ยังไม่สนับสนุน ควรประเมิน fatigue / secretion / strength เพิ่ม";
  } else {
    pathway = "ยังไม่ควร extubate ตอนนี้ ควรแก้ oxygenation/ventilation readiness ก่อน";
  }

  const sbtAdvice = [
    "SBT ที่ใช้บ่อย: PSV 5–7 cmH₂O + PEEP 5 cmH₂O หรือ T-piece ตามบริบท",
    "เฝ้าดู 30–120 นาที โดยดู RR, SpO₂, HR, BP, work of breathing, mental status",
    "Fail criteria ที่พบบ่อย: RR > 35, SpO₂ < 90%, tachycardia/unstable hemodynamics, distress, diaphoresis, accessory muscle use มาก",
  ];

  const extubationChecklist = [
    "ตื่นพอและปกป้อง airway ได้",
    "มี cough/clear secretion พอ",
    "secretion burden ไม่มากเกิน",
    "hemodynamic stable",
    mode === "PSV" ? "ถ้าอยู่ PSV อยู่แล้ว ให้ดูว่า support ต่ำพอและ patient comfort ดีจริง" : "ก่อน extubation ควรผ่าน SBT ใน mode ที่เหมาะสม",
  ];

  return { rsbi, pf, criteria, pathway, sbtAdvice, extubationChecklist };
}

export default function ABGVentInterpreterApp() {
  const [activeTab, setActiveTab] = useState("input");
  const [copied, setCopied] = useState(false);

  const [data, setData] = useState({
    ph: "",
    pco2: "",
    hco3: "",
    pao2: "",
    sao2: "",
    lactate: "",
    na: "",
    k: "",
    cl: "",
    albumin: "",
    fio2: "0.40",
    spo2: "",
    mode: "PCV",
    rr: "14",
    vt: "",
    peep: "5",
    pip: "",
    plateu: "",
    ps: "",
    pinsp: "",
    ibw: "",
    note: "",
  });

  const [weaning, setWeaning] = useState({
    awake: true,
    lowPressor: true,
    airwayProtect: true,
    secretionManageable: true,
    coughAdequate: true,
    primaryCauseImproving: true,
  });

  const parsed = useMemo(() => ({
    ph: num(data.ph),
    pco2: num(data.pco2),
    hco3: num(data.hco3),
    pao2: num(data.pao2),
    sao2: num(data.sao2),
    lactate: num(data.lactate),
    na: num(data.na),
    k: num(data.k),
    cl: num(data.cl),
    albumin: num(data.albumin),
    fio2: num(data.fio2),
    spo2: num(data.spo2),
    mode: data.mode,
    rr: num(data.rr),
    vt: num(data.vt),
    peep: num(data.peep),
    pip: num(data.pip),
    plateu: num(data.plateu),
    ps: num(data.ps),
    pinsp: num(data.pinsp),
    ibw: num(data.ibw),
  }), [data]);

  const abg = useMemo(() => abgInterpretation(parsed), [parsed]);
  const vent = useMemo(() => ventAdvice(parsed), [parsed]);
  const waveGuide = useMemo(() => waveformGuide(parsed), [parsed]);
  const weaningAssessment = useMemo(() => buildWeaningAssessment(parsed), [parsed]);

  const pfRatio = abg.calculations?.pfRatio;
  const aagrad = abg.calculations?.aAGradient;
  const deltaRatio = abg.calculations?.deltaRatio;
  const vtPerKg = parsed.vt && parsed.ibw ? parsed.vt / parsed.ibw : null;

  const clinicallyReady = Object.values(weaning).every(Boolean);
  const overallWeaningReady = clinicallyReady && weaningAssessment.criteria[0].passed && weaningAssessment.criteria[1].passed;
  const extubationSupportive = overallWeaningReady && weaningAssessment.criteria[2].passed;

  const setField = (key, value) => setData((d) => ({ ...d, [key]: value }));
  const setWeaningField = (key, value) => setWeaning((d) => ({ ...d, [key]: value }));

  const warningCount = [...abg.warnings, ...vent.cautions].length;

  const pfAccent = pfRatio == null ? "slate" : pfRatio < 200 ? "rose" : pfRatio < 300 ? "amber" : "emerald";
  const aaAccent = aagrad == null ? "slate" : aagrad > 20 ? "amber" : "emerald";
  const agAccent = abg.calculations?.ag == null ? "slate" : abg.calculations.ag > 12 ? "rose" : "emerald";
  const agCorrAccent = abg.calculations?.agCorrected == null ? "slate" : abg.calculations.agCorrected > 12 ? "rose" : "emerald";
  const deltaAccent = deltaRatio == null ? "slate" : (deltaRatio < 0.8 || deltaRatio > 2) ? "amber" : "emerald";
  const vtAccent = vtPerKg == null ? "slate" : vtPerKg > 8 ? "rose" : vtPerKg < 4 ? "amber" : "emerald";

  const summaryText = useMemo(() => {
    const lines = [];
    lines.push(`ABG summary: ${abg.primary}`);
    if (abg.details.length) lines.push(`Details: ${abg.details.join("; ")}`);
    if (pfRatio != null) lines.push(`P/F ratio = ${format1(pfRatio)}`);
    if (aagrad != null) lines.push(`A-a gradient = ${format1(aagrad)}`);
    if (abg.calculations?.ag != null) lines.push(`Anion gap = ${format1(abg.calculations.ag)}`);
    if (abg.calculations?.agCorrected != null) lines.push(`Corrected anion gap = ${format1(abg.calculations.agCorrected)}`);
    if (deltaRatio != null) lines.push(`Delta ratio = ${format1(deltaRatio)}`);
    if (vent.items.length) lines.push(`Ventilator suggestions: ${vent.items.join("; ")}`);
    if (waveGuide.length) lines.push(`Expected waveform review: ${waveGuide.map((x) => x.title).join("; ")}`);
    lines.push(`Weaning pathway: ${overallWeaningReady ? "พร้อมเข้าสู่ SBT" : "ยังไม่พร้อมเข้าสู่ SBT"}`);
    lines.push(`Extubation support: ${extubationSupportive ? "ข้อมูลสนับสนุนการพิจารณาถอดท่อ" : "ยังต้องประเมินต่อ"}`);
    if (vent.cautions.length) lines.push(`Cautions: ${vent.cautions.join("; ")}`);
    if (data.note.trim()) lines.push(`Clinical note: ${data.note.trim()}`);
    return lines.join("\n");
  }, [abg, vent, waveGuide, overallWeaningReady, extubationSupportive, pfRatio, aagrad, deltaRatio, data.note]);

  const formulaList = [
    abg.formulas?.pfRatio,
    abg.formulas?.aAGradient,
    abg.formulas?.ag,
    abg.formulas?.agCorrected,
    abg.formulas?.deltaRatio,
    abg.formulas?.winters,
    abg.formulas?.metAlkalosis,
    abg.formulas?.respAcidosis,
    abg.formulas?.respAlkalosis,
    abg.formulas?.alveolarO2,
  ].filter(Boolean);

  const referenceList = [
    { id: 1, title: "American Thoracic Society. Interpretation of Arterial Blood Gases (ABGs).", note: "ใช้เป็นฐานสำหรับหลักการแปล acid-base disorder และ expected compensation เบื้องต้น" },
    { id: 2, title: "Merck Manual Professional Edition. Acid-Base Regulation and Disorders.", note: "ใช้อ้างอิงกรอบคิดเรื่อง metabolic acidosis, anion gap, mixed disorder และการประเมิน compensation" },
    { id: 3, title: "Kraut JA, Madias NE. Serum anion gap: its uses and limitations in clinical medicine.", note: "ใช้อ้างอิงแนวคิด anion gap และ albumin correction" },
    { id: 4, title: "StatPearls. Physiology, Alveolar Gas Equation.", note: "ใช้อ้างอิง alveolar gas equation และหลักการ A–a gradient" },
    { id: 5, title: "The Acute Respiratory Distress Syndrome Network. Ventilation with Lower Tidal Volumes… N Engl J Med. 2000;342:1301–1308.", note: "ใช้อ้างอิงแนวคิด lung-protective ventilation, tidal volume ตาม predicted body weight และ plateau pressure threshold" },
    { id: 6, title: "MacIntyre NR, et al. Evidence-based guidelines for weaning and discontinuing ventilatory support.", note: "ใช้อ้างอิงแนวคิด readiness, SBT และ weaning pathway" },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "input", label: "กรอกข้อมูล", icon: Activity },
    { id: "interpret", label: "แปลผล ABG", icon: Calculator },
    { id: "ventilator", label: "Ventilator", icon: Wind },
    { id: "waveform", label: "Waveform", icon: Stethoscope },
    { id: "weaning", label: "Weaning", icon: CheckCircle2 },
    { id: "summary", label: "สรุป", icon: BookOpen },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-blue-50/30 to-slate-50">

        {/* ===== STICKY HEADER ===== */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center gap-3 py-3">
              <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 shadow-lg shadow-blue-200/50">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-900 truncate">ABG + Ventilator Interpreter</h1>
                <p className="text-xs text-slate-500 truncate">ช่วยแปลผล ABG, Ventilator, Waveform & Weaning</p>
              </div>
            </div>

            <nav className="flex gap-1 overflow-x-auto scrollbar-hide pb-0 -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-all border-b-2 ${
                      isActive
                        ? "text-blue-700 border-blue-600 bg-blue-50/60"
                        : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.id === "ventilator" && warningCount > 0 && (
                      <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{warningCount}</span>
                    )}
                    {tab.id === "weaning" && extubationSupportive && (
                      <span className="ml-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* ===== STATUS BAR ===== */}
        {parsed.ph != null && (
          <div className={`border-b text-sm px-4 py-2.5 ${
            abg.primary.startsWith("ACIDEMIA") ? "bg-rose-50 text-rose-800 border-rose-200" :
            abg.primary.startsWith("ALKALEMIA") ? "bg-violet-50 text-violet-800 border-violet-200" :
            "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}>
            <div className="mx-auto max-w-6xl flex items-center gap-2 font-medium">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                abg.primary.startsWith("ACIDEMIA") ? "bg-rose-500" :
                abg.primary.startsWith("ALKALEMIA") ? "bg-violet-500" :
                "bg-emerald-500"
              }`} />
              {abg.primary}
            </div>
          </div>
        )}

        {/* ===== MAIN CONTENT ===== */}
        <main className="mx-auto max-w-6xl px-4 py-6">

          {/* ==================== TAB: INPUT ==================== */}
          {activeTab === "input" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ABG Card */}
              <Card className="rounded-2xl shadow-sm overflow-hidden border-blue-200/60">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 py-4">
                  <CardTitle className="flex items-center gap-2 text-blue-800 text-base">
                    <div className="rounded-lg bg-blue-600 p-1.5"><Activity className="h-4 w-4 text-white" /></div>
                    ค่า ABG / เคมีพื้นฐาน
                  </CardTitle>
                  <p className="text-xs text-blue-600/70 mt-1">กรอกค่าจากผล lab เพื่อเริ่มแปลผล</p>
                </CardHeader>
                <CardContent className="pt-5 grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    ["ph", "pH", "7.35–7.45"],
                    ["pco2", "PaCO₂ (mmHg)", "35–45"],
                    ["hco3", "HCO₃⁻ (mEq/L)", "22–26"],
                    ["pao2", "PaO₂ (mmHg)", "80–100"],
                    ["sao2", "SaO₂ (%)", "95–100"],
                    ["lactate", "Lactate", "<2"],
                    ["na", "Na⁺", "135–145"],
                    ["k", "K⁺", "3.5–5.0"],
                    ["cl", "Cl⁻", "96–106"],
                    ["albumin", "Albumin (g/dL)", "3.5–5.0"],
                  ].map(([key, label, range]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">{label}</Label>
                      <Input
                        value={data[key]}
                        onChange={(e) => setField(key, e.target.value)}
                        placeholder={range}
                        className="border-blue-200/80 focus-visible:ring-blue-400 bg-blue-50/20 placeholder:text-blue-300"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Ventilator Card */}
              <Card className="rounded-2xl shadow-sm overflow-hidden border-teal-200/60">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100 py-4">
                  <CardTitle className="flex items-center gap-2 text-teal-800 text-base">
                    <div className="rounded-lg bg-teal-600 p-1.5"><Wind className="h-4 w-4 text-white" /></div>
                    Ventilator ปัจจุบัน
                  </CardTitle>
                  <p className="text-xs text-teal-600/70 mt-1">กรอก setting เครื่องช่วยหายใจ</p>
                </CardHeader>
                <CardContent className="pt-5 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-600">Mode</Label>
                    <Select value={data.mode} onValueChange={(v) => setField("mode", v)}>
                      <SelectTrigger className="border-teal-200/80 focus:ring-teal-400 bg-teal-50/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["VCV", "PCV", "PRVC", "SIMV", "PSV"].map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {[
                      ["fio2", "FiO₂ (0.21–1.0)"],
                      ["spo2", "SpO₂ (%)"],
                      ["rr", "Set RR (/min)"],
                      ["vt", "VT (mL)"],
                      ["peep", "PEEP (cmH₂O)"],
                      ["pip", "PIP (cmH₂O)"],
                      ["plateu", "Plateau (cmH₂O)"],
                      ["ps", "Pressure support"],
                      ["pinsp", "Inspiratory pressure"],
                      ["ibw", "IBW (kg)"],
                    ].map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs font-medium text-slate-600">{label}</Label>
                        <Input
                          value={data[key]}
                          onChange={(e) => setField(key, e.target.value)}
                          className="border-teal-200/80 focus-visible:ring-teal-400 bg-teal-50/20"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-600">Clinical note / context</Label>
                    <Textarea
                      value={data.note}
                      onChange={(e) => setField("note", e.target.value)}
                      className="min-h-20 border-teal-200/80 focus-visible:ring-teal-400 bg-teal-50/20"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== TAB: INTERPRET ==================== */}
          {activeTab === "interpret" && (
            <div className="space-y-6">
              {/* Primary interpretation */}
              <div className={`rounded-2xl p-5 border-2 ${
                abg.primary.startsWith("ACIDEMIA") ? "bg-rose-50 border-rose-300 text-rose-900" :
                abg.primary.startsWith("ALKALEMIA") ? "bg-violet-50 border-violet-300 text-violet-900" :
                parsed.ph != null ? "bg-emerald-50 border-emerald-300 text-emerald-900" :
                "bg-slate-50 border-slate-200 text-slate-700"
              }`}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-70 mb-2">
                  <Calculator className="h-4 w-4" /> Primary Interpretation
                </div>
                <div className="text-lg font-bold">{abg.primary}</div>
              </div>

              {/* Calculated values */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormulaCard title="P/F ratio" value={format1(pfRatio)} formula={abg.formulas?.pfRatio?.formula ?? "P/F ratio = PaO₂ / FiO₂"} substitution={abg.formulas?.pfRatio?.substitution ?? "-"} result={abg.formulas?.pfRatio?.result ?? "-"} reference={abg.formulas?.pfRatio?.reference ?? "ใช้ประเมิน oxygenation defect"} citation="[4], [5]" accent={pfAccent} />
                <FormulaCard title="A–a gradient" value={format1(aagrad)} formula={abg.formulas?.aAGradient?.formula ?? "A–a gradient = PAO₂ − PaO₂"} substitution={abg.formulas?.aAGradient?.substitution ?? "-"} result={abg.formulas?.aAGradient?.result ?? "-"} reference={abg.formulas?.aAGradient?.reference ?? "ใช้ดู V/Q mismatch หรือ shunt"} citation="[4]" accent={aaAccent} />
                <FormulaCard title="Anion gap" value={format1(abg.calculations?.ag)} formula={abg.formulas?.ag?.formula ?? "AG = Na⁺ − (Cl⁻ + HCO₃⁻)"} substitution={abg.formulas?.ag?.substitution ?? "-"} result={abg.formulas?.ag?.result ?? "-"} reference={abg.formulas?.ag?.reference ?? "ใช้แยกชนิด metabolic acidosis"} citation="[1], [2], [3]" accent={agAccent} />
                <FormulaCard title="Corrected AG" value={format1(abg.calculations?.agCorrected)} formula={abg.formulas?.agCorrected?.formula ?? "Corrected AG = AG + 2.5 × (4 − albumin)"} substitution={abg.formulas?.agCorrected?.substitution ?? "-"} result={abg.formulas?.agCorrected?.result ?? "-"} reference={abg.formulas?.agCorrected?.reference ?? "ใช้เมื่อ albumin ต่ำ"} citation="[2], [3]" accent={agCorrAccent} />
                <FormulaCard title="Delta ratio" value={format1(deltaRatio)} formula={abg.formulas?.deltaRatio?.formula ?? "Delta ratio = (Corrected AG − 12) / (24 − HCO₃⁻)"} substitution={abg.formulas?.deltaRatio?.substitution ?? "-"} result={abg.formulas?.deltaRatio?.result ?? "-"} reference={abg.formulas?.deltaRatio?.reference ?? "ช่วยหา mixed disorder"} citation="[1], [2]" accent={deltaAccent} />
                <FormulaCard title="VT/IBW" value={format1(vtPerKg)} formula="VT/IBW = Tidal volume (mL) / IBW (kg)" substitution={`= ${format1(parsed.vt)} / ${format1(parsed.ibw)}`} result={`VT/IBW = ${format1(vtPerKg)} mL/kg`} reference="ใช้ช่วยดู lung-protective ventilation" citation="[5]" accent={vtAccent} />
              </div>

              {/* ABG details */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-500" /> ABG Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-700">
                  {abg.details.length ? abg.details.map((x, i) => (
                    <div key={i} className="rounded-lg border-l-4 border-l-indigo-300 bg-indigo-50/30 p-3">• {x}</div>
                  )) : (
                    <div className="rounded-lg border p-3 text-slate-400">ยังไม่มีรายละเอียดเพิ่มเติม</div>
                  )}
                </CardContent>
              </Card>

              {/* Formulas used */}
              {formulaList.length > 0 && (
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-500" /> สูตรที่ใช้ในการคำนวณ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {formulaList.map((item, idx) => (
                        <div key={idx} className="rounded-xl border bg-slate-50/50 p-4 space-y-1.5">
                          <div className="font-semibold text-sm text-slate-800">{item.label}</div>
                          <div className="text-[11px] text-slate-400">สูตร: {item.formula}</div>
                          <div className="text-[11px] text-slate-500">แทนค่า: {item.substitution}</div>
                          <div className="text-[11px] text-slate-700 font-medium">ผลลัพธ์: {item.result}</div>
                          <div className="text-[11px] text-slate-400">{item.reference}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ==================== TAB: VENTILATOR ==================== */}
          {activeTab === "ventilator" && (
            <div className="space-y-6">
              {/* Suggestions */}
              <Card className="rounded-2xl shadow-sm border-teal-200/50">
                <CardHeader className="py-4 bg-teal-50/30">
                  <CardTitle className="flex items-center gap-2 text-base text-teal-900">
                    <Wind className="h-4 w-4 text-teal-600" /> ข้อเสนอแนะเรื่อง Ventilator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-700">
                  {vent.items.length ? vent.items.map((x, i) => (
                    <div key={i} className="rounded-lg border-l-4 border-l-teal-400 bg-teal-50/30 p-3">• {x}</div>
                  )) : (
                    <div className="rounded-lg border p-3 text-slate-400">กรอกข้อมูลเพิ่มเพื่อรับคำแนะนำ</div>
                  )}
                </CardContent>
              </Card>

              {/* Warnings */}
              <Card className="rounded-2xl shadow-sm border-amber-200/50">
                <CardHeader className="py-4 bg-amber-50/30">
                  <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> คำเตือนสำคัญ
                    {warningCount > 0 && <Badge className="bg-rose-500 text-white ml-2">{warningCount}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-700">
                  {[...abg.warnings, ...vent.cautions].length ? [...abg.warnings, ...vent.cautions].map((x, i) => (
                    <div key={i} className="rounded-lg border-l-4 border-l-amber-400 bg-amber-50/40 p-3">• {x}</div>
                  )) : (
                    <div className="rounded-lg border p-3 text-slate-400">ยังไม่มีคำเตือนเด่นจากข้อมูลที่กรอก</div>
                  )}
                  <div className="rounded-lg border-l-4 border-l-rose-400 bg-rose-50/40 p-3 text-xs text-rose-800">
                    เครื่องมือนี้เป็นตัวช่วยคิดเบื้องต้น ไม่ควรใช้แทน clinical judgment, bedside assessment, waveform review, imaging และการประเมินผู้ป่วยจริง
                  </div>
                </CardContent>
              </Card>

              {/* Initial settings guide */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="py-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Stethoscope className="h-4 w-4 text-slate-500" /> Initial Ventilator Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
                  <div className="rounded-xl border-l-4 border-l-blue-400 bg-blue-50/30 p-4 space-y-2">
                    <div className="font-bold text-blue-800">VCV</div>
                    <div>VT 6–8 mL/kg IBW (ARDS 4–6), RR 12–16/min, FiO₂ 0.4–1.0 แล้ว titrate, PEEP 5–10, I:E ประมาณ 1:2</div>
                  </div>
                  <div className="rounded-xl border-l-4 border-l-teal-400 bg-teal-50/30 p-4 space-y-2">
                    <div className="font-bold text-teal-800">PCV</div>
                    <div>ตั้ง inspiratory pressure ให้ได้ VT เป้าหมาย ~6–8 mL/kg IBW, RR 12–16/min, PEEP 5–10, inspiratory time 0.8–1.2 sec และติดตาม VT จริงทุกครั้ง</div>
                  </div>
                  <div className="rounded-xl border-l-4 border-l-violet-400 bg-violet-50/30 p-4 space-y-2">
                    <div className="font-bold text-violet-800">PSV</div>
                    <div>PS 5–15 cmH₂O, target VT ~5–8 mL/kg, PEEP 5 หรือมากกว่าตาม oxygenation และใช้ได้ดีใน phase weaning</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==================== TAB: WAVEFORM ==================== */}
          {activeTab === "waveform" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-cyan-50 border border-cyan-200 p-4 text-sm text-cyan-900">
                <div className="font-semibold flex items-center gap-2 mb-1">
                  <Stethoscope className="h-4 w-4 text-cyan-600" /> ควรไปดู graph อะไรต่อ (Expected Waveform Review)
                </div>
                <div className="text-xs text-cyan-700">คำแนะนำจะปรับตาม ABG, vent mode และค่าที่กรอก</div>
              </div>
              {waveGuide.map((item, idx) => (
                <Card key={idx} className="rounded-2xl shadow-sm overflow-hidden">
                  <CardHeader className="py-3 bg-slate-50 border-b">
                    <CardTitle className="text-sm text-slate-800">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-sm">
                    <div>
                      <div className="text-xs font-semibold text-cyan-700 uppercase tracking-wider mb-1">ควรดู</div>
                      <div className="space-y-1 text-slate-700">{item.lookFor.map((x, i) => <div key={i} className="rounded-lg bg-cyan-50/50 border border-cyan-100 p-2.5 text-xs">• {x}</div>)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">ตีความได้ว่า</div>
                      <div className="space-y-1 text-slate-700">{item.meaning.map((x, i) => <div key={i} className="rounded-lg bg-indigo-50/50 border border-indigo-100 p-2.5 text-xs">• {x}</div>)}</div>
                    </div>
                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800">
                      <span className="font-semibold">แนวทางถัดไป:</span> {item.action}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ==================== TAB: WEANING ==================== */}
          {activeTab === "weaning" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900">
                <div className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Interactive Weaning / Extubation Pathway
                </div>
                <div className="text-xs text-emerald-700 mt-1">ใช้เป็น clinical pathway สำหรับคัดกรองว่าควรเริ่ม SBT หรือยัง</div>
                <div className="flex flex-wrap gap-3 mt-3">
                  <InlineTooltip label="SBT คืออะไร" content="SBT หรือ Spontaneous Breathing Trial คือการทดลองให้ผู้ป่วยหายใจเองด้วยการช่วยจากเครื่องในระดับต่ำชั่วคราว เช่น PSV 5–7 ร่วมกับ PEEP 5 หรือ T-piece เพื่อดูว่าผู้ป่วยทนการหายใจเองได้หรือไม่ก่อนพิจารณาถอดท่อ" />
                  <InlineTooltip label="RSBI คืออะไร" content="RSBI หรือ Rapid Shallow Breathing Index คำนวณจาก RR / VT(ลิตร) ใช้เป็นตัวช่วยทำนายโอกาส weaning สำเร็จ โดยทั่วไปค่า < 105 สนับสนุนความเป็นไปได้ที่จะหย่าเครื่องได้สำเร็จ แต่ไม่ใช้แทน clinical judgment" />
                </div>
              </div>

              {/* Clinical readiness */}
              <div>
                <div className="text-sm font-semibold text-slate-700 mb-3">Clinical Readiness Checklist</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ["awake", "Awake / cooperative"],
                    ["lowPressor", "Hemodynamic stable / no-high vasopressor"],
                    ["airwayProtect", "Protect airway ได้"],
                    ["secretionManageable", "Secretion manageable"],
                    ["coughAdequate", "Cough adequate"],
                    ["primaryCauseImproving", "Primary cause improving"],
                  ].map(([key, label]) => (
                    <div key={key} className={`rounded-xl border-2 p-3 space-y-2 transition-all ${weaning[key] ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}`}>
                      <Label className="text-xs font-medium text-slate-700">{label}</Label>
                      <Select value={weaning[key] ? "yes" : "no"} onValueChange={(v) => setWeaningField(key, v === "yes")}>
                        <SelectTrigger className={`text-xs h-8 ${weaning[key] ? "border-emerald-300" : "border-amber-300"}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Criteria cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {weaningAssessment.criteria.map((item, idx) => <WeaningCriteriaCard key={idx} {...item} />)}
              </div>

              {/* SBT readiness */}
              <div className={`rounded-2xl border-2 p-5 ${overallWeaningReady ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300"}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  Step 1: SBT readiness
                  <InlineTooltip label="อธิบาย" content="ประเมินว่าผู้ป่วยพร้อมเข้าสู่การทดลองหายใจเองหรือยัง โดยดู clinical readiness ร่วมกับ oxygenation และ ventilation readiness ก่อนเริ่ม SBT" />
                </div>
                <div className="mt-2 text-sm">{clinicallyReady ? "Clinical readiness ผ่าน" : "Clinical readiness ยังไม่ผ่าน"}</div>
                <div className="mt-1 text-sm font-medium">{weaningAssessment.pathway}</div>
              </div>

              {/* Extubation support */}
              <div className={`rounded-2xl border-2 p-5 ${extubationSupportive ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  Step 2: หลังผ่าน SBT ให้ดู extubation support
                  <InlineTooltip label="อธิบาย" content="แม้ผ่าน SBT แล้ว ยังต้องประเมินต่อว่าสามารถถอดท่อได้อย่างปลอดภัยหรือไม่ โดยดู airway protection, cough, secretion burden, mental status และดัชนีสนับสนุน เช่น RSBI" />
                </div>
                <div className="mt-2 text-sm flex items-center gap-2">
                  RSBI = {format1(weaningAssessment.rsbi)}
                  <InlineTooltip label="สูตร" content="RSBI = RR / VT(ลิตร) เช่น RR 30 ครั้ง/นาที และ VT 0.3 ลิตร จะได้ RSBI = 100 โดยทั่วไปค่า < 105 สนับสนุนโอกาส weaning สำเร็จ" />
                </div>
                <div className="mt-1 text-sm">{extubationSupportive ? "ข้อมูลปัจจุบันสนับสนุนการพิจารณาถอดท่อ หาก airway protection/cough/secretion เหมาะสม" : "ยังควรประเมินเพิ่มก่อนตัดสินใจ extubate"}</div>
              </div>

              {/* SBT guide + Extubation checklist */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      SBT practical guide
                      <InlineTooltip label="หลักการ" content="SBT มักทำ 30–120 นาที โดยใช้การช่วยต่ำ เช่น PSV 5–7 กับ PEEP 5 หรือ T-piece แล้วดูว่าผู้ป่วยทนได้หรือไม่ หากมี tachypnea, desaturation, hemodynamic instability หรือ distress ให้ถือว่าล้มเหลว" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-700">
                    {weaningAssessment.sbtAdvice.map((x, i) => <div key={i} className="text-xs">• {x}</div>)}
                  </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      Extubation checklist
                      <InlineTooltip label="หลักการ" content="การถอดท่อไม่ดูแค่ผ่าน SBT ต้องมี airway protection, cough ดี, secretion ไม่มาก, mental status พอ, และบริบททางคลินิกเอื้อด้วย จึงจะลดโอกาส reintubation" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-700">
                    {weaningAssessment.extubationChecklist.map((x, i) => <div key={i} className="text-xs">• {x}</div>)}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ==================== TAB: SUMMARY ==================== */}
          {activeTab === "summary" && (
            <div className="space-y-6">
              {/* Copyable summary */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-500" /> สรุปพร้อมคัดลอก
                    </CardTitle>
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        copied
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                          : "bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200"
                      }`}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea value={summaryText} readOnly className="min-h-40 bg-slate-50 text-sm" />
                </CardContent>
              </Card>

              {/* References */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-500" /> References / เอกสารอ้างอิง
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl bg-slate-50 border p-3 text-xs text-slate-500">
                    รายการอ้างอิงด้านล่างใช้เป็นฐานของสูตรและกรอบการตีความในโปรแกรมนี้ รวมทั้งส่วน weaning pathway
                  </div>
                  {referenceList.map((ref) => (
                    <div key={ref.id} className="rounded-xl border bg-white p-4 space-y-1">
                      <div className="font-semibold text-sm text-slate-800">[{ref.id}] {ref.title}</div>
                      <div className="text-xs text-slate-500">{ref.note}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {/* ===== FOOTER ===== */}
        <footer className="border-t border-slate-200 mt-8 py-5 px-4 bg-white/50">
          <div className="mx-auto max-w-6xl text-center text-xs text-slate-400">
            เครื่องมือนี้เป็นตัวช่วยคิดเบื้องต้น ไม่ควรใช้แทน clinical judgment, bedside assessment และการประเมินผู้ป่วยจริง
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
