import {z} from 'zod';
import {WorkspaceSchema} from './workspace-schema';
export const AuditSchema=z.object({id:z.uuid(),action:z.string().max(100),created:z.iso.datetime({offset:true})});
export const ConsentSchema=z.object({version:z.string(),created:z.iso.datetime({offset:true})});
export const ExportSchema=z.object({
 format:z.literal('jobmatch-personal-data-v1'),complete:z.literal(true),
 scope:z.literal('workspace-audit-consent'),exported_at:z.iso.datetime({offset:true}),
 fact_history_export:z.literal('/api/fact-history?export=1'),
 saved_letters_export:z.literal('/api/letter-versions?export=1').optional(),
 source_versions_export:z.literal('/api/source-versions?export=1').optional(),
 user:z.object({id:z.string().min(1),email:z.email().optional()}),
 workspace:WorkspaceSchema,audit:z.array(AuditSchema),consent:z.array(ConsentSchema).max(1)
});
