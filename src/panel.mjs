import { Router } from 'express'
import express from 'express'
import {
  getAgendamentosDia, getFaturamentoDia, getHistoricoCliente,
  getProdutosEmEstoque, getAllConfigs, setConfig, getConfig,
  atualizarEstoque, cancelarAgendamento, getServicosAtivos,
  updateServico, getDb,
  criarProduto, deletarProduto, updateProduto,
  criarServico, deletarServico, getServicoById,
  getAgendamentosAguardandoSinal, aprovarSinal, getAgendamento,
  enfileirarMensagem, getMetricasDiarias,
} from './db.mjs'
import { deleteEvent, createEvent } from './calendar.mjs'
import { staff } from './config.mjs'
import { log } from './logger.mjs'
import { M } from './messages.mjs'

const router = Router()
const SECRET = process.env.PANEL_SECRET || 'painel-andy-regua-2024'

// ── Helpers ───────────────────────────────────────────────────────
function staffNameById(id) { return staff.find(s => s.id === id)?.name || id }

function formatHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function formatData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
}

function hojeStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function initials(nome) {
  if (!nome) return '?'
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function badge(status) {
  const map = {
    confirmado: ['rgba(34,197,94,.12)', '#4ade80', 'Confirmado'],
    cancelado:  ['rgba(239,68,68,.12)', '#f87171', 'Cancelado'],
    concluido:  ['rgba(96,165,250,.12)', '#93c5fd', 'Concluído'],
    no_show:    ['rgba(251,146,60,.12)', '#fb923c', 'No-show'],
  }
  const [bg, color, label] = map[status] || ['rgba(255,255,255,.06)', '#999', status]
  return `<span style="background:${bg};color:${color};padding:.2rem .75rem;border-radius:20px;font-size:.68rem;font-weight:600;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap">${label}</span>`
}

// ── SVG Icons ─────────────────────────────────────────────────────
const ic = {
  cal:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  money: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  users: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  box:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  cut:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
  gear:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
  plus:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  back:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  lock:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  chart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  warn:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
}

// ── CSS ───────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#060606;--surface:#0d0d0d;--elevated:#141414;--hover:#1a1a1a;--active:#202020;
  --border:rgba(255,255,255,0.055);--border2:rgba(255,255,255,0.1);
  --gold:#c9a84c;--gold-l:#e8c96d;--gold-dim:rgba(201,168,76,0.1);--gold-dim2:rgba(201,168,76,0.05);
  --white:#ede9e1;--muted:#999;--muted2:#555;
  --red:#ef4444;--red-dim:rgba(239,68,68,0.1);
  --green:#22c55e;--green-dim:rgba(34,197,94,0.1);
  --blue:#60a5fa;--blue-dim:rgba(96,165,250,0.1);
  --amber:#f59e0b;--amber-dim:rgba(245,158,11,0.1);
  --sidebar-w:220px;--radius:10px;--radius-sm:7px;--tr:.18s cubic-bezier(.4,0,.2,1);
}
html,body{height:100%;background:var(--bg);color:var(--white);font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-size:15px;line-height:1.5}
.layout{display:flex;height:100vh;overflow:hidden}

/* ── SIDEBAR ── */
.sidebar{
  width:var(--sidebar-w);flex-shrink:0;background:var(--surface);
  border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto
}
.sidebar-logo{padding:1.5rem 1.25rem 1.25rem;border-bottom:1px solid var(--border)}
.logo-mark{
  width:36px;height:36px;background:linear-gradient(135deg,var(--gold),#8b5e1a);
  border-radius:10px;display:flex;align-items:center;justify-content:center;
  font-size:1.1rem;margin-bottom:.75rem;box-shadow:0 4px 16px rgba(201,168,76,0.2)
}
.logo-name{font-size:1rem;font-weight:700;color:var(--white);letter-spacing:-.3px}
.logo-sub{font-size:.7rem;color:var(--muted);letter-spacing:.8px;text-transform:uppercase;margin-top:.15rem}
.nav{padding:.5rem 0;flex:1}
.nav-label{padding:.6rem 1.25rem .25rem;font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:1.5px;font-weight:600}
.nav-item{
  display:flex;align-items:center;gap:.7rem;padding:.65rem 1.25rem;
  color:var(--muted);text-decoration:none;font-size:.84rem;font-weight:400;
  border-left:2px solid transparent;transition:var(--tr);margin:.5px 0;letter-spacing:-.1px
}
.nav-item:hover{color:var(--white);background:rgba(255,255,255,0.03);border-left-color:var(--border2)}
.nav-item.active{color:var(--gold);background:var(--gold-dim2);border-left-color:var(--gold);font-weight:500}
.nav-item svg{flex-shrink:0;opacity:.7}
.nav-item.active svg,.nav-item:hover svg{opacity:1}
.sidebar-footer{
  padding:.9rem 1.25rem;border-top:1px solid var(--border);
  font-size:.74rem;color:var(--muted);display:flex;align-items:center;gap:.4rem
}
.pulse{
  width:7px;height:7px;background:var(--green);border-radius:50%;flex-shrink:0;
  box-shadow:0 0 0 0 rgba(34,197,94,.4);animation:pulse 2s infinite
}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.4)}70%{box-shadow:0 0 0 6px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}

/* ── MAIN ── */
.main{flex:1;overflow-y:auto;display:flex;flex-direction:column;min-width:0}
.topbar{
  padding:1.1rem 1.75rem;border-bottom:1px solid var(--border);
  background:rgba(13,13,13,0.85);backdrop-filter:blur(12px);
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:20
}
.topbar-left h1{font-size:1.05rem;font-weight:700;color:var(--white);letter-spacing:-.3px}
.topbar-left p{font-size:.78rem;color:var(--muted);margin-top:.15rem}
.topbar-right{display:flex;gap:.5rem;align-items:center}
.content{padding:1.5rem 1.75rem;flex:1}

/* ── STATS ── */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem;margin-bottom:1.5rem}
.stat{
  background:var(--elevated);border:1px solid var(--border);border-radius:var(--radius);
  padding:1.1rem 1.25rem;position:relative;overflow:hidden;transition:var(--tr);cursor:default
}
.stat:hover{border-color:var(--border2);transform:translateY(-1px)}
.stat-icon{
  width:30px;height:30px;border-radius:8px;display:flex;align-items:center;
  justify-content:center;margin-bottom:.85rem
}
.stat-icon.gold{background:var(--gold-dim);color:var(--gold)}
.stat-icon.green{background:var(--green-dim);color:var(--green)}
.stat-icon.blue{background:var(--blue-dim);color:var(--blue)}
.stat-icon.amber{background:var(--amber-dim);color:var(--amber)}
.stat-val{font-size:1.55rem;font-weight:700;letter-spacing:-.5px;line-height:1;color:var(--white)}
.stat-lbl{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;margin-top:.35rem;font-weight:500}
.stat-accent{
  position:absolute;bottom:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,var(--gold),transparent)
}
.stat-accent.green{background:linear-gradient(90deg,var(--green),transparent)}
.stat-accent.blue{background:linear-gradient(90deg,var(--blue),transparent)}

/* ── TOOLBAR ── */
.toolbar{
  background:var(--elevated);border:1px solid var(--border);border-radius:var(--radius);
  padding:.9rem 1.1rem;display:flex;gap:.65rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:1.1rem
}
.toolbar-group{display:flex;flex-direction:column;gap:.3rem;flex:1;min-width:130px}
.toolbar-label{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;font-weight:600}

/* ── INPUTS ── */
input,select,textarea{
  background:var(--hover);border:1px solid var(--border2);color:var(--white);
  padding:.55rem .9rem;border-radius:var(--radius-sm);font-size:.85rem;
  font-family:'Inter',sans-serif;width:100%;outline:none;transition:var(--tr)
}
input:focus,select:focus,textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-dim)}
input[type=number]{text-align:center;padding:.5rem .5rem}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.5) sepia(1) saturate(2) hue-rotate(5deg);opacity:.7;cursor:pointer}
select option{background:var(--elevated)}

