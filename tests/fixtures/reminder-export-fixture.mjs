/** Public synthetic HTTP download data, not an Auth/provider fixture. */
/** @type {import('../../lib/persisted-reminders').RemindersState} */
export const reminderExportFixture={
 format:'jobmatch-reminders-state-v1',ownerId:'11111111-1111-4111-8111-111111111111',revision:3,delivery:'none',items:[
  {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',applicationId:'a1',kind:'interview',localStart:'2026-11-01T01:30',zone:'America/New_York',offsetMinutes:-300,dueAt:'2026-11-01T06:30:00.000Z',minutes:30,description:'Synthetic saved reminder 🧑‍💻',status:'scheduled',revision:1,created:'2026-11-05T08:00:00.000Z',updated:'2026-11-05T08:00:00.000Z'},
  {id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',applicationId:'a1',kind:'follow-up',localStart:'2026-11-02T10:30',zone:'Asia/Kathmandu',offsetMinutes:345,dueAt:'2026-11-02T04:45:00.000Z',minutes:15,description:'Synthetic cancelled reminder',status:'cancelled',revision:3,created:'2026-11-05T08:00:01.000Z',updated:'2026-11-05T08:00:02.000Z'}
 ]
};
