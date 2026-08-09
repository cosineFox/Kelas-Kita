# Malaysian legal launch gate

Status: **external counsel review required**. This is an engineering issue list, not a legal opinion or a claim of compliance.

KelasKita processes identifiable lecturer information, potentially sensitive allegations, abuse-prevention signals, private contact details and automated moderation outputs across several providers. Malaysian counsel should record advice against the actual operator, funding model, university scope, provider regions and final policies—not against a hypothetical service.

## Counsel questions

1. Confirm whether and how the Personal Data Protection Act 2010 and the 2024 amendments apply to the operator and any donation/commercial activity; identify the data controller and each processor.
2. Review the lawful basis, notice, disclosure, access/correction, security, retention and cross-border arrangements for Vercel, Neon, Cloudflare and Vercel AI Gateway/model providers.
3. Decide whether a Data Protection Officer, registration, data-protection impact assessment or other formal step is required under the operator’s real scale and activities.
4. Approve a data-breach response that meets the current Commissioner circular/guideline, including notification thresholds and timing.
5. Review the automated-decision disclosure, meaningful human appeal and the decision to auto-publish low-risk reviews while holding grave allegations.
6. Review defamation exposure, innocent dissemination/notice handling, evidence preservation, lecturer replies, appeals and the wording used for unverified allegations.
7. Review the Communications and Multimedia Act, the current Malaysian Communications and Multimedia Content Code, and whether the operator falls within any licensing, registration or code category.
8. Approve the age rule, formal university-reporting referrals, law-enforcement handling, emergency wording, operator identity and service/contact address.
9. Review university names, course data, trademarks and the non-affiliation presentation. No university logo is used.
10. Define a litigation hold that overrides routine deletion without silently keeping every rejected review forever.

## Engineering controls available for review

- Pending-first storage and published-only ratings.
- No public reviewer account or public reviewer identity.
- Turnstile, edge surge protection, Postgres rate limits and rotating HMAC abuse signals.
- Encrypted private contacts and server-only moderation findings.
- A serious-allegation hold that makes no truth, fraud, defamation or guilt finding.
- Human report, appeal, reply, retry and reversible removal paths with private reasons.
- Retention jobs for transient signals, rejected/removed content and closed cases.
- A clear non-affiliation statement and no university logos.

## Primary materials for counsel

- [Personal Data Protection Act 2010 (Act 709), Commissioner’s Office](https://www.pdp.gov.my/ppdpv1/en/akta/pdp-act-2010-en/)
- [Personal Data Protection (Amendment) Act 2024, Commissioner’s Office](https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-amendment-act-2024/)
- [Data Breach Notification guideline and circular, Commissioner’s Office](https://www.pdp.gov.my/ppdpv1/en/guidelines-and-circulars-on-data-breach-notification-dbn/)
- [Automated Decision-Making and Profiling guideline, Commissioner’s Office](https://www.pdp.gov.my/ppdpv1/en/akta/automated-decision-making-and-profiling-guideline-admp/)
- [Malaysian Communications and Multimedia Content Code 2022, Content Forum](https://contentforum.my/content-code/)

The Content Code was under review in 2025. Counsel must check the version in force on the actual launch date.

## Sign-off record

- Operator legal name/entity:
- Counsel/firma and practising details:
- Advice date and scope:
- Approved privacy notice version:
- Approved terms/rules version:
- Required operational changes:
- Residual risks accepted by:
- Re-review trigger/date:
- Signed launch decision:

Blank fields mean the legal gate is open and submissions stay closed.