/* ── BUTTONS ── */
.btn{
  display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.1rem;
  border-radius:var(--radius-sm);font-size:.82rem;font-weight:500;cursor:pointer;
  border:1px solid;text-decoration:none;transition:var(--tr);
  font-family:'Inter',sans-serif;white-space:nowrap;line-height:1;letter-spacing:-.1px
}
.btn-primary{background:var(--gold);color:#000;border-color:var(--gold);font-weight:600}
.btn-primary:hover{background:var(--gold-l);border-color:var(--gold-l);box-shadow:0 4px 16px rgba(201,168,76,0.25)}
.btn-ghost{background:transparent;color:var(--muted);border-color:var(--border2)}
.btn-ghost:hover{background:var(--hover);color:var(--white);border-color:var(--border2)}
.btn-danger{background:transparent;color:var(--red);border-color:rgba(239,68,68,.25)}
.btn-danger:hover{background:var(--red-dim);border-color:var(--red)}
.btn-sm{padding:.35rem .75rem;font-size:.72rem}
.btn:active{transform:scale(.98)}

/* ── TABLE ── */
.table-wrap{background:var(--elevated);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
table{width:100%;border-collapse:collapse}
thead{background:var(--hover)}
th{padding:.75rem 1rem;font-size:.7rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;text-align:left;white-space:nowrap}
td{padding:.85rem 1rem;border-top:1px solid var(--border);font-size:.84rem;color:var(--white);vertical-align:middle}
tbody tr{transition:var(--tr)}
tbody tr:hover td{background:rgba(255,255,255,0.02)}
.td-muted{color:var(--muted)}
.td-mono{font-family:'Courier New',monospace;font-size:.75rem;color:var(--muted)}
.td-actions{display:flex;gap:.4rem;align-items:center}

/* ── AGENDA CARDS ── */
.agenda-list{display:flex;flex-direction:column;gap:.5rem}
.agenda-card{
  background:var(--elevated);border:1px solid var(--border);border-radius:var(--radius);
  padding:1rem 1.25rem;display:grid;grid-template-columns:70px 1fr auto;
  gap:1rem;align-items:center;transition:var(--tr)
}
.agenda-card:hover{border-color:var(--border2);background:var(--hover)}
.agenda-card.status-cancelado{opacity:.45;filter:grayscale(.5)}
.agenda-time-block{text-align:center;border-right:1px solid var(--border);padding-right:1rem}
.agenda-hour{font-size:1.15rem;font-weight:700;color:var(--gold);letter-spacing:-.5px;line-height:1}
.agenda-end{font-size:.68rem;color:var(--muted);margin-top:.2rem}
.agenda-body .client-name{font-weight:600;font-size:.88rem;color:var(--white);margin-bottom:.2rem}
.agenda-body .service-name{font-size:.78rem;color:var(--muted);display:flex;align-items:center;gap:.3rem}
.agenda-body .barber-tag{
  display:inline-flex;align-items:center;font-size:.68rem;color:var(--muted2);
  background:var(--hover);border:1px solid var(--border);border-radius:4px;
  padding:.1rem .45rem;margin-top:.3rem
}
.agenda-aside{display:flex;flex-direction:column;align-items:flex-end;gap:.5rem}
.agenda-price{font-size:.95rem;font-weight:700;color:var(--green)}

/* ── PRODUCT CARDS ── */
.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.75rem}
.product-card{
  background:var(--elevated);border:1px solid var(--border);border-radius:var(--radius);
  padding:1.1rem 1.25rem;display:flex;flex-direction:column;transition:var(--tr)
}
.product-card:hover{border-color:var(--border2)}
.product-card.inactive{opacity:.45}
.product-name{font-weight:700;font-size:.9rem;color:var(--white);margin-bottom:.25rem;line-height:1.3}
.product-desc{font-size:.76rem;color:var(--muted);line-height:1.5;margin-bottom:.85rem;flex:1;min-height:2.5rem}
.product-price{font-size:1.1rem;font-weight:700;color:var(--gold);margin-bottom:.7rem}
.stock-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:.35rem}
.stock-label{font-size:.68rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.5px}
.stock-count{font-size:.8rem;font-weight:600}
.stock-count.zero{color:var(--red)}
.stock-count.low{color:var(--amber)}
.stock-count.ok{color:var(--green)}
.progress{height:4px;background:var(--hover);border-radius:2px;overflow:hidden;margin-bottom:.75rem}
.progress-fill{height:100%;border-radius:2px;transition:.3s}
.progress-fill.zero{background:var(--red);width:0!important}
.progress-fill.low{background:var(--amber)}
.progress-fill.ok{background:var(--green)}
.product-actions{display:flex;gap:.4rem;align-items:center;margin-top:.1rem}
.stock-input-wrap{display:flex;gap:.35rem;align-items:center;flex:1}
.stock-input-wrap input{text-align:center;padding:.38rem .5rem;font-size:.8rem}

/* ── SERVICE CARDS ── */
.service-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.75rem}
.service-card{
  background:var(--elevated);border:1px solid var(--border);border-radius:var(--radius);
  padding:1.1rem 1.25rem;transition:var(--tr)
}
.service-card:hover{border-color:var(--border2)}
.service-name{font-weight:600;font-size:.88rem;margin-bottom:.15rem}
.service-cat{
  display:inline-flex;align-items:center;font-size:.65rem;color:var(--muted2);
  background:var(--hover);border:1px solid var(--border);border-radius:4px;
  padding:.1rem .5rem;margin-bottom:.85rem;text-transform:uppercase;letter-spacing:.5px
}
.service-fields{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.65rem}
.field-label{font-size:.65rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.25rem}

/* ── FORM ── */
.form-card{background:var(--elevated);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;margin-bottom:1rem}
.form-card-title{font-size:.72rem;font-weight:600;color:var(--gold);text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem;padding-bottom:.6rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:.4rem}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}
.form-group{margin-bottom:.65rem}
.form-group:last-child{margin-bottom:0}
.form-label{display:block;font-size:.67rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.7px;margin-bottom:.3rem;font-weight:600}
.form-hint{font-size:.67rem;color:var(--muted2);margin-top:.3rem;display:flex;align-items:center;gap:.3rem}

/* ── CONFIG ── */
.config-section{background:var(--elevated);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:1rem}
.config-section-header{padding:.9rem 1.25rem;background:var(--hover);border-bottom:1px solid var(--border);font-size:.72rem;font-weight:600;color:var(--muted2);text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:.4rem}
.config-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:.9rem 1.25rem;border-bottom:1px solid var(--border);gap:1.5rem
}
.config-row:last-child{border-bottom:none}
.config-row:hover{background:rgba(255,255,255,.015)}
.config-meta .key{font-size:.88rem;font-weight:600;color:var(--white)}
.config-meta .desc{font-size:.76rem;color:var(--muted);margin-top:.2rem;line-height:1.4}
.config-ctrl{flex-shrink:0;width:220px}

/* ── AVATAR ── */
.avatar{
  width:30px;height:30px;border-radius:50%;background:var(--gold-dim);
  border:1px solid rgba(201,168,76,.25);display:flex;align-items:center;
  justify-content:center;font-size:.68rem;font-weight:700;color:var(--gold);
  flex-shrink:0;text-transform:uppercase;letter-spacing:.5px
}

/* ── ALERT ── */
.alert{padding:.7rem 1rem;border-radius:var(--radius-sm);font-size:.8rem;display:flex;align-items:center;gap:.5rem;margin-bottom:1rem}
.alert-success{background:var(--green-dim);border:1px solid rgba(34,197,94,.25);color:var(--green)}
.alert-error{background:var(--red-dim);border:1px solid rgba(239,68,68,.25);color:var(--red)}

/* ── SECTION HEADER ── */
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem}
.section-title{font-size:.88rem;font-weight:600;color:var(--white)}
.section-count{font-size:.72rem;color:var(--muted);background:var(--hover);border:1px solid var(--border);border-radius:20px;padding:.1rem .55rem}

