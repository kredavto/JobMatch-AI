/** UI text only. Never translate evidence, vacancy quotes or persisted status values here. */
export const tabIds=['overview','profile','vacancy','editor','versions','applications','analytics','settings'] as const;
export type TabId=typeof tabIds[number];
type Messages={
 navigation:Record<TabId,string>;
 match:Record<'matched'|'partial'|'missing'|'unknown',string>;
 common:{skip:string;sections:string;workspace:string;overviewTitle:string;loading:string;loadFailed:string;retry:string;logout:string;offline:string};
 request:{lost:string;invalid:string;failed:string};
 auth:{create:string;welcome:string;email:string;password:string;wait:string;signUp:string;signIn:string;existing:string;newAccount:string;passwordHint:string};
 metadata:{title:string;description:string};
};
export const ru:Messages={
 navigation:{overview:'Обзор',profile:'Мой профиль',vacancy:'Анализ вакансии',editor:'Редактор резюме',versions:'Мои версии',applications:'Отклики',analytics:'Аналитика',settings:'Настройки'},
 match:{matched:'Соответствует',partial:'Частично',missing:'Нет свидетельств',unknown:'Не подтверждено'},
 common:{skip:'Перейти к содержимому',sections:'Разделы',workspace:'Рабочее пространство',overviewTitle:'Следующий шаг в карьере',loading:'Загружаем JobMatch…',loadFailed:'Не удалось загрузить рабочее пространство',retry:'Повторить загрузку',logout:'Выйти',offline:'Нет подключения к сети. Не закрывайте вкладку с несохраненным текстом. Изменения не отправляются автоматически.'},
 request:{lost:'Связь с сервером потеряна. Результат записи неизвестен. Загрузите актуальные данные перед повторным сохранением.',invalid:'Сервер вернул некорректный ответ. Загрузите актуальные данные.',failed:'Не удалось выполнить запрос'},
 auth:{create:'Создать аккаунт',welcome:'С возвращением',email:'Электронная почта',password:'Пароль · минимум 12 символов',wait:'Подождите…',signUp:'Создать аккаунт →',signIn:'Войти →',existing:'Уже есть аккаунт? Войти',newAccount:'Создать новый аккаунт',passwordHint:'Используйте отдельный пароль JobMatch AI. Если забыли его, откройте «Забыли пароль?». Пароль приложения почты используется только администратором в SMTP.'},
 metadata:{title:'JobMatch AI — резюме с опорой на факты',description:'Честное сопоставление опыта и вакансии'}
};
export const en:Messages={
 navigation:{overview:'Overview',profile:'My profile',vacancy:'Vacancy analysis',editor:'Resume editor',versions:'My versions',applications:'Applications',analytics:'Analytics',settings:'Settings'},
 match:{matched:'Matched',partial:'Partial',missing:'No evidence',unknown:'Unconfirmed'},
 common:{skip:'Skip to content',sections:'Sections',workspace:'Workspace',overviewTitle:'Your next career step',loading:'Loading JobMatch…',loadFailed:'Could not load workspace',retry:'Retry loading',logout:'Sign out',offline:'You are offline. Keep this tab open if you have unsaved text. Changes are not sent automatically.'},
 request:{lost:'Connection lost. The write outcome is unknown. Reload current data before saving again.',invalid:'The server returned an invalid response. Reload current data.',failed:'Request failed'},
 auth:{create:'Create an account',welcome:'Welcome back',email:'Email address',password:'Password · at least 12 characters',wait:'Please wait…',signUp:'Create account →',signIn:'Sign in →',existing:'Already have an account? Sign in',newAccount:'Create a new account',passwordHint:'Use a separate JobMatch AI password. If you forgot it, open password recovery. A mail app password is only used by the administrator for SMTP.'},
 metadata:{title:'JobMatch AI — evidence-based resumes',description:'Transparent matching of experience and job requirements'}
};
/** Russian remains the only released UI until all screens and server errors are translated. */
export const ui=ru;
