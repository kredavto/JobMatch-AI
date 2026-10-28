import {z} from 'zod';
const Snapshot=z.object({format:z.literal('jobmatch-scanner-readiness-v1'),ready:z.literal(true),engine:z.string().regex(/^\d+\.\d+\.\d+$/),loadedDatabaseVersion:z.number().int().positive(),loadedDatabaseTime:z.string().datetime(),observedAt:z.string().datetime(),expiresAt:z.string().datetime()}).strict();
/** Policy only. Caller must obtain this snapshot from a trusted scanner-side observer, never the upload. */
export function scannerSnapshotReady(input:unknown,policy:{now:number;allowedEngines:readonly string[];maxDatabaseAgeMs:number;maxObservationAgeMs:number}):boolean{
 const parsed=Snapshot.safeParse(input);if(!parsed.success)return false;
 const {now,maxDatabaseAgeMs,maxObservationAgeMs,allowedEngines}=policy;
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(maxDatabaseAgeMs)||maxDatabaseAgeMs<=0||!Number.isSafeInteger(maxObservationAgeMs)||maxObservationAgeMs<=0)return false;
 const snapshot=parsed.data,database=Date.parse(snapshot.loadedDatabaseTime),observed=Date.parse(snapshot.observedAt),expires=Date.parse(snapshot.expiresAt);
 return allowedEngines.includes(snapshot.engine)&&database<=observed&&observed<=now&&database<=now&&now-database<=maxDatabaseAgeMs&&now-observed<=maxObservationAgeMs&&expires>now&&expires>observed&&expires-observed<=maxObservationAgeMs;
}