/* ── EMPTY ── */
.empty{text-align:center;padding:3.5rem 1rem;color:var(--muted2)}
.empty-icon{font-size:2rem;opacity:.3;margin-bottom:.75rem}
.empty-text{font-size:.82rem}

/* ── CHART ── */
.chart-card{background:var(--elevated);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem}
.chart-title{font-size:.72rem;font-weight:600;color:var(--muted2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:1rem;display:flex;align-items:center;gap:.35rem}
.charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1.1rem}

/* ── DIVIDER ── */
hr{border:none;border-top:1px solid var(--border);margin:1.1rem 0}

/* ── TOAST ── */
.toast-container{position:fixed;bottom:1.5rem;right:1.5rem;z-index:999;display:flex;flex-direction:column;gap:.5rem}
.toast{
  background:var(--elevated);border:1px solid var(--border2);border-radius:var(--radius);
  padding:.7rem 1rem;font-size:.78rem;display:flex;align-items:center;gap:.5rem;
  box-shadow:0 8px 32px rgba(0,0,0,.5);min-width:240px;
  animation:toastIn .25s cubic-bezier(.34,1.56,.64,1)
}
.toast.success{border-color:rgba(34,197,94,.35);color:var(--green)}
.toast.error{border-color:rgba(239,68,68,.35);color:var(--red)}
@keyframes toastIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}

/* ── SCROLLBAR ── */
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

/* ── MOBILE ── */
@media(max-width:768px){
  .sidebar{display:none}
  .content{padding:1rem}
  .topbar{padding:1rem}
  .form-row{grid-template-columns:1fr}
  .stats{grid-template-columns:1fr 1fr}
  .charts-grid{grid-template-columns:1fr}
  .agenda-card{grid-template-columns:60px 1fr}
  .agenda-aside{display:none}
  .product-grid,.service-grid{grid-template-columns:1fr}
}
`

// ── Page Shell ─────────────────────────────────────────────────────
function shell(page, title, subtitle, body, script = '') {
  const nav = [
    { id:'agenda',      label:'Agenda',       icon:ic.cal },
    { id:'faturamento', label:'Faturamento',   icon:ic.money },
    { id:'clientes',    label:'Clientes',      icon:ic.users },
    { id:'estoque',     label:'Estoque',       icon:ic.box },
    { id:'servicos',    label:'Serviços',      icon:ic.cut },
    { id:'config',      label:'Config',        icon:ic.gear },
    { id:'aprovar-sinais', label:'Sinais Pix', icon:ic.money },
    { id:'eventos-bot', label:'Métricas',     icon:ic.chart },
  ]

  const navHtml = nav.map(n =>
    `<a href="/${SECRET}/${n.id}" class="nav-item ${page===n.id?'active':''}">${n.icon}<span>${n.label}</span></a>`
  ).join('')

  const hora = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' })
  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short', timeZone:'America/Sao_Paulo' })

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Andy Na Régua</title>
<style>${CSS}</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-mark">✦</div>
      <div class="logo-name">Andy Na Régua</div>
      <div class="logo-sub">Painel de Controle</div>
    </div>
    <nav class="nav">
      <div class="nav-label">Menu</div>
      ${navHtml}
</nav>
    <div class="sidebar-footer">
      <div class="pulse"></div>
      Online · ${hora} · ${dataHoje}
    </div>
  </aside>
  <div class="main">
    <div class="topbar">
      <div class="topbar-left">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>
      <div class="topbar-right" id="tbar"></div>
    </div>
    <div class="content">${body}</div>
  </div>
</div>
<div class="toast-container" id="toasts"></div>
<script>
function toast(msg,type='success'){
  const t=document.createElement('div')
  t.className='toast '+type
  t.innerHTML=(type==='success'?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>')+' '+msg
  document.getElementById('toasts').appendChild(t)
  setTimeout(()=>{t.style.animation='toastIn .2s reverse';setTimeout(()=>t.remove(),200)},3500)
}
${script}
</script>
</body></html>`
}

// ═══════════════════════════════════════════════════════════════
// ROTA: /agenda
// ═══════════════════════════════════════════════════════════════
router.get('/agenda', (req, res) => {
  const data        = req.query.data || hojeStr()
  const staffFilter = req.query.barbeiro || ''
  const ags         = getAgendamentosDia(data, staffFilter || null)
  const fat         = getFaturamentoDia(data)

  const dataLabel = new Date(data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
    weekday:'long', day:'2-digit', month:'long', year:'numeric', timeZone:'America/Sao_Paulo',
  })

  const staffOpts = staff.map(s =>
    `<option value="${s.id}" ${staffFilter===s.id?'selected':''}>${s.name}</option>`
  ).join('')

  const agendaCards = ags.length ? ags.map(ag => {
    const preco = ag.servico_preco || 0
    return `
    <div class="agenda-card status-${ag.status}">
      <div class="agenda-time-block">
        <div class="agenda-hour">${formatHora(ag.data_hora_inicio)}</div>
        <div class="agenda-end">até ${formatHora(ag.data_hora_fim)}</div>
      </div>
      <div class="agenda-body">
        <div class="client-name">${ag.nome_cliente || '<span style="color:var(--muted)">Sem nome</span>'}</div>
        <div class="service-name">${ag.servico_nome || ag.servico_id}${ag.no_show_count >= 2 ? ` <span style="color:var(--amber);font-size:.65rem">⚠ histórico no-show</span>` : ''}</div>
        <div class="barber-tag">${staffNameById(ag.staff_id)}</div>
      </div>
      <div class="agenda-aside">
        ${badge(ag.status)}
        <div class="agenda-price">R$ ${preco.toFixed(2)}</div>
        ${ag.status==='confirmado'?`
        <form method="POST" action="/${SECRET}/agenda/cancelar">
          <input type="hidden" name="id" value="${ag.id}">
          <input type="hidden" name="data" value="${data}">
          <button class="btn btn-danger btn-sm" type="submit" onclick="return confirm('Cancelar agendamento de ${ag.nome_cliente||'cliente'}?')">
            ${ic.trash} Cancelar
          </button>
        </form>`:''}
      </div>
    </div>`
  }).join('') : `<div class="empty"><div class="empty-icon">📅</div><div class="empty-text">Nenhum agendamento para este dia</div></div>`

  const body = `
  <div class="stats">
    <div class="stat">
      <div class="stat-icon gold">${ic.cal}</div>
      <div class="stat-val">${ags.length}</div>
      <div class="stat-lbl">Agendamentos</div>
      <div class="stat-accent"></div>
    </div>
    <div class="stat">
      <div class="stat-icon green">${ic.money}</div>
      <div class="stat-val">R$ ${fat.totalServicos.toFixed(0)}</div>
      <div class="stat-lbl">Em serviços</div>
      <div class="stat-accent green"></div>
    </div>
    <div class="stat">
      <div class="stat-icon blue">${ic.box}</div>
      <div class="stat-val">R$ ${fat.totalProdutos.toFixed(0)}</div>
      <div class="stat-lbl">Em produtos</div>
      <div class="stat-accent blue"></div>
    </div>
    <div class="stat">
      <div class="stat-icon amber">${ic.chart}</div>
      <div class="stat-val">R$ ${fat.totalGeral.toFixed(0)}</div>
      <div class="stat-lbl">Total do dia</div>
    </div>
  </div>

  <div class="toolbar">
    <div class="toolbar-group">
      <span class="toolbar-label">Data</span>
        <input type="date" id="dataInput" value="${data}">
      </div>
    <div class="toolbar-group">
      <span class="toolbar-label">Barbeiro</span>
        <select id="barbeiroInput">
        <option value="">Todos os barbeiros</option>
        ${staffOpts}
        </select>
      </div>
    <button class="btn btn-ghost" onclick="filtrar()">Filtrar</button>
    <a href="/${SECRET}/agenda/bloquear?data=${data}" class="btn btn-ghost">${ic.lock} Bloquear horário</a>
    </div>

  <div class="section-header">
    <span class="section-title" style="text-transform:capitalize">${dataLabel}</span>
    <span class="section-count">${ags.length} ${ags.length===1?'horário':'horários'}</span>
  </div>
  <div class="agenda-list">${agendaCards}</div>
  `

  const script = `
      function filtrar(){
        const d=document.getElementById('dataInput').value
        const b=document.getElementById('barbeiroInput').value
        window.location.href='/${SECRET}/agenda?data='+d+(b?'&barbeiro='+b:'')
      }
    document.getElementById('dataInput').addEventListener('keydown',e=>{if(e.key==='Enter')filtrar()})
    // Auto-refresh a cada 90s
    setTimeout(()=>location.reload(),90000)
  `

  res.send(shell('agenda', 'Agenda', dataLabel, body, script))
})

