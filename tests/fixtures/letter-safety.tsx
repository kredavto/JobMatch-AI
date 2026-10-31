import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import CoverLetterPanel from '../../app/cover-letter-panel';
function Fixture(){const [dirty,setDirty]=useState(false),[paused,setPaused]=useState(false),[revoked,setRevoked]=useState(false),[changed,setChanged]=useState(false);const facts=[{id:'f1',text:changed?'SQL saved 43%.':'SQL saved 42%.',source:'Synthetic',verified:!revoked}];return <main><h1>Letter safety fixture</h1><button onClick={()=>setDirty(!dirty)}>Toggle dirty</button><button onClick={()=>setPaused(!paused)}>Toggle paused</button><button onClick={()=>setRevoked(!revoked)}>Toggle revoked</button><button onClick={()=>setChanged(!changed)}>Toggle changed</button><CoverLetterPanel facts={facts} vacancy="SQL" sourceDirty={dirty} disabled={paused}/></main>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
