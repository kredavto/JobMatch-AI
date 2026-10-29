'use client';
import {workspaceErrorMessage,workspaceNoticeMessage,workspaceFeedbackCopy,type WorkspaceError,type WorkspaceNotice} from '../lib/i18n/workspace-feedback';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
export default function WorkspaceFeedback({error,notice,busy=false,locale:requestedLocale='ru'}:{error:WorkspaceError|null;notice?:WorkspaceNotice|null;busy?:boolean;locale?:UiLocale}){
 const locale=normalizeLocale(requestedLocale);
 return <div lang={locale}>{error&&<div role="alert" className="error">{workspaceErrorMessage(error,locale)}</div>}{notice&&<div role="status" className="notice">{workspaceNoticeMessage(notice,locale)}</div>}{busy&&<div role="status" className="notice">{workspaceFeedbackCopy[locale].busy}</div>}</div>;
}
