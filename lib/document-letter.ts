import {composeLetter,letterEvidence,type LetterStyle} from './cover-letter';
import {LETTER_TEMPLATE_VERSION} from './letter-snapshot-schema-v1';
import type {Fact} from './engine';
export type DocumentLanguage='ru'|'en';
export const ENGLISH_LETTER_TEMPLATE_VERSION='main-en-letter-v1';
const framing:Record<LetterStyle,{opening:string;closing:string}>={
 "professional": {
  "opening": "Hello! I would like to be considered for your vacancy. I have selected the following details from my background for discussion. Please consider these examples in their original context when assessing how my experience relates to the role.",
  "closing": "I would welcome a discussion of the responsibilities, expectations and success criteria for this position. We can review the examples, my personal contribution and the circumstances in which the work was done. If you need further information, I can clarify it separately. Thank you for considering my application."
 },
 "brief": {
  "opening": "Hello! I am interested in your vacancy. Here are selected details from my background:",
  "closing": "I would welcome a discussion of the role and the examples above. Thank you for considering my application."
 },
 "confident": {
  "opening": "Hello! Please consider my resume for your vacancy. For a concrete discussion, I have selected details from my background that we can review in context, including my personal contribution:",
  "closing": "I would welcome a discussion of how these examples relate to the priorities of the position, including their context and limitations. I would also like to clarify your expectations and criteria for successful cooperation. Thank you for considering my application."
 },
 "executive": {
  "opening": "Hello! Please consider my resume for your vacancy. I have selected details from my background for discussion. Their relevance should be assessed in the context of the work, its scope, my personal role and the available resources:",
  "closing": "I would like to discuss the company priorities, responsibilities, resources and success criteria for this position. We can examine the examples, decisions and constraints in more detail to assess our mutual expectations. Thank you for considering my application."
 }
};
export function documentTemplateVersion(language:DocumentLanguage){
 if(language==='ru')return LETTER_TEMPLATE_VERSION;if(language==='en')return ENGLISH_LETTER_TEMPLATE_VERSION;throw Error('UNSUPPORTED_DOCUMENT_LANGUAGE');
}
/** Fixed framing only. Selected factual fragments remain exactly those of the existing gated composer. */
export function composeDocumentLetter(facts:Fact[],vacancy:string,ids:string[],style:LetterStyle,language:DocumentLanguage='ru'){
 documentTemplateVersion(language);
 const legacy=composeLetter(facts,vacancy,ids,style);if(language==='ru')return legacy;
 const available=letterEvidence(facts,vacancy),body=ids.map(id=>{const edit=available.find(value=>value.id===id);if(!edit)throw Error('SOURCE_SELECTION_MISMATCH');return edit.text;}).join('\n');
 return {text:[framing[style].opening,body,framing[style].closing].join('\n\n'),evidence_ids:legacy.evidence_ids};
}
