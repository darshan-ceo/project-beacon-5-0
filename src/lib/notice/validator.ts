// src/lib/notice/validator.ts
export type Extraction = any; // ASMT-10 schema object
export type ValidationError = { path: string; message: string; critical?: boolean };

const GSTIN_RE = /^[0-9]{2}[A-Z0-9]{10}[1-9A-Z]Z[0-9A-Z]$/i;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const INR_CLEAN = (v: any) => (typeof v === "string" ? v.replace(/[, \u00A0]/g, "").trim() : v);
const toNumber = (v: any) => (v === null || v === undefined || v === "" ? null : Number(INR_CLEAN(v)));
const enums = {
  response_mode: new Set(["GST Portal", "Email", "Physical"]),
  tax_head: new Set(["CGST", "SGST", "IGST", "Cess", "Mixed", "NA"]),
};

function normDate(input: any): string | null {
  if (!input) return null;
  const s = String(input).trim();
  const m1 = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/); // DD/MM/YYYY or DD-MM-YYYY
  if (m1) {
    const [_, d, m, y] = m1;
    return `${y}-${m}-${d}`;
  }
  const m2 = s.match(DATE_RE);
  return m2 ? s : null; // already YYYY-MM-DD
}

export function validateExtraction(raw: Extraction) {
  const x = structuredClone(raw ?? {});
  const errors: ValidationError[] = [];
  const crit = (path: string, msg: string) => errors.push({ path, message: msg, critical: true });
  const err  = (path: string, msg: string) => errors.push({ path, message: msg });

  // Normalize scalars
  x.issue_date = normDate(x.issue_date);

  x.action = x.action ?? {};
  x.action.response_due_date = normDate(x.action.response_due_date);
  if (x.action.response_mode && !enums.response_mode.has(x.action.response_mode)) {
    err("/action/response_mode", "Invalid response mode");
  }

  // taxpayer
  x.taxpayer = x.taxpayer ?? {};
  if (!GSTIN_RE.test(x.taxpayer.gstin ?? "")) crit("/taxpayer/gstin", "Invalid or missing GSTIN");
  x.taxpayer.gstin = (x.taxpayer.gstin ?? "").toUpperCase();

  // notice refs
  const hasNoticeNo = !!(x.notice_no && String(x.notice_no).trim());
  const hasDIN = !!(x.din && String(x.din).trim());
  if (!hasNoticeNo && !hasDIN) crit("/notice_no", "Notice number or DIN is required");
  if (!x.issue_date) crit("/issue_date", "Issue date is required (YYYY-MM-DD)");

  // periods
  const periods = Array.isArray(x.periods) ? x.periods : [];
  if (periods.length === 0 || !periods[0]?.period_label) {
    crit("/periods/0/period_label", "At least one tax period is required");
  } else {
    x.periods = periods.map((p: any) => ({
      ...p,
      from_date: normDate(p.from_date),
      to_date: normDate(p.to_date),
    }));
  }

  // discrepancy summary numbers
  x.discrepancy_summary = x.discrepancy_summary ?? {};
  const sum = x.discrepancy_summary;
  ["cgst_diff","sgst_diff","igst_diff","cess_diff","interest_proposed","penalty_proposed","total_amount_proposed"]
    .forEach(k => (sum[k] = toNumber(sum[k])));

  // line items
  x.discrepancies = Array.isArray(x.discrepancies) ? x.discrepancies.map((d: any) => {
    const y = { ...d };
    if (y.tax_head && !enums.tax_head.has(y.tax_head)) {
      err(`/discrepancies/${d.sr_no ?? "?"}/tax_head`, "Invalid tax head");
    }
    ["declared_value","derived_value","difference_value","rate","tax_difference"].forEach(k => y[k] = toNumber(y[k]));
    return y;
  }) : [];

  // critical: amount or any numeric line
  const hasTotal = Number(sum.total_amount_proposed) > 0;
  const hasLine = x.discrepancies.some((d: any) =>
    [d.difference_value, d.tax_difference, d.declared_value, d.derived_value]
      .some((n: any) => typeof n === "number" && !Number.isNaN(n))
  );
  if (!hasTotal && !hasLine) crit("/discrepancies", "Proposed amount or at least one discrepancy value is required");

  // convenient requireds
  const req = (path: string, v: any, label: string, c = false) =>
    (!v || !String(v).trim()) && (c ? crit : err)(path, `${label} is required`);
  req("/notice_title", x.notice_title, "Notice title");
  req("/legal/section", x.legal?.section, "Section");
  req("/issuing_authority_office", x.issuing_authority_office, "Issuing authority office");
  if (!x.action?.response_due_date) crit("/action/response_due_date", "Response due date is required");

  return { ok: errors.every(e => !e.critical), errors, normalized: x };
}