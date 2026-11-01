import {z} from 'zod';
import {APPLICATION_STATUSES} from './application-filter';

const validText=(value:string)=>value.isWellFormed()&&!value.includes('\0');
const entityId=z.string().min(1).max(100).refine(validText,'Invalid Unicode');
const application=z.object({
 action:z.literal('application'),id:entityId.optional(),title:z.string().min(1).max(300).refine(validText,'Invalid Unicode').optional(),
 status:z.enum(APPLICATION_STATUSES),note:z.string().max(3000).refine(validText,'Invalid Unicode').default(''),
 resumeVersionId:entityId.nullable().optional()
}).strict().superRefine((command,ctx)=>{
 if(command.id===undefined&&command.title===undefined)ctx.addIssue({code:'custom',path:['title'],message:'Title required for a new application'});
 if(command.id!==undefined&&command.title!==undefined)ctx.addIssue({code:'custom',path:['title'],message:'Saved title is immutable'});
});

/** Entity intent only: no snapshot, caller-selected owner, or unrelated writable fields. */
export const WorkspaceCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('goal'),text:z.string().max(1000).refine(validText,'Invalid Unicode')}).strict(),
 z.object({action:z.literal('vacancy'),text:z.string().min(5).max(30000).refine(validText,'Invalid Unicode')}).strict(),
 z.object({action:z.literal('verify'),ids:z.array(entityId).max(500)
  .refine(ids=>new Set(ids).size===ids.length,'Duplicate IDs'),verified:z.boolean()}).strict(),
 application
]);
export type WorkspaceCommand=z.infer<typeof WorkspaceCommandSchema>;
