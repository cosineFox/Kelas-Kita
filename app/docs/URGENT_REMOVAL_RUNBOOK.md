# Urgent-removal runbook

Status: **one-person exception guide**. Automated checks reject or hold urgent content; this runbook covers unusual disputes that reach the operator.

## Coverage contract

- Operator: monitored route recorded in `OPERATOR_CONTACT_EMAIL`.
- Public route: `moderation@catbox404.dev`.
- Safety target: review exceptional credible threats or exposed personal information promptly when notified.
- Safety target: temporarily hold first, preserve the private audit record, then investigate. Do not wait for a truth or defamation judgement before hiding exposed contact details or a credible threat.

## Live response

1. Open `/moderation`, confirm the case ID and urgent age, and take ownership through the agreed operator channel.
2. Check the content, report context, model categories and deterministic Core action. Treat model prose as a signal, not evidence.
3. For an exposed phone number, address, identity number or credible targeted threat, select **Hold** or **Remove** and write a specific private policy reason.
4. Preserve only the minimum record needed for appeal and incident handling. Do not copy the content into chat, tickets or personal notes.
5. For imminent danger, use the appropriate formal emergency channel. KelasKita is not an emergency service or investigative body.
6. Send the affected person the appeal/right-of-reply route when contact is available and appropriate.
7. Record acknowledgement, action and closure timestamps. Review false positives after the urgent risk is contained.

## Required staging drill

Use synthetic data only—never a real lecturer’s contact details or a real allegation.

| Check | Required evidence |
|---|---|
| Operator receives alert | Timestamp and channel |
| Operator acknowledges | Timestamp |
| Synthetic review leaves public feed | Under 30 minutes |
| Private decision contains a reason | Case ID and timestamp |
| Appeal restores a safe redacted item | Appeal and decision IDs |
| AI Gateway unavailable | Item remains pending; retry is visible and works |
| Operator session revoked | Old cookie returns 401 after expiry/logout |

## Sign-off record

- Drill date:
- Environment/deployment:
- Operator acknowledgement time:
- Fastest/slowest removal time:
- Failed checks and remediation:
- Retest date:
- Operator note:

Do not replace these fields with invented names or simulated timestamps.
