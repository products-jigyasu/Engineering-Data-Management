// ─── Email template builder for Jigyasu workflow notifications ───
// Called server-side by /api/email/send

export type EmailType =
  | 'ft_assigned'
  | 'ft_result_submitted'
  | 'solution_assigned'
  | 'handover_ready'
  | 'handover_accepted'
  | 'handover_rejected'
  | 'design_submitted'
  | 'design_approved'
  | 'design_rejected'
  | 'files_uploaded'
  | 'experiment_completed'
  | 'reassigned'
  | 'on_hold';

export interface EmailData {
  recipientName: string;
  experimentName: string;
  grade?: string;
  assignedBy?: string;
  assigneeName?: string;
  result?: string;
  remarks?: string;
  reason?: string;
  stageName?: string;
  dashboardUrl?: string;
}

// ─── Subject line per email type ─────────────────────────────────

const SUBJECTS: Record<EmailType, (d: EmailData) => string> = {
  ft_assigned: (d) => `📋 Functional Testing Assigned: ${d.experimentName}`,
  ft_result_submitted: (d) => `✅ FT Result Submitted: ${d.experimentName}`,
  solution_assigned: (d) => `🔧 Solution Assignment: ${d.experimentName}`,
  handover_ready: (d) => `📦 Handover Ready for Acceptance: ${d.experimentName}`,
  handover_accepted: (d) => `✓ Handover Accepted: ${d.experimentName}`,
  handover_rejected: (d) => `✗ Handover Rejected: ${d.experimentName}`,
  design_submitted: (d) => `🎨 Design Ready for Approval: ${d.experimentName}`,
  design_approved: (d) => `✅ Design Approved: ${d.experimentName}`,
  design_rejected: (d) => `❌ Design Rejected: ${d.experimentName}`,
  files_uploaded: (d) => `📁 Files Ready for Procurement: ${d.experimentName}`,
  experiment_completed: (d) => `🎉 Experiment Completed: ${d.experimentName}`,
  reassigned: (d) => `🔄 Experiment Reassigned: ${d.experimentName}`,
  on_hold: (d) => `⏸️ Experiment On Hold: ${d.experimentName}`,
};

// ─── Body content per email type ─────────────────────────────────

