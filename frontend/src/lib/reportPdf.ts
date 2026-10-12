/**
 * NurtureHer Clinical Report PDF & CSV Generator
 * Renders clinic-ready, beautifully styled printable healthcare reports
 * with full patient metadata, screening parameters, contributing factors,
 * explainability notes, and required medical safety disclaimers.
 */

export interface ReportExportData {
  reportTitle: string;
  reportType: "PCOS Screening" | "PPD Screening" | "Doctor Visit Summary" | "Wellness Summary";
  patientName: string;
  patientAge?: number | null;
  patientEmail?: string;
  patientPhone?: string | null;
  pregnancyStage?: string | null;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  dateGenerated: string;
  primaryMetric: {
    label: string;
    value: string;
    riskCategory: "LOW" | "MODERATE" | "HIGH" | string;
  };
  contributingFactors: { label: string; value: string; note?: string }[];
  clinicalRecommendations: string[];
  doctorQuestions?: string[];
  suggestedRecords?: string[];
}

export function printOrSaveClinicalReport(data: ReportExportData) {
  const printWindow = window.open("", "_blank", "width=850,height=1000");
  if (!printWindow) {
    alert("Please allow popups to download or print your clinical report.");
    return;
  }

  const riskBadgeColor =
    data.primaryMetric.riskCategory.toUpperCase() === "HIGH"
      ? "#DC2626"
      : data.primaryMetric.riskCategory.toUpperCase() === "MODERATE"
      ? "#D97706"
      : "#0D9488";

  const riskBadgeBg =
    data.primaryMetric.riskCategory.toUpperCase() === "HIGH"
      ? "#FEE2E2"
      : data.primaryMetric.riskCategory.toUpperCase() === "MODERATE"
      ? "#FEF3C7"
      : "#CCFBF1";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${data.reportTitle} - NurtureHer AI</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1E1B4B;
      background: #FFFFFF;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #EDE9FE;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-circle {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #7C3AED, #A78BFA);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
    }
    .logo-title {
      font-size: 22px;
      font-weight: 900;
      color: #1E1B4B;
      margin: 0;
    }
    .logo-sub {
      font-size: 11px;
      color: #64748B;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .meta-box {
      text-align: right;
      font-size: 12px;
      color: #64748B;
    }
    .meta-box strong {
      color: #1E1B4B;
    }
    .patient-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #F8F7FF;
      border: 1px solid #EDE9FE;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .patient-grid div {
      font-size: 12px;
    }
    .patient-grid strong {
      display: block;
      color: #64748B;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }
    .metric-card {
      background: #FFFFFF;
      border: 1px solid #EDE9FE;
      border-left: 5px solid ${riskBadgeColor};
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-val {
      font-size: 28px;
      font-weight: 900;
      color: #1E1B4B;
    }
    .risk-badge {
      background: ${riskBadgeBg};
      color: ${riskBadgeColor};
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      text-transform: uppercase;
    }
    h2 {
      font-size: 15px;
      font-weight: 800;
      color: #1E1B4B;
      border-bottom: 1px solid #EDE9FE;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #EDE9FE;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #F8F7FF;
      font-weight: 700;
      color: #475569;
    }
    ul {
      margin: 0;
      padding-left: 20px;
      font-size: 12px;
      color: #334155;
    }
    li {
      margin-bottom: 6px;
    }
    .disclaimer {
      margin-top: 32px;
      border: 1px dashed #F59E0B;
      background: #FFFBEB;
      border-radius: 10px;
      padding: 14px;
      font-size: 10.5px;
      color: #78350F;
      line-height: 1.5;
    }
    .disclaimer strong {
      color: #B45309;
      display: block;
      margin-bottom: 4px;
    }
    .print-button {
      background: #7C3AED;
      color: white;
      border: none;
      padding: 10px 20px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 20px;
    }
    @media print {
      .print-button { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">Print / Save as PDF</button>

  <div class="header">
    <div class="logo-container">
      <div class="logo-circle">💜</div>
      <div>
        <h1 class="logo-title">NurtureHer AI</h1>
        <p class="logo-sub">Women's Health & Maternal AI Screening Platform</p>
      </div>
    </div>
    <div class="meta-box">
      <div><strong>Report:</strong> ${data.reportTitle}</div>
      <div><strong>Date:</strong> ${data.dateGenerated}</div>
      <div><strong>Classification:</strong> Preliminary Clinical Screening</div>
    </div>
  </div>

  <div class="patient-grid">
    <div>
      <strong>Patient Name</strong>
      ${data.patientName || "N/A"}
    </div>
    <div>
      <strong>Age</strong>
      ${data.patientAge ? `${data.patientAge} years` : "Not provided"}
    </div>
    <div>
      <strong>Status</strong>
      ${data.pregnancyStage || "General Wellness"}
    </div>
    <div>
      <strong>Emergency SOS</strong>
      ${data.emergencyContact || "National SOS: 112"}
    </div>
  </div>

  <div class="metric-card">
    <div>
      <div style="font-size: 12px; color: #64748B; font-weight: 700;">${data.primaryMetric.label}</div>
      <div class="metric-val">${data.primaryMetric.value}</div>
    </div>
    <div>
      <span class="risk-badge">${data.primaryMetric.riskCategory.toUpperCase()} RISK</span>
    </div>
  </div>

  ${
    data.contributingFactors && data.contributingFactors.length > 0
      ? `
  <h2>Contributing Risk Factors & Indicators</h2>
  <table>
    <thead>
      <tr>
        <th>Clinical Indicator</th>
        <th>Recorded Finding</th>
        <th>Clinical Context</th>
      </tr>
    </thead>
    <tbody>
      ${data.contributingFactors
        .map(
          (f) => `
        <tr>
          <td><strong>${f.label}</strong></td>
          <td>${f.value}</td>
          <td style="color: #64748B;">${f.note || "Standard evaluation threshold"}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>
  `
      : ""
  }

  <h2>Clinical Guidance & Recommended Next Steps</h2>
  <ul>
    ${data.clinicalRecommendations.map((r) => `<li>${r}</li>`).join("")}
  </ul>

  ${
    data.doctorQuestions && data.doctorQuestions.length > 0
      ? `
  <h2>Key Questions to Ask Your Doctor</h2>
  <ul>
    ${data.doctorQuestions.map((q) => `<li>${q}</li>`).join("")}
  </ul>
  `
      : ""
  }

  ${
    data.suggestedRecords && data.suggestedRecords.length > 0
      ? `
  <h2>Recommended Records to Bring to Appointment</h2>
  <ul>
    ${data.suggestedRecords.map((s) => `<li>${s}</li>`).join("")}
  </ul>
  `
      : ""
  }

  <div class="disclaimer">
    <strong>⚠️ Medical Disclaimer & Clinical Safety Notice</strong>
    NurtureHer AI provides risk indication, early screening support, and structured educational summaries based on clinical risk frameworks. It does NOT provide a medical diagnosis, prescription, or clinical treatment. Always consult a qualified healthcare professional, ASHA worker, obstetrician, or doctor for clinical confirmation and care. In case of acute pain, heavy bleeding, breathing distress, or crisis thoughts, immediately dial emergency services (112) or visit the nearest hospital.
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export interface PrintableReportWindowOptions {
  patientName: string;
  patientAge?: number | null;
  pregnancyStage?: string | null;
  emergencyContact?: string | null;
  reports: Array<{
    title: string;
    type: string;
    date: string;
    risk_level: string;
    score: string;
    recommendations?: string;
    sentiment?: string;
  }>;
  disclaimer?: string;
}

export function generatePrintableReportWindow(options: PrintableReportWindowOptions) {
  const printWindow = window.open("", "_blank", "width=850,height=1000");
  if (!printWindow) {
    alert("Please allow popups to print your clinical report.");
    return;
  }

  const reportsHtml = options.reports
    .map((r) => {
      const isHigh = r.risk_level.toLowerCase().includes("high");
      const isMod = r.risk_level.toLowerCase().includes("mod");
      const badgeBg = isHigh ? "#FEE2E2" : isMod ? "#FEF3C7" : "#CCFBF1";
      const badgeColor = isHigh ? "#DC2626" : isMod ? "#D97706" : "#0D9488";

      return `
      <div style="border: 1px solid #EDE9FE; border-left: 4px solid ${badgeColor}; border-radius: 12px; padding: 16px; margin-bottom: 16px; background: #FFFFFF;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h3 style="margin: 0; font-size: 15px; color: #1E1B4B; font-weight: 800;">${r.title}</h3>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Type: ${r.type} · Evaluated: ${r.date}</div>
          </div>
          <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
            ${r.risk_level}
          </span>
        </div>
        <div style="margin-top: 10px; font-size: 13px; font-weight: bold; color: #1E1B4B;">${r.score}</div>
        ${r.recommendations ? `<p style="margin-top: 8px; font-size: 12px; color: #475569; line-height: 1.5;">${r.recommendations}</p>` : ""}
        ${r.sentiment ? `<div style="margin-top: 6px; font-size: 11px; color: #64748B;"><strong>Sentiment Analysis:</strong> ${r.sentiment}</div>` : ""}
      </div>
    `;
    })
    .join("");

  const defaultDisclaimer =
    "NON-DIAGNOSTIC NOTICE: NurtureHer AI synthesizes clinical risk assessments and self-reported biomarkers to support clinical consultations. It does not replace pathology, clinical diagnosis, or obstetric ultrasound.";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Clinical Health Summary - ${options.patientName}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1E1B4B; padding: 24px; margin: 0; }
    .btn { background: #7C3AED; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer; margin-bottom: 20px; }
    @media print { .btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="btn" onclick="window.print()">Print / Save PDF</button>

  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #EDE9FE; padding-bottom: 16px; margin-bottom: 20px;">
    <div>
      <h1 style="margin: 0; font-size: 22px; color: #1E1B4B; font-weight: 900;">NurtureHer AI</h1>
      <p style="margin: 0; font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">Clinical Decision Support Portal</p>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748B;">
      <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
      <div><strong>Generated via:</strong> NurtureHer Telemetry Suite</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #F8F7FF; border: 1px solid #EDE9FE; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 12px;">
    <div><span style="font-size: 10px; text-transform: uppercase; color: #64748B; display: block;">Patient Name</span><strong>${options.patientName}</strong></div>
    <div><span style="font-size: 10px; text-transform: uppercase; color: #64748B; display: block;">Age</span><strong>${options.patientAge ? `${options.patientAge} years` : "Unspecified"}</strong></div>
    <div><span style="font-size: 10px; text-transform: uppercase; color: #64748B; display: block;">Status</span><strong>${options.pregnancyStage || "General Care"}</strong></div>
    <div><span style="font-size: 10px; text-transform: uppercase; color: #64748B; display: block;">Emergency Contact</span><strong>${options.emergencyContact || "112"}</strong></div>
  </div>

  <h2 style="font-size: 15px; font-weight: 800; border-bottom: 1px solid #EDE9FE; padding-bottom: 6px; margin-bottom: 14px;">Evaluated Clinical Screenings & Reports (${options.reports.length})</h2>

  ${reportsHtml}

  <div style="margin-top: 24px; border: 1px dashed #F59E0B; background: #FFFBEB; border-radius: 10px; padding: 12px; font-size: 11px; color: #78350F; line-height: 1.4;">
    <strong>⚠️ Medical Disclaimer & Safety Protocol:</strong>
    ${options.disclaimer || defaultDisclaimer}
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function exportReportsToCsv(reports: Array<Record<string, unknown>>) {
  if (!reports.length) return;
  const headers = ["Title", "Type", "Risk Level", "Score", "Date", "Status", "Recommendations"];
  const rows = reports.map((r) => [
    `"${String(r.title ?? "").replace(/"/g, '""')}"`,
    `"${String(r.type ?? "").replace(/"/g, '""')}"`,
    `"${String(r.risk_level ?? "").replace(/"/g, '""')}"`,
    `"${String(r.score ?? "").replace(/"/g, '""')}"`,
    `"${String(r.date ?? "").replace(/"/g, '""')}"`,
    `"${String(r.status ?? "").replace(/"/g, '""')}"`,
    `"${String(r.recommendations ?? "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `NurtureHer_Health_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
