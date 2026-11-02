import {z} from 'zod';
import {LetterSnapshotSchemaV1} from './letter-snapshot-schema-v1';
import {EnglishLetterRecordSchemaV1} from './english-letter-record-schema-v1';
/** Explicit format/version pairs; no normalization, translation or current-composer dependency. */
export const LetterDocumentSchema=z.discriminatedUnion('format',[LetterSnapshotSchemaV1,EnglishLetterRecordSchemaV1]);
