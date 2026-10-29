import type {MatchMetadata} from '../lib/match-config';
import {versionsCopy} from '../lib/i18n/versions';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
export default function MatchMetadataPanel({metadata,locale:requestedLocale='ru'}:{metadata?:MatchMetadata;locale?:UiLocale}){
 const locale=normalizeLocale(requestedLocale),t=versionsCopy[locale].metadata;
 if(!metadata)return <p lang={locale}>{t.legacy}</p>;
 return <details lang={locale}><summary>{t.title}</summary><p>{t.revision}: <span lang="">{metadata.rules_revision}</span></p><p>{t.requirements}: {metadata.requirements}. {t.matched}: {metadata.outcomes.matched}; {t.partial}: {metadata.outcomes.partial}; {t.missing}: {metadata.outcomes.missing}; {t.unknown}: {metadata.outcomes.unknown}.</p><ul>{Object.entries(metadata.weights).map(([key,value])=><li key={key}>{t.categories[key as keyof typeof t.categories]}: {value}%</li>)}</ul><p>{t.contributions}: matched = {metadata.contributions.matched}; partial = {metadata.contributions.partial}; missing = {metadata.contributions.missing}; unknown = {metadata.contributions.unknown}. {t.weightsHelp}</p><p>{t.help}</p></details>;
}
