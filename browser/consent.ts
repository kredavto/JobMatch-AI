export const HH_CONSENT_VERSION='hh-risk-v1' as const;
export type HhConsent={version:typeof HH_CONSENT_VERSION;accepted:true;acceptedAt:string};
export function validHhConsent(value:HhConsent|undefined){return !!value&&value.accepted===true&&value.version===HH_CONSENT_VERSION&&Number.isFinite(Date.parse(value.acceptedAt));}
