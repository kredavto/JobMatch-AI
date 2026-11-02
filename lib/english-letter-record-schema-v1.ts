import {z} from 'zod';
import {LetterSnapshotReviewSchemaV1 as reviewSchema} from './letter-snapshot-schema-v1';
/** Frozen structural archive contract. Do not depend on a future composer or review implementation. */
export const ENGLISH_LETTER_TEMPLATE_VERSION_V1='main-en-letter-v1';
export const ENGLISH_LETTER_RECORD_FORMAT='jobmatch-english-letter-record-v1';
export const ENGLISH_LETTER_RECORD_MAX_BYTES=1_000_000;
const text=(max:number)=>z.string().min(1).max(max).refine(value=>value.isWellFormed()&&!!value.trim()&&!value.includes('\0'));
export const EnglishLetterRecordSchemaV1=z.strictObject({
 format:z.literal(ENGLISH_LETTER_RECORD_FORMAT),trust:z.literal('unsigned-editable-local-snapshot'),
 documentLanguage:z.literal('en'),templateVersion:z.literal(ENGLISH_LETTER_TEMPLATE_VERSION_V1),
 contentReview:z.literal('reported-user-review'),semanticAssessment:z.literal('not-performed'),modelVersion:z.null(),
 source:z.strictObject({facts:z.array(z.strictObject({id:text(200),text:text(2000),source:text(2000),verified:z.boolean()})).min(1).max(5),vacancy:text(30000)}),
 selection:z.array(text(205)).min(1).max(5),style:z.enum(['professional','brief','confident','executive']),
 generated:text(15000),text:text(15000),review:reviewSchema,
 approval:z.strictObject({wholeLetter:z.literal(true),reviewedIssueIds:z.array(text(100)).max(257)})
});
