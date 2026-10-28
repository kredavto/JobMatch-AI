import {z} from 'zod';

/** Entity intent only: no snapshot, caller-selected owner, or unrelated writable fields. */
export const WorkspaceCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('goal'),text:z.string().max(1000)}).strict(),
 z.object({action:z.literal('vacancy'),text:z.string().min(5).max(30000)}).strict(),
 z.object({action:z.literal('verify'),ids:z.array(z.string().min(1).max(100)).max(500)
  .refine(ids=>new Set(ids).size===ids.length,'Duplicate IDs'),verified:z.boolean()}).strict()
]);
export type WorkspaceCommand=z.infer<typeof WorkspaceCommandSchema>;