const BODY_CONTENT: Record<EmailType, (d: EmailData) => string> = {
  ft_assigned: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>You have been assigned <strong>Functional Testing</strong> for the following experiment:</p>
    ${experimentCard(d)}
    ${d.assignedBy ? `<p style="color:#6b7280;font-size:13px;">Assigned by: <strong>${d.assignedBy}</strong></p>` : ''}
    <p>Please log in to the dashboard to begin testing and record your results.</p>
  `,
  ft_result_submitted: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>Functional Testing results have been submitted for:</p>
    ${experimentCard(d)}
    ${d.result ? `<p>Result: <strong style="color:${d.result === 'Okay' ? '#16a34a' : '#dc2626'}">${d.result}</strong></p>` : ''}
    ${d.remarks ? `<p style="color:#6b7280;font-size:13px;">Remarks: ${d.remarks}</p>` : ''}
    <p>Please assign a Solution team member for this experiment.</p>
  `,
  solution_assigned: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>You have been assigned <strong>Solution</strong> for:</p>
    ${experimentCard(d)}
    ${d.result ? `<p>FT Result: <strong style="color:${d.result === 'Okay' ? '#16a34a' : '#dc2626'}">${d.result}</strong></p>` : ''}
    ${d.assignedBy ? `<p style="color:#6b7280;font-size:13px;">Assigned by: <strong>${d.assignedBy}</strong></p>` : ''}
    <p>Please review the FT findings and begin working on the solution.</p>
  `,
  handover_ready: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>A solution handover is ready for your review:</p>
    ${experimentCard(d)}
    <p>The solution team has completed their work and submitted all handover items (physical model, engineering data, and KT).</p>
    <p>Please log in to <strong>accept or reject</strong> the handover.</p>
  `,
  handover_accepted: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>Your handover for the following experiment has been <strong style="color:#16a34a;">accepted</strong> by the Design team:</p>
    ${experimentCard(d)}
    <p>The experiment has moved to <strong>Design In Progress</strong>.</p>
  `,
  handover_rejected: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>Your handover for the following experiment has been <strong style="color:#dc2626;">rejected</strong>:</p>
    ${experimentCard(d)}
    ${d.remarks ? `<p><strong>Rejection Reason:</strong> ${d.remarks}</p>` : ''}
    <p>Please review the feedback and re-submit the handover.</p>
  `,
  design_submitted: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>A design has been submitted for your approval:</p>
    ${experimentCard(d)}
    ${d.assigneeName ? `<p style="color:#6b7280;font-size:13px;">Submitted by: <strong>${d.assigneeName}</strong></p>` : ''}
    <p>Please log in to <strong>approve or reject</strong> the design.</p>
  `,
  design_approved: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>Your design for the following experiment has been <strong style="color:#16a34a;">approved</strong>!</p>
    ${experimentCard(d)}
    ${d.remarks ? `<p style="color:#6b7280;font-size:13px;">Comments: ${d.remarks}</p>` : ''}
    <p>Please proceed to <strong>File Upload</strong>.</p>
  `,
  design_rejected: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>Your design for the following experiment has been <strong style="color:#dc2626;">rejected</strong>:</p>
    ${experimentCard(d)}
    ${d.remarks ? `<p><strong>Rejection Reason:</strong> ${d.remarks}</p>` : ''}
    <p>Please review the feedback and re-submit your design.</p>
  `,
  files_uploaded: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>Files have been uploaded and are ready for procurement review:</p>
    ${experimentCard(d)}
    <p>Please log in to verify the procurement data.</p>
  `,
  experiment_completed: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>The following experiment has <strong style="color:#16a34a;">completed the full workflow</strong>! 🎉</p>
    ${experimentCard(d)}
    <p>All stages — from Functional Testing to Procurement — have been successfully completed.</p>
  `,
  reassigned: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>The following experiment has been <strong style="color:#f59e0b;">reassigned back to Functional Testing</strong>:</p>
    ${experimentCard(d)}
    ${d.reason ? `<p><strong>Reason:</strong> ${d.reason}</p>` : ''}
    ${d.assigneeName ? `<p style="color:#6b7280;font-size:13px;">New Tester: <strong>${d.assigneeName}</strong></p>` : ''}
    <p>All previous FT, Solution, and Design data has been reset.</p>
  `,
  on_hold: (d) => `
    <p>Hi <strong>${d.recipientName}</strong>,</p>
    <p>The following experiment has been placed <strong style="color:#f59e0b;">On Hold</strong>:</p>
    ${experimentCard(d)}
    ${d.reason ? `<p><strong>Reason:</strong> ${d.reason}</p>` : ''}
    <p>No further action is needed until the hold is lifted.</p>
  `,
};

// ─── Helpers ─────────────────────────────────────────────────────

function experimentCard(d: EmailData) {
  return `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;">
            <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Experiment</span><br/>
            <span style="font-size:15px;font-weight:700;color:#1a1a2e;">${d.experimentName}</span>
          </td>
          ${d.grade ? `
          <td style="padding:4px 0;text-align:right;">
            <span style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Grade</span><br/>
            <span style="font-size:15px;font-weight:700;color:#1a1a2e;">${d.grade}</span>
          </td>` : ''}
        </tr>
      </table>
    </div>
  `;
}

// ─── Main builder ────────────────────────────────────────────────

export function getEmailSubject(type: EmailType, data: EmailData): string {
  return SUBJECTS[type](data);
}

export function buildEmailHtml(type: EmailType, data: EmailData): string {
  const body = BODY_CONTENT[type](data);
  const dashboardUrl = data.dashboardUrl || '#';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#2d2d44 100%);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:white;letter-spacing:-0.3px;">Jigyasu</h1>
              <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;">Engineering Data Management</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:white;padding:32px;font-size:14px;color:#374151;line-height:1.6;">
              ${body}
              
              <!-- CTA Button -->
              <div style="text-align:center;margin:28px 0 8px;">
                <a href="${dashboardUrl}" style="display:inline-block;padding:12px 32px;background:#c45c5c;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Open Dashboard</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                This is an automated notification from Jigyasu ERP.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