router.post('/agenda/cancelar', async (req, res) => {
  const { id, data } = req.body
  try {
    const ag = getDb().prepare('SELECT * FROM agendamentos WHERE id = ?').get(Number(id))
    if (ag) {
      cancelarAgendamento(ag.id, 'manual')
      if (ag.google_event_id) await deleteEvent(ag.staff_id, ag.google_event_id).catch(() => {})
      log(`Painel: agendamento #${ag.id} cancelado manualmente`)
    }
  } catch (e) { log('Erro ao cancelar:', e.message) }
  res.redirect(`/${SECRET}/agenda?data=${data || hojeStr()}`)
})

// ── Bloquear horário ─────────────────────────────────────────────
router.get('/agenda/bloquear', (req, res) => {
  const data    = req.query.data || hojeStr()
  const staffOpts = staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('')

  const body = `
  <a href="/${SECRET}/agenda?data=${data}" class="btn btn-ghost btn-sm" style="margin-bottom:1.25rem;display:inline-flex">${ic.back} Voltar à agenda</a>

  <div class="form-card" style="max-width:520px">
    <div class="form-card-title">${ic.lock} Bloquear horário</div>
      <form method="POST" action="/${SECRET}/agenda/bloquear">
        <div class="form-row">
          <div class="form-group">
          <label class="form-label">Data</label>
            <input type="date" name="data" value="${data}" required>
          </div>
          <div class="form-group">
          <label class="form-label">Barbeiro</label>
          <select name="staff_id" required>${staffOpts}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
          <label class="form-label">Início</label>
            <input type="time" name="inicio" required>
          </div>
          <div class="form-group">
          <label class="form-label">Fim</label>
            <input type="time" name="fim" required>
          </div>
        </div>
        <div class="form-group">
        <label class="form-label">Motivo</label>
        <input type="text" name="motivo" placeholder="Ex: Compromisso pessoal, Almoço...">
        <div class="form-hint">${ic.warn} Aparece como bloqueio no Google Calendar</div>
        </div>
      <div style="display:flex;gap:.5rem;margin-top:1rem">
        <button type="submit" class="btn btn-primary">${ic.check} Bloquear</button>
        <a href="/${SECRET}/agenda?data=${data}" class="btn btn-ghost">Cancelar</a>
      </div>
      </form>
    </div>`

  res.send(shell('agenda', 'Bloquear Horário', 'Adiciona bloqueio no Google Calendar do barbeiro', body))
})

router.post('/agenda/bloquear', async (req, res) => {
  const { data, staff_id, inicio, fim, motivo } = req.body
  try {
    await createEvent(staff_id, {
      summary:   `🔒 ${motivo || 'Indisponível'}`,
      description: 'Bloqueio via painel Andy Na Régua',
      startTime: `${data}T${inicio}:00-03:00`,
      endTime:   `${data}T${fim}:00-03:00`,
    })
    log(`Painel: bloqueio — ${staff_id} — ${data} ${inicio}–${fim}`)
  } catch (e) { log('Erro ao bloquear:', e.message) }
  res.redirect(`/${SECRET}/agenda?data=${data}`)
})

// ═══════════════════════════════════════════════════════════════
// ROTA: /faturamento
// ═══════════════════════════════════════════════════════════════
router.get('/faturamento', (req, res) => {
  const data = req.query.data || hojeStr()
  const fat  = getFaturamentoDia(data)
  const ags  = fat.agendamentos || []

  // Calcular dados para gráfico por barbeiro
  const porBarbeiro = {}
  for (const a of ags) {
    const nome = staffNameById(a.staff_id)
    if (!porBarbeiro[nome]) porBarbeiro[nome] = 0
    porBarbeiro[nome] += (a.servico_preco || 0)
  }

  // Últimos 7 dias para mini trend
  const trend = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const f  = getFaturamentoDia(ds)
    trend.push({ label: d.toLocaleDateString('pt-BR', { weekday:'short', timeZone:'America/Sao_Paulo' }), total: f.totalGeral })
  }

  const linhas = ags.length ? ags.map(ag => `
    <tr>
      <td>${formatHora(ag.data_hora_inicio)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:.6rem">
          <div class="avatar">${initials(ag.nome_cliente)}</div>
          <span>${ag.nome_cliente || '<span class="td-muted">—</span>'}</span>
        </div>
      </td>
      <td>${ag.servico_nome || ag.servico_id}</td>
      <td>${staffNameById(ag.staff_id)}</td>
      <td style="font-weight:600;color:var(--green)">R$ ${(ag.servico_preco||0).toFixed(2)}</td>
      <td>${badge(ag.status)}</td>
    </tr>`).join('') : `<tr><td colspan="6"><div class="empty"><div class="empty-icon">💰</div><div class="empty-text">Sem movimentação neste dia</div></div></td></tr>`

  const body = `
  <div class="toolbar" style="margin-bottom:1.25rem">
    <div class="toolbar-group">
      <span class="toolbar-label">Data</span>
        <input type="date" id="dataInput" value="${data}">
      </div>
    <button class="btn btn-ghost" onclick="window.location.href='/${SECRET}/faturamento?data='+document.getElementById('dataInput').value">Ver</button>
    </div>

  <div class="stats" style="margin-bottom:1.25rem">
    <div class="stat">
      <div class="stat-icon green">${ic.money}</div>
      <div class="stat-val green">R$ ${fat.totalServicos.toFixed(2)}</div>
      <div class="stat-lbl">Serviços</div>
      <div class="stat-accent green"></div>
    </div>
    <div class="stat">
      <div class="stat-icon blue">${ic.box}</div>
      <div class="stat-val" style="color:var(--blue)">R$ ${fat.totalProdutos.toFixed(2)}</div>
      <div class="stat-lbl">Produtos</div>
      <div class="stat-accent blue"></div>
    </div>
    <div class="stat">
      <div class="stat-icon gold">${ic.chart}</div>
      <div class="stat-val">R$ ${fat.totalGeral.toFixed(2)}</div>
      <div class="stat-lbl">Total do dia</div>
      <div class="stat-accent"></div>
    </div>
    <div class="stat">
      <div class="stat-icon amber">${ic.users}</div>
      <div class="stat-val">${ags.length}</div>
      <div class="stat-lbl">Atendimentos</div>
    </div>
  </div>

  <div class="charts-grid">
    <div class="chart-card">
      <div class="chart-title">${ic.chart} Serviços × Produtos</div>
      <canvas id="chartPie" height="180"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">${ic.chart} Últimos 7 dias</div>
      <canvas id="chartBar" height="180"></canvas>
    </div>
  </div>

  <div class="section-header">
    <span class="section-title">Detalhamento</span>
    <span class="section-count">${ags.length} registros</span>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Hora</th><th>Cliente</th><th>Serviço</th><th>Barbeiro</th><th>Valor</th><th>Status</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>`

  const trendLabels = JSON.stringify(trend.map(t => t.label))
  const trendData   = JSON.stringify(trend.map(t => t.total))
  const barberLabels = JSON.stringify(Object.keys(porBarbeiro))
  const barberData   = JSON.stringify(Object.values(porBarbeiro))

  const script = `
  const chartDefaults = {
    color:'#999',
    borderColor:'rgba(255,255,255,0.06)',
    plugins:{ legend:{ labels:{ color:'#999', font:{ size:11, family:'Inter' }, boxWidth:10, padding:12 } } },
    scales:{ x:{ ticks:{ color:'#666', font:{size:10} }, grid:{ color:'rgba(255,255,255,0.04)' } }, y:{ ticks:{ color:'#666', font:{size:10}, callback:v=>'R$'+v }, grid:{ color:'rgba(255,255,255,0.04)' } } }
  }
  const s=document.createElement('script')
  s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
  s.onload=()=>{
    const g='rgba(201,168,76,'
    new Chart(document.getElementById('chartPie'),{
      type:'doughnut',
      data:{
        labels:['Serviços','Produtos'],
        datasets:[{data:[${fat.totalServicos},${fat.totalProdutos}],backgroundColor:[g+'.8)',g+'.25)'],borderColor:[g+'1)','rgba(255,255,255,.1)'],borderWidth:1}]
      },
      options:{cutout:'70%',plugins:{legend:{position:'bottom',labels:{color:'#999',font:{size:11,family:'Inter'},boxWidth:10,padding:12}}}}
    })
    new Chart(document.getElementById('chartBar'),{
      type:'bar',
      data:{
        labels:${trendLabels},
        datasets:[{label:'Faturamento',data:${trendData},backgroundColor:g+'.6)',borderColor:g+'1)',borderWidth:1,borderRadius:4}]
      },
      options:{...chartDefaults,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#666',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#666',font:{size:10},callback:v=>'R$'+v},grid:{color:'rgba(255,255,255,.04)'}}}}
    })
  }
  document.head.appendChild(s)
  `

  res.send(shell('faturamento', 'Faturamento', `Relatório de ${formatData(data + 'T12:00:00-03:00')}`, body, script))
})

