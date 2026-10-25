/** Conservative whole-fact screening, not a semantic proof of competence. */
export function evidenceIssue(text:string):string|null{
 const s=text.toLowerCase().replace(/ё/g,'е').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
 if(/ignore|system prompt|игнорир|инструкци|<script/i.test(s))return 'В строке возможны инструкции или служебный текст. Нужна ручная проверка.';
 if(/(?:^|[^\p{L}])(?:не\s+(?:име\p{L}*|знаю|знал\p{L}*|требу\p{L}*|обязател\p{L}*|использ\p{L}*|владе\p{L}*|работ\p{L}*|примен\p{L}*|знаком\p{L}*|умею|осво\p{L}*|было)|никогда\s+не|без\s+опыта|нет\s+(?:опыта|навык\p{L}*|знани\p{L}*)|опыт\p{L}*\s+нет)(?:$|[^\p{L}])|\b(?:no|not|never|cannot|can't|don't|doesn't|didn't|haven't|hasn't|wasn't|weren't|without)\b/u.test(s))return 'Есть отрицание или указание на отсутствие опыта. Не использовать как доказательство навыка без уточнения.';
 if(/(?:^|[^\p{L}])(?:изучаю|планирую|хочу\s+(?:изучить|освоить|научиться)|буду\s+(?:изучать|осваивать)|собираюсь\s+(?:изучать|освоить))(?:$|[^\p{L}])|\b(?:learning|studying|plan(?:ning)? to|want to learn|will learn)\b/u.test(s))return 'Указано обучение или намерение. Нужен отдельно подтвержденный выполненный пример.';
 return null;
}
