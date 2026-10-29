import {z} from 'zod';
export function localStart(value:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('Укажите дату и время');
 const [y,m,d,h,min]=value.split(/[-T:]/).map(Number),date=new Date(y,m-1,d,h,min);
 if(y<1900||y>9998||date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d||date.getHours()!==h||date.getMinutes()!==min)throw new Error('Некорректное или несуществующее местное время');
 return date;
}
const event=z.object({uid:z.uuid(),title:z.string().trim().min(1).max(350),description:z.string().max(3000),start:z.date(),created:z.date(),minutes:z.union([z.literal(15),z.literal(30),z.literal(60),z.literal(90)]),alarm:z.boolean(),sequence:z.number().int().min(0).max(2147483647).optional()});
export type CalendarEvent=z.infer<typeof event>;
function escapeText(value:string){return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
function fold(line:string){let result='',size=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(size+bytes>75){result+='\r\n ';size=1;}result+=char;size+=bytes;}return result;}
function stamp(date:Date){const s=date.toISOString();if(!/^\d{4}-/.test(s))throw new Error('Дата вне допустимого диапазона');return s.replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');}
export function calendarFile(input:CalendarEvent){
 const e=event.parse(input);const end=new Date(e.start.getTime()+e.minutes*60000);
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//JobMatch AI//Reminders//RU','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${e.uid}@jobmatch.local`,`DTSTAMP:${stamp(e.created)}`,`DTSTART:${stamp(e.start)}`,`DTEND:${stamp(end)}`,'CLASS:PRIVATE',`SUMMARY:${escapeText(e.title)}`,`DESCRIPTION:${escapeText(e.description)}`];
 if(e.sequence!==undefined)lines.push('SEQUENCE:'+e.sequence);
 if(e.alarm)lines.push('BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-PT15M',`DESCRIPTION:${escapeText(e.title)}`,'END:VALARM');
 return [...lines,'END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
