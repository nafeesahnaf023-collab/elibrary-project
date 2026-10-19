/* Department icons — Lucide (https://lucide.dev, ISC license; lucide-static v1.59.0).
   Plain-JS stack, so the official SVG nodes are inlined here instead of loading a library at runtime (no CDN, no new dependency).
   Only stable icon ids / department names are ever stored with data — never markup — and this file maps them to icons. */
const LUCIDE_NODES = {
  'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  'briefcase-business': '<path d="M12 12h.01"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M22 13a18.15 18.15 0 0 1-20 0"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  'chart-no-axes-combined': '<path d="M12 16v5"/><path d="M16 14.639V21"/><path d="M20 10.656V21"/><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15"/><path d="M4 18.463V21"/><path d="M8 14.656V21"/>',
  'hard-hat': '<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M14 6a6 6 0 0 1 6 6v3"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><rect x="2" y="15" width="20" height="4" rx="1"/>',
  'laptop-minimal': '<rect width="18" height="12" x="3" y="4" rx="2" ry="2"/><line x1="2" x2="22" y1="20" y2="20"/>',
  'cpu': '<path d="M12 20v2"/><path d="M12 2v2"/><path d="M17 20v2"/><path d="M17 2v2"/><path d="M2 12h2"/><path d="M2 17h2"/><path d="M2 7h2"/><path d="M20 12h2"/><path d="M20 17h2"/><path d="M20 7h2"/><path d="M7 20v2"/><path d="M7 2v2"/><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  'lightbulb': '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  'zap': '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
  'pi': '<line x1="9" x2="9" y1="4" y2="20"/><path d="M4 7c0-1.7 1.3-3 3-3h13"/><path d="M18 20c-1.7 0-3-1.3-3-3V4"/>',
  'stethoscope': '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  'atom': '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
  'flask-conical': '<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/>',
  'microscope': '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
  'dna': '<path d="m10 16 1.5 1.5"/><path d="m14 8-1.5-1.5"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="m16.5 10.5 1 1"/><path d="m17 6-2.891-2.891"/><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="m20 9 .891.891"/><path d="M3.109 14.109 4 15"/><path d="m6.5 12.5 1 1"/><path d="m7 18 2.891 2.891"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/>',
  'scale': '<path d="M12 3v18"/><path d="m19 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"/><path d="m5 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M7 21h10"/>',
  'landmark': '<path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
  'palette': '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
  'languages': '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  'book-open': '<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>',
  'globe': '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'
};

/* Icons an admin can pick when adding / editing a department (id is what gets stored). */
const DEPARTMENT_ICON_CHOICES = [
  { id:'graduation-cap', label:'General', color:'#64748B' },
  { id:'briefcase-business', label:'Business', color:'#0D9488' },
  { id:'chart-no-axes-combined', label:'Analytics', color:'#0284C7' },
  { id:'hard-hat', label:'Civil / Construction', color:'#EA580C' },
  { id:'laptop-minimal', label:'Computing', color:'#2563EB' },
  { id:'cpu', label:'Hardware / CSE', color:'#4F46E5' },
  { id:'lightbulb', label:'Electronics', color:'#CA8A04' },
  { id:'zap', label:'Electrical', color:'#D97706' },
  { id:'pi', label:'Mathematics', color:'#9333EA' },
  { id:'stethoscope', label:'Medical', color:'#E11D48' },
  { id:'atom', label:'Physics', color:'#0891B2' },
  { id:'flask-conical', label:'Chemistry', color:'#16A34A' },
  { id:'microscope', label:'Biology', color:'#7C3AED' },
  { id:'dna', label:'Genetics', color:'#DB2777' },
  { id:'scale', label:'Law', color:'#475569' },
  { id:'landmark', label:'Economics / Govt', color:'#B45309' },
  { id:'palette', label:'Arts & Design', color:'#C026D3' },
  { id:'languages', label:'Languages', color:'#2563EB' },
  { id:'book-open', label:'Literature', color:'#0F766E' },
  { id:'globe', label:'Geography / Global', color:'#0369A1' }
];

/* Built-in mapping: normalized department name -> { icon id, colour }. Add a row to support a new department in code. */
const DEPARTMENT_ICONS = {
  'business administration':                { icon:'briefcase-business',     color:'#0D9488' },
  'business studies':                       { icon:'chart-no-axes-combined', color:'#0284C7' },
  'civil engineering':                      { icon:'hard-hat',               color:'#EA580C' },
  'computer science':                       { icon:'laptop-minimal',         color:'#2563EB' },
  'computer science and engineering':       { icon:'cpu',                    color:'#4F46E5' },
  'electrical and electronic engineering':  { icon:'lightbulb',              color:'#CA8A04' },
  'electrical engineering':                 { icon:'zap',                    color:'#D97706' },
  'mathematics':                            { icon:'pi',                     color:'#9333EA' },
  'medical science':                        { icon:'stethoscope',            color:'#E11D48' },
};
const DEPARTMENT_ICON_FALLBACK = { icon:'graduation-cap', color:'#64748B' };

/* Admin-chosen icons: { normalized name: icon id } in localStorage. Read on demand so changes show up immediately. */
const DEPT_ICON_KEY = 'el_dept_icons';
const normDeptName = n => String(n || '').toLowerCase().replace(/&/g, ' and ').replace(/\s+/g, ' ').trim();
function readDeptIconMap(){ try { const m = JSON.parse(localStorage.getItem(DEPT_ICON_KEY) || '{}'); return m && typeof m === 'object' ? m : {}; } catch(e){ return {}; } }
function writeDeptIconMap(m){ try { localStorage.setItem(DEPT_ICON_KEY, JSON.stringify(m)); } catch(e){} }
function setDeptIcon(name, iconId){ const m = readDeptIconMap(), k = normDeptName(name); if(iconId && LUCIDE_NODES[iconId]) m[k] = iconId; else delete m[k]; writeDeptIconMap(m); }
function removeDeptIcon(name){ const m = readDeptIconMap(); delete m[normDeptName(name)]; writeDeptIconMap(m); }
function renameDeptIcon(oldName, newName){ const m = readDeptIconMap(), k = normDeptName(oldName); if(m[k]){ m[normDeptName(newName)] = m[k]; if(normDeptName(newName) !== k) delete m[k]; writeDeptIconMap(m); } }

function departmentIconInfo(name){
  const k = normDeptName(name), picked = readDeptIconMap()[k], choice = picked && DEPARTMENT_ICON_CHOICES.find(c => c.id === picked);
  return choice ? { icon:choice.id, color:choice.color } : (DEPARTMENT_ICONS[k] || DEPARTMENT_ICON_FALLBACK);
}
/* Bare icon markup (used by the picker); deptIconHTML wraps it in the pastel circle. */
const lucideSVG = id => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LUCIDE_NODES[id] || LUCIDE_NODES['graduation-cap']}</svg>`;

/* size: 'sm' (tables / filters) or '' (default, cards). The pastel background is derived from the icon colour in CSS. */
function deptIconHTML(name, size){
  const d = departmentIconInfo(name);
  return `<span class="dept-icon${size ? ' dept-icon--' + size : ''}" style="--dept-fg:${d.color};" aria-hidden="true">${lucideSVG(d.icon)}</span>`;
}
