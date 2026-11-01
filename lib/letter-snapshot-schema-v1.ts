import {z} from 'zod';
/** Stable structural archive codec. Composition/semantic validation happens separately at issuance. */
export const LETTER_SNAPSHOT_FORMAT='jobmatch-local-letter-snapshot-v1';
// Bump whenever composition, framing, evidence selection or gates change.
export const LETTER_TEMPLATE_VERSION='main-ru-letter-81cb1a6-v1';
export const LETTER_SNAPSHOT_MAX_BYTES=1_000_000;
const text=(max:number)=>z.string().min(1).max(max).refine(s=>s.isWellFormed()&&!!s.trim());
const span=z.strictObject({quote:text(15000),start:z.number().int().min(0).max(15000),end:z.number().int().min(0).max(15000)});
export const LetterSnapshotReviewSchemaV1=z.strictObject({format:z.literal('literal-edit-audit-v1'),coverage:z.literal('bounded-lexical-only'),semanticAssessment:z.literal('not-performed'),edited:z.boolean(),issues:z.array(z.strictObject({id:text(100),kind:z.enum(['manual-edit','number-added','number-removed','negation-added','negation-removed']),before:span.nullable(),after:span.nullable()})).max(257)});
export const LetterSnapshotSchemaV1=z.strictObject({
 format:z.literal(LETTER_SNAPSHOT_FORMAT),trust:z.literal('unsigned-editable-local-snapshot'),templateVersion:z.literal(LETTER_TEMPLATE_VERSION),
 source:z.strictObject({facts:z.array(z.strictObject({id:text(200),text:text(2000),source:text(2000),verified:z.boolean()})).min(1).max(5),vacancy:text(30000)}),
 selection:z.array(text(205)).min(1).max(5),style:z.enum(['professional','brief','confident','executive']),
 generated:text(15000),text:text(15000),review:LetterSnapshotReviewSchemaV1,
 approval:z.strictObject({wholeLetter:z.literal(true),reviewedIssueIds:z.array(text(100)).max(257)})
});
