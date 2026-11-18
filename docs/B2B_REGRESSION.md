# B2B synthetic regression, 2026-11-18

Checked against preview a15c712, not an unavailable historical report. The current main page does not render a 0/100 match score, and adaptResume returns no score field. Its matching is literal, Unicode-normalized and boundary-aware, not semantic skill inference.

Fixed fictional resume explicitly states corporate B2B sales, negotiations and CRM. With corresponding structured vacancy skills it matches all four; absent Python remains unconfirmed and is not added to the letter. With no structured skills, B2B and CRM are detected from the catalog and the exact source sales/negotiation line is quoted. Explicit Russian phrases also match without B2B abbreviation when supplied as vacancy skills. Negated experience and copied vacancy requirements are not promoted.

A deliberately inflected phrase (корпоративными продажами vs корпоративные продажи) documents the lexical limitation, not proof of lack of experience. The UI explicitly describes mentions, not qualification scores. No current defect reproducing the alleged 0/100 result was confirmed; no matching thresholds or runtime code were changed and no skills were invented. Tests use no external AI and no personal data.

The same fixed synthetic payload was posted to the deployed preview `/api/mvp/adapt`: HTTP 200, mode automatic, matchedSkills B2B/Корпоративные продажи/Переговоры/CRM, missingSkills Python, no score field. The letter contained the original sales/negotiation line and no Python claim. This is a deployed API check, not a browser E2E result.
