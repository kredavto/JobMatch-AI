import {it,expect} from 'vitest';
import {matchMetadata,MatchMetadataSchema,weights,RULES_REVISION} from '../lib/match-config';
import {match,parseVacancy,parseFacts} from '../lib/engine';
it('captures counts and independent configuration snapshots',()=>{const rows=match(parseFacts('SQL'),parseVacancy('SQL\nPython')).rows;const meta=matchMetadata(rows);expect(meta.rules_revision).toBe(RULES_REVISION);expect(meta.requirements).toBe(2);expect(meta.outcomes).toEqual({matched:0,partial:0,missing:1,unknown:1});expect(MatchMetadataSchema.safeParse(meta).success).toBe(true);meta.weights.mandatory=0;expect(weights.mandatory).toBe(35);});
it('rejects corrupted counts and weights without coercion',()=>{const m=matchMetadata([]);expect(MatchMetadataSchema.safeParse({...m,requirements:1}).success).toBe(false);expect(MatchMetadataSchema.safeParse({...m,weights:{...m.weights,skills:90}}).success).toBe(false);expect(MatchMetadataSchema.safeParse({...m,requirements:'0'}).success).toBe(false);});