// ═══════════════════════════════════════════════════════════════
// ROTA: /clientes
// ═══════════════════════════════════════════════════════════════
router.get('/clientes', (req, res) => {
  const busca = req.query.q || ''
  let clientes
  if (busca) {
    clientes = getDb().prepare(`SELECT * FROM clientes WHERE nome LIKE ? OR whatsapp_number LIKE ? ORDER BY updated_at DESC LIMIT 80`).all(`%${busca}%`, `%${busca}%`)
  } else {
    clientes = getDb().prepare(`SELECT * FROM clientes ORDER BY updated_at DESC LIMIT 80`).all()
  }

  const linhas = clientes.length ? clientes.map(c => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:.65rem">
          <div class="avatar">${initials(c.nome)}</div>
          <div>
            <div style="font-weight:500">${c.nome || '<span class="td-muted">Sem nome</span>'}</div>
            ${c.no_show_count >= 2 ? `<div style="font-size:.67rem;color:var(--amber);margin-top:.1rem">⚠ Confirmação rigorosa</div>` : ''}
          </div>
        </div>
      </td>
      <td class="td-mono">${c.whatsapp_number.replace('@c.us','')}</td>
      <td>
        <span style="font-weight:600;color:${c.no_show_count>=2?'var(--red)':c.no_show_count>0?'var(--amber)':'var(--muted)'}">${c.no_show_count || 0}</span>
      </td>
      <td>${c.lgpd_aceito?`<span style="color:var(--green);font-size:.75rem">Aceito</span>`:`<span class="td-muted" style="font-size:.75rem">Pendente</span>`}</td>
      <td class="td-muted">${formatData(c.created_at)}</td>
      <td>
        <a href="/${SECRET}/clientes/${encodeURIComponent(c.whatsapp_number)}" class="btn btn-ghost btn-sm">Ver histórico</a>
      </td>
    </tr>`).join('') : `<tr><td colspan="6"><div class="empty"><div class="empty-icon">👥</div><div class="empty-text">${busca?'Nenhum cliente encontrado':'Nenhum cliente cadastrado ainda'}</div></div></td></tr>`

  const body = `
  <div class="toolbar">
    <div class="toolbar-group">
      <span class="toolbar-label">Buscar</span>
      <input type="text" id="busca" value="${busca}" placeholder="Nome ou número WhatsApp...">
      </div>
    <button class="btn btn-ghost" onclick="window.location.href='/${SECRET}/clientes?q='+encodeURIComponent(document.getElementById('busca').value)">Buscar</button>
    </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Cliente</th><th>WhatsApp</th><th>No-shows</th><th>LGPD</th><th>Desde</th><th>Ação</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>`

  const script = `document.getElementById('busca').addEventListener('keydown',e=>{if(e.key==='Enter')window.location.href='/${SECRET}/clientes?q='+encodeURIComponent(e.target.value)})`

  res.send(shell('clientes', 'Clientes', `${clientes.length} cadastrados`, body, script))
})

router.get('/clientes/:numero', (req, res) => {
  const numero    = decodeURIComponent(req.params.numero)
  const cliente   = getDb().prepare('SELECT * FROM clientes WHERE whatsapp_number = ?').get(numero)
  if (!cliente) return res.redirect(`/${SECRET}/clientes`)

  const historico = getHistoricoCliente(numero)
  const totalGasto = historico.reduce((s, a) => s + (a.servico_preco || 0), 0)
  const concluidos = historico.filter(a => a.status === 'concluido' || a.status === 'confirmado').length

  const linhas = historico.length ? historico.map(ag => `
    <tr>
      <td>${formatData(ag.data_hora_inicio)} <span class="td-muted">${formatHora(ag.data_hora_inicio)}</span></td>
      <td>${ag.servico_id}</td>
      <td>${staffNameById(ag.staff_id)}</td>
      <td>${badge(ag.status)}</td>
    </tr>`).join('') : `<tr><td colspan="4"><div class="empty"><div class="empty-text">Sem agendamentos registrados</div></div></td></tr>`

  const body = `
  <a href="/${SECRET}/clientes" class="btn btn-ghost btn-sm" style="margin-bottom:1.25rem;display:inline-flex">${ic.back} Voltar</a>

  <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
    <div class="avatar" style="width:48px;height:48px;font-size:1rem">${initials(cliente.nome)}</div>
    <div>
      <div style="font-size:1.1rem;font-weight:600">${cliente.nome || 'Cliente sem nome'}</div>
      <div class="td-mono" style="margin-top:.2rem">${cliente.whatsapp_number.replace('@c.us','')}</div>
    </div>
  </div>

  <div class="stats" style="margin-bottom:1.5rem">
    <div class="stat">
      <div class="stat-icon gold">${ic.cal}</div>
      <div class="stat-val">${historico.length}</div>
      <div class="stat-lbl">Agendamentos</div>
    </div>
    <div class="stat">
      <div class="stat-icon green">${ic.money}</div>
      <div class="stat-val">R$ ${totalGasto.toFixed(0)}</div>
      <div class="stat-lbl">Total gasto</div>
      <div class="stat-accent green"></div>
    </div>
    <div class="stat">
      <div class="stat-icon ${cliente.no_show_count>=2?'amber':'blue'}">${ic.warn}</div>
      <div class="stat-val" style="color:${cliente.no_show_count>=2?'var(--amber)':'var(--white)'}">${cliente.no_show_count||0}</div>
      <div class="stat-lbl">No-shows</div>
    </div>
  </div>

  <div class="section-header">
    <span class="section-title">Histórico de agendamentos</span>
    <span class="section-count">${historico.length}</span>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Data / Hora</th><th>Serviço</th><th>Barbeiro</th><th>Status</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>`

  res.send(shell('clientes', cliente.nome || 'Cliente', 'Histórico completo', body))
})

// ═══════════════════════════════════════════════════════════════
// ROTA: /estoque
// ═══════════════════════════════════════════════════════════════
router.get('/estoque', (req, res) => {
  const msg      = req.query.msg || ''
  const editId   = req.query.editar || ''
  const produtos = getDb().prepare('SELECT * FROM produtos ORDER BY nome').all()
  const totalItens  = produtos.reduce((s, p) => s + p.estoque, 0)
  const semEstoque  = produtos.filter(p => p.estoque === 0 && p.ativo).length

  const editando = editId ? getDb().prepare('SELECT * FROM produtos WHERE id = ?').get(editId) : null

  const formNovo = `
  <div class="form-card" style="margin-bottom:1.25rem">
    <div class="form-card-title">${ic.plus} Adicionar novo produto</div>
    <form method="POST" action="/${SECRET}/estoque/criar">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome do produto *</label>
          <input type="text" name="nome" required placeholder="Ex: Pomada Efeito Matte">
        </div>
        <div class="form-group">
          <label class="form-label">Preço (R$) *</label>
          <input type="number" name="preco" required min="0" step="0.01" placeholder="45.00">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input type="text" name="descricao" placeholder="Breve descrição do produto (aparece no upsell do bot)">
      </div>
      <div style="margin-top:.5rem">
        <button type="submit" class="btn btn-primary">${ic.plus} Adicionar produto</button>
      </div>
    </form>
  </div>`

  const formEditar = editando ? `
  <div class="form-card" style="margin-bottom:1.25rem;border-color:var(--gold);box-shadow:0 0 0 1px var(--gold-dim)">
    <div class="form-card-title" style="color:var(--gold-l)">${ic.check} Editando: ${editando.nome}</div>
    <form method="POST" action="/${SECRET}/estoque/editar">
      <input type="hidden" name="id" value="${editando.id}">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome</label>
          <input type="text" name="nome" value="${editando.nome}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Preço (R$)</label>
          <input type="number" name="preco" value="${editando.preco}" min="0" step="0.01" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input type="text" name="descricao" value="${editando.descricao || ''}">
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.5rem">
        <button type="submit" class="btn btn-primary">${ic.check} Salvar alterações</button>
        <a href="/${SECRET}/estoque" class="btn btn-ghost">Cancelar</a>
      </div>
    </form>
  </div>` : ''

  const cards = produtos.map(p => {
    const maxStock = 20
    const pct      = Math.min((p.estoque / maxStock) * 100, 100)
    const cls      = p.estoque === 0 ? 'zero' : p.estoque <= 3 ? 'low' : 'ok'

    return `
    <div class="product-card ${!p.ativo?'inactive':''}" ${editId===p.id?'style="border-color:var(--gold)"':''}>
      <div class="product-name">${p.nome}</div>
      <div class="product-desc">${p.descricao||'—'}</div>
      <div class="product-price">R$ ${p.preco.toFixed(2)}</div>
      <div class="stock-row">
        <span class="stock-label">Estoque</span>
        <span class="stock-count ${cls}">${p.estoque} un.</span>
      </div>
      <div class="progress">
        <div class="progress-fill ${cls}" style="width:${pct}%"></div>
      </div>
      <div class="product-actions">
        <form method="POST" action="/${SECRET}/estoque/atualizar" style="display:flex;gap:.35rem;flex:1">
          <input type="hidden" name="id" value="${p.id}">
          <input type="number" name="estoque" value="${p.estoque}" min="0" style="width:70px">
          <button class="btn btn-primary btn-sm" type="submit">${ic.check}</button>
        </form>
      </div>
      <div style="display:flex;gap:.35rem;margin-top:.4rem">
        <a href="/${SECRET}/estoque?editar=${p.id}" class="btn btn-ghost btn-sm" style="flex:1;justify-content:center">Editar</a>
        <form method="POST" action="/${SECRET}/estoque/toggle" style="flex:1">
          <input type="hidden" name="id" value="${p.id}">
          <input type="hidden" name="ativo" value="${p.ativo?'0':'1'}">
          <button class="btn btn-ghost btn-sm" type="submit" style="width:100%">${p.ativo?'Desativar':'Ativar'}</button>
        </form>
        <form method="POST" action="/${SECRET}/estoque/deletar" style="flex:0">
          <input type="hidden" name="id" value="${p.id}">
          <button class="btn btn-danger btn-sm" type="submit" onclick="return confirm('Excluir ${p.nome.replace(/'/g,"\\'")}? Essa ação não pode ser desfeita.')">${ic.trash}</button>
        </form>
      </div>
    </div>`
  }).join('')

  const body = `
  ${msg==='ok'?`<div class="alert alert-success">${ic.check} Operação realizada com sucesso!</div>`:''}
  ${msg==='err'?`<div class="alert alert-error">${ic.warn} Erro ao processar. Tente novamente.</div>`:''}
  ${semEstoque>0?`<div class="alert alert-error">${ic.warn} ${semEstoque} produto${semEstoque>1?'s':''} sem estoque — não aparece${semEstoque>1?'m':''} no upsell do bot</div>`:''}

  <div class="stats" style="margin-bottom:1.25rem">
    <div class="stat">
      <div class="stat-icon gold">${ic.box}</div>
      <div class="stat-val">${produtos.length}</div>
      <div class="stat-lbl">Produtos</div>
    </div>
    <div class="stat">
      <div class="stat-icon green">${ic.chart}</div>
      <div class="stat-val">${totalItens}</div>
      <div class="stat-lbl">Total em estoque</div>
      <div class="stat-accent green"></div>
    </div>
    <div class="stat">
      <div class="stat-icon ${semEstoque>0?'amber':'blue'}">${ic.warn}</div>
      <div class="stat-val" style="color:${semEstoque>0?'var(--amber)':'var(--muted)'}">${semEstoque}</div>
      <div class="stat-lbl">Sem estoque</div>
    </div>
  </div>

  ${formEditar}
  ${formNovo}

  <div class="section-header">
    <span class="section-title">Produtos cadastrados</span>
    <span class="section-count">${produtos.length} itens</span>
  </div>
  <div class="product-grid">${cards}</div>`

  res.send(shell('estoque', 'Estoque', 'Gerencie produtos e upsell automático', body))
})

router.post('/estoque/atualizar', (req, res) => {
  const { id, estoque } = req.body
  atualizarEstoque(id, Number(estoque))
  res.redirect(`/${SECRET}/estoque?msg=ok`)
})

router.post('/estoque/toggle', (req, res) => {
  const { id, ativo } = req.body
  getDb().prepare(`UPDATE produtos SET ativo = ?, updated_at = datetime('now') WHERE id = ?`).run(Number(ativo), id)
  res.redirect(`/${SECRET}/estoque`)
})

router.post('/estoque/criar', (req, res) => {
  try {
    const { nome, preco, descricao } = req.body
    if (!nome || !preco) return res.redirect(`/${SECRET}/estoque?msg=err`)
    criarProduto({ nome: nome.trim(), preco: Number(preco), descricao: (descricao||'').trim() })
    log(`Painel: produto criado — ${nome}`)
    res.redirect(`/${SECRET}/estoque?msg=ok`)
  } catch (e) {
    log('Erro ao criar produto:', e.message)
    res.redirect(`/${SECRET}/estoque?msg=err`)
  }
})

router.post('/estoque/editar', (req, res) => {
  try {
    const { id, nome, preco, descricao } = req.body
    updateProduto(id, { nome: nome.trim(), preco: Number(preco), descricao: (descricao||'').trim() })
    log(`Painel: produto editado — ${id}`)
    res.redirect(`/${SECRET}/estoque?msg=ok`)
  } catch (e) {
    log('Erro ao editar produto:', e.message)
    res.redirect(`/${SECRET}/estoque?msg=err`)
  }
})

router.post('/estoque/deletar', (req, res) => {
  try {
    const { id } = req.body
    deletarProduto(id)
    log(`Painel: produto deletado — ${id}`)
    res.redirect(`/${SECRET}/estoque?msg=ok`)
  } catch (e) {
    log('Erro ao deletar produto:', e.message)
    res.redirect(`/${SECRET}/estoque?msg=err`)
  }
})

// ═══════════════════════════════════════════════════════════════
// ROTA: /servicos
// ═══════════════════════════════════════════════════════════════
router.get('/servicos', (req, res) => {
  const msg      = req.query.msg || ''
  const editId   = req.query.editar || ''
  const servicos = getServicosAtivos()

  const editando = editId ? getServicoById(editId) : null

  const catColors = { cabelo:'var(--blue)', barba:'var(--amber)', estetica:'var(--green)' }
  const catOpts   = ['cabelo','barba','estetica'].map(c => `<option value="${c}">${c}</option>`).join('')

  const formNovo = `
  <div class="form-card" style="margin-bottom:1.25rem">
    <div class="form-card-title">${ic.plus} Adicionar novo serviço</div>
    <form method="POST" action="/${SECRET}/servicos/criar">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome do serviço *</label>
          <input type="text" name="nome" required placeholder="Ex: Platinado c/ Corte">
        </div>
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select name="categoria">${catOpts}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Preço (R$) *</label>
          <input type="number" name="preco" required min="0" step="0.01" placeholder="80.00">
        </div>
        <div class="form-group">
          <label class="form-label">Duração (min) *</label>
          <input type="number" name="duracao" required min="5" step="5" placeholder="60">
        </div>
      </div>
      <button type="submit" class="btn btn-primary">${ic.plus} Adicionar serviço</button>
    </form>
  </div>`

  const formEditar = editando ? `
  <div class="form-card" style="margin-bottom:1.25rem;border-color:var(--gold);box-shadow:0 0 0 1px var(--gold-dim)">
    <div class="form-card-title" style="color:var(--gold-l)">${ic.check} Editando: ${editando.nome}</div>
    <form method="POST" action="/${SECRET}/servicos/editar">
      <input type="hidden" name="id" value="${editando.id}">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome</label>
          <input type="text" name="nome" value="${editando.nome}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select name="categoria">
            ${['cabelo','barba','estetica'].map(c=>`<option value="${c}" ${editando.categoria===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Preço (R$)</label>
          <input type="number" name="preco" value="${editando.preco}" min="0" step="0.01" required>
        </div>
        <div class="form-group">
          <label class="form-label">Duração (min)</label>
          <input type="number" name="duracao" value="${editando.duracao_minutos}" min="5" step="5" required>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.5rem">
        <button type="submit" class="btn btn-primary">${ic.check} Salvar alterações</button>
        <a href="/${SECRET}/servicos" class="btn btn-ghost">Cancelar</a>
      </div>
    </form>
  </div>` : ''

  const cards = servicos.map(s => {
    const cor = catColors[s.categoria] || 'var(--muted2)'
    return `
    <div class="service-card" ${editId===s.id?'style="border-color:var(--gold)"':''}>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.25rem">
        <div class="service-name">${s.nome}</div>
      </div>
      <div class="service-cat" style="color:${cor};background:${cor}18;border-color:${cor}33">${s.categoria}</div>
      <div class="service-fields">
        <div>
          <div class="field-label">Preço</div>
          <div style="font-size:1rem;font-weight:700;color:var(--gold)">R$ ${s.preco.toFixed(2)}</div>
        </div>
        <div>
          <div class="field-label">Duração</div>
          <div style="font-size:1rem;font-weight:700;color:var(--white)">${s.duracao_minutos} min</div>
        </div>
      </div>
      <div style="display:flex;gap:.35rem;margin-top:.5rem">
        <a href="/${SECRET}/servicos?editar=${s.id}" class="btn btn-ghost btn-sm" style="flex:1;justify-content:center">Editar</a>
        <form method="POST" action="/${SECRET}/servicos/deletar">
          <input type="hidden" name="id" value="${s.id}">
          <button class="btn btn-danger btn-sm" type="submit" onclick="return confirm('Excluir o serviço ${s.nome.replace(/'/g,"\\'")}?')">${ic.trash}</button>
        </form>
      </div>
    </div>`
  }).join('')

  const body = `
  ${msg==='ok'?`<div class="alert alert-success">${ic.check} Operação realizada com sucesso! Reflete imediatamente no bot.</div>`:''}
  ${msg==='err'?`<div class="alert alert-error">${ic.warn} Erro ao processar. Tente novamente.</div>`:''}
  <div class="form-hint" style="margin-bottom:1.25rem;font-size:.8rem;color:var(--muted)">
    ${ic.warn} Qualquer alteração reflete imediatamente nas respostas do bot e no cálculo de horários do calendário.
  </div>
  ${formEditar}
  ${formNovo}
  <div class="section-header">
    <span class="section-title">Serviços ativos</span>
    <span class="section-count">${servicos.length} serviços</span>
  </div>
  <div class="service-grid">${cards}</div>`

  res.send(shell('servicos', 'Serviços', 'Preços e durações editáveis', body))
})

router.post('/servicos/atualizar', (req, res) => {
  const { id, preco, duracao } = req.body
  updateServico(id, { preco: Number(preco), duracao_minutos: Number(duracao) })
  res.redirect(`/${SECRET}/servicos?msg=ok`)
})

router.post('/servicos/criar', (req, res) => {
  try {
    const { nome, preco, duracao, categoria } = req.body
    if (!nome || !preco || !duracao) return res.redirect(`/${SECRET}/servicos?msg=err`)
    criarServico({ nome: nome.trim(), preco: Number(preco), duracao_minutos: Number(duracao), categoria: categoria || 'cabelo' })
    log(`Painel: serviço criado — ${nome}`)
    res.redirect(`/${SECRET}/servicos?msg=ok`)
  } catch (e) {
    log('Erro ao criar serviço:', e.message)
    res.redirect(`/${SECRET}/servicos?msg=err`)
  }
})

router.post('/servicos/editar', (req, res) => {
  try {
    const { id, nome, preco, duracao, categoria } = req.body
    updateServico(id, { nome: nome.trim(), preco: Number(preco), duracao_minutos: Number(duracao) })
    if (categoria) getDb().prepare(`UPDATE servicos SET categoria = ? WHERE id = ?`).run(categoria, id)
    log(`Painel: serviço editado — ${id}`)
    res.redirect(`/${SECRET}/servicos?msg=ok`)
  } catch (e) {
    log('Erro ao editar serviço:', e.message)
    res.redirect(`/${SECRET}/servicos?msg=err`)
  }
})

router.post('/servicos/deletar', (req, res) => {
  try {
    const { id } = req.body
    deletarServico(id)
    log(`Painel: serviço deletado — ${id}`)
    res.redirect(`/${SECRET}/servicos?msg=ok`)
  } catch (e) {
    log('Erro ao deletar serviço:', e.message)
    res.redirect(`/${SECRET}/servicos?msg=err`)
  }
})

// ═══════════════════════════════════════════════════════════════
// ROTA: /config
// ═══════════════════════════════════════════════════════════════
function configLabel(chave) {
  const labels = {
    notificacoes_ativas:          'Notificações para o Andy',
    andy_phone:                   'WhatsApp pessoal do Andy',
    barbearia_phone:              'WhatsApp da barbearia',
    antecedencia_minima_minutos:  'Antecedência mínima para agendamento',
    max_mensagens_ativas_dia:     'Limite de mensagens proativas por dia',
    horario_abertura:             'Horário de abertura',
    horario_fechamento:           'Horário de fechamento',
    horario_almoco_inicio:        'Início do intervalo de almoço',
    horario_almoco_fim:           'Fim do intervalo de almoço',
  }
  return labels[chave] || chave.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

router.get('/config', (req, res) => {
  const msg     = req.query.msg || ''
  const configs = getAllConfigs()

  const grupos = {
    'Notificações':   ['notificacoes_ativas', 'andy_phone', 'barbearia_phone'],
    'Agendamento':    ['antecedencia_minima_minutos', 'max_mensagens_ativas_dia'],
    'Horário de Funcionamento': ['horario_abertura', 'horario_fechamento', 'horario_almoco_inicio', 'horario_almoco_fim'],
  }

  const configMap = {}
  for (const c of configs) configMap[c.chave] = c

  let sections = ''
  for (const [grupo, chaves] of Object.entries(grupos)) {
    const rows = chaves.map(chave => {
      const c = configMap[chave]
      if (!c) return ''
      const isPhone = chave.includes('phone')
      const isBool  = chave === 'notificacoes_ativas'
      let control = ''
      if (isBool) {
        control = `
          <div style="display:flex;align-items:center;gap:.5rem">
            <select name="${c.chave}" style="width:auto">
              <option value="1" ${c.valor==='1'?'selected':''}>Ativado</option>
              <option value="0" ${c.valor==='0'?'selected':''}>Desativado</option>
            </select>
          </div>`
      } else {
        control = `<input type="text" name="${c.chave}" value="${c.valor}" placeholder="${isPhone?'5547999999999@c.us':''}">`
      }
      return `
        <div class="config-row">
          <div class="config-meta">
            <div class="key">${configLabel(c.chave)}</div>
            <div class="desc">${c.descricao || ''}</div>
      </div>
          <div class="config-ctrl">${control}</div>
        </div>`
    }).join('')

    sections += `
    <div class="config-section">
      <div class="config-section-header">${ic.gear} ${grupo}</div>
      ${rows}
    </div>`
  }

  // Configs restantes (não mapeadas nos grupos)
  const mapeadas = Object.values(grupos).flat()
  const extras   = configs.filter(c => !mapeadas.includes(c.chave))
  if (extras.length) {
    const rows = extras.map(c => `
      <div class="config-row">
        <div class="config-meta">
          <div class="key">${c.chave}</div>
          <div class="desc">${c.descricao || ''}</div>
        </div>
        <div class="config-ctrl"><input type="text" name="${c.chave}" value="${c.valor}"></div>
      </div>`).join('')
    sections += `<div class="config-section"><div class="config-section-header">${ic.gear} Outros</div>${rows}</div>`
  }

  const body = `
  ${msg==='ok'?`<div class="alert alert-success">${ic.check} Configurações salvas com sucesso!</div>`:''}
  <form method="POST" action="/${SECRET}/config">
    ${sections}
    <div style="margin-top:1.25rem">
      <button type="submit" class="btn btn-primary">${ic.check} Salvar configurações</button>
    </div>
  </form>`

  res.send(shell('config', 'Configurações', 'Parâmetros do sistema e notificações', body))
})

router.post('/config', express.urlencoded({ extended: true }), (req, res) => {
  const configs = getAllConfigs()
  for (const c of configs) {
    if (req.body[c.chave] !== undefined) setConfig(c.chave, req.body[c.chave])
  }
  log('Painel: configurações atualizadas')
  res.redirect(`/${SECRET}/config?msg=ok`)
})

// ═══════════════════════════════════════════════════════════════
// ROTA: /aprovar-sinais
// ═══════════════════════════════════════════════════════════════
router.get('/aprovar-sinais', (req, res) => {
  const msg = req.query.msg || ''
  const pendentes = getAgendamentosAguardandoSinal()

  const linhas = pendentes.length ? pendentes.map(a => `
    <tr>
      <td>${a.nome_cliente || a.whatsapp_number}</td>
      <td>R$ ${(a.sinal_valor || 0).toFixed(2)}</td>
      <td class="td-muted">${a.sinal_pago_at || '—'}</td>
      <td>${a.sinal_comprovante ? `<a href="${a.sinal_comprovante}" target="_blank" class="btn btn-ghost btn-sm">Ver</a>` : '—'}</td>
      <td>
        <form method="POST" action="/${SECRET}/aprovar-sinais/${a.id}">
          <button type="submit" class="btn btn-primary btn-sm">${ic.check} Aprovar</button>
        </form>
      </td>
    </tr>`).join('') : `<tr><td colspan="5"><div class="empty"><div class="empty-text">Nenhum sinal aguardando aprovação</div></div></td></tr>`

  const body = `
  ${msg==='ok'?`<div class="alert alert-success">${ic.check} Sinal aprovado — cliente será notificado na fila.</div>`:''}
  <div class="table-wrap">
    <table>
      <thead><tr><th>Cliente</th><th>Valor</th><th>Recebido</th><th>Comprovante</th><th>Ação</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>
  <p class="form-hint" style="margin-top:1rem">Andy também pode aprovar pelo WhatsApp: <code>OK [id]</code></p>`

  res.send(shell('aprovar-sinais', 'Sinais Pix', `${pendentes.length} aguardando aprovação`, body))
})

router.post('/aprovar-sinais/:id', async (req, res) => {
  const id = Number(req.params.id)
  aprovarSinal(id)
  const ag = getAgendamento(id)
  if (ag) {
    const horaLabel = new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    const dataLabel = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
    enfileirarMensagem(ag.whatsapp_number, M.sinalAprovado({ hora: horaLabel, dataLabel, barbeiro: staffNameById(ag.staff_id), servico: ag.servico_id }), 'critica')
    log(`Painel: sinal aprovado — agendamento #${id}`)
  }
  res.redirect(`/${SECRET}/aprovar-sinais?msg=ok`)
})

// ═══════════════════════════════════════════════════════════════
// ROTA: /eventos-bot
// ═══════════════════════════════════════════════════════════════
router.get('/eventos-bot', (req, res) => {
  const metricas = getMetricasDiarias(14)
  const hoje = new Date().toISOString().slice(0, 10)

  const eventosHoje = getDb().prepare(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(tokens_input), 0) AS ti,
      COALESCE(SUM(tokens_output), 0) AS to_,
      SUM(CASE WHEN precisou_handoff = 1 THEN 1 ELSE 0 END) AS handoffs,
      SUM(CASE WHEN conversa_resolveu_agendamento = 1 THEN 1 ELSE 0 END) AS agendamentos
    FROM eventos_bot WHERE date(created_at) = ?
  `).get(hoje)

  const linhas = metricas.length ? metricas.map(m => `
    <tr>
      <td>${m.data}</td>
      <td>${m.total_msgs_entrada}</td>
      <td>${m.total_msgs_saida}</td>
      <td>${m.total_conversas_unicas}</td>
      <td>${m.total_agendamentos}</td>
      <td>${m.total_handoffs}</td>
      <td class="td-mono">${m.tokens_input_total + m.tokens_output_total}</td>
    </tr>`).join('') : `<tr><td colspan="7"><div class="empty"><div class="empty-text">Sem métricas agregadas ainda (job de limpeza roda às 3h)</div></div></td></tr>`

  const body = `
  <div class="stats" style="margin-bottom:1.25rem">
    <div class="stat">
      <div class="stat-icon gold">${ic.chart}</div>
      <div class="stat-val">${eventosHoje?.total || 0}</div>
      <div class="stat-lbl">Respostas bot hoje</div>
    </div>
    <div class="stat">
      <div class="stat-icon green">${ic.cal}</div>
      <div class="stat-val">${eventosHoje?.agendamentos || 0}</div>
      <div class="stat-lbl">Agendamentos via bot</div>
    </div>
    <div class="stat">
      <div class="stat-icon amber">${ic.warn}</div>
      <div class="stat-val">${eventosHoje?.handoffs || 0}</div>
      <div class="stat-lbl">Handoffs hoje</div>
    </div>
    <div class="stat">
      <div class="stat-icon blue">${ic.money}</div>
      <div class="stat-val">${((eventosHoje?.ti || 0) + (eventosHoje?.to || 0))}</div>
      <div class="stat-lbl">Tokens hoje</div>
    </div>
  </div>
  <div class="section-header">
    <span class="section-title">Métricas diárias (últimos 14 dias)</span>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Data</th><th>Msgs entrada</th><th>Msgs saída</th><th>Conversas</th><th>Agendamentos</th><th>Handoffs</th><th>Tokens</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>`

  res.send(shell('eventos-bot', 'Métricas do Bot', 'Telemetria e uso de tokens', body))
})

// Redirect raiz → agenda
router.get('/', (req, res) => res.redirect(`/${SECRET}/agenda`))

export { router as panelRouter, SECRET }
