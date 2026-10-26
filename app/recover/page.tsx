import RecoveryForm from './recovery-form';
export const dynamic='force-dynamic';
export default async function RecoveryPage({searchParams}:{searchParams:Promise<{code?:string;error?:string}>}){const query=await searchParams;return <main id="main-content" className="content"><RecoveryForm initialCode={typeof query.code==='string'?query.code:''} invalid={!!query.error}/></main>;}
