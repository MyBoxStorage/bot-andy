// Ícones SVG limpos — stroke 1.8 conforme briefing
const Icon = ({ d, size = 18, fill = 'none', stroke = 'currentColor', sw = 1.8, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

const IconScissors = (p) => (
  <Icon size={p.size || 18}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </Icon>
);
const IconCalendar = (p) => (
  <Icon size={p.size || 18}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <line x1="3" y1="9.5" x2="21" y2="9.5" />
    <line x1="8" y1="3" x2="8" y2="6" />
    <line x1="16" y1="3" x2="16" y2="6" />
  </Icon>
);
const IconChart = (p) => (
  <Icon size={p.size || 18}>
    <line x1="4" y1="20" x2="4" y2="10" />
    <line x1="10" y1="20" x2="10" y2="4" />
    <line x1="16" y1="20" x2="16" y2="14" />
    <line x1="22" y1="20" x2="2" y2="20" />
  </Icon>
);
const IconBox = (p) => (
  <Icon size={p.size || 18}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
    <line x1="3" y1="8" x2="12" y2="13" />
    <line x1="21" y1="8" x2="12" y2="13" />
    <line x1="12" y1="13" x2="12" y2="21" />
  </Icon>
);
const IconUsers = (p) => (
  <Icon size={p.size || 18}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);
const IconSettings = (p) => (
  <Icon size={p.size || 18}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
);
const IconCheck = (p) => (
  <Icon size={p.size || 18} sw={2.5}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);
const IconInstagram = (p) => (
  <Icon size={p.size || 18}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </Icon>
);
const IconMap = (p) => (
  <Icon size={p.size || 18}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);
const IconRepeat = (p) => (
  <Icon size={p.size || 18}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Icon>
);
const IconBell = (p) => (
  <Icon size={p.size || 18}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Icon>
);
const IconPlus = (p) => (
  <Icon size={p.size || 18} sw={2.2}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);
const IconMinus = (p) => (
  <Icon size={p.size || 18} sw={2.2}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);
const IconClose = (p) => (
  <Icon size={p.size || 18} sw={2}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icon>
);
const IconSearch = (p) => (
  <Icon size={p.size || 18}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Icon>
);
const IconChevronRight = (p) => (
  <Icon size={p.size || 18}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
);
const IconClock = (p) => (
  <Icon size={p.size || 18}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);
const IconLock = (p) => (
  <Icon size={p.size || 18}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);
const IconDollar = (p) => (
  <Icon size={p.size || 18}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Icon>
);

// Barber pole — gradiente cíclico vermelho/branco/azul, 3px
const BarberPole = ({ opacity = 0.45, height = 3, style = {} }) => (
  <div style={{
    height, width: '100%', opacity,
    background: 'repeating-linear-gradient(90deg, #cc1f1f 0 16px, #ffffff 16px 32px, #2563eb 32px 48px)',
    ...style
  }} />
);

// Logo blackletter (referência à logo entregue). Stand-in tipográfico — assume
// que a logo PNG real é injetada via <img>. Aqui usamos a imagem.
const LogoMark = ({ size = 28, style = {} }) => (
  <img src="assets/logo.png" alt="Andy Na Régua" style={{ width: size, height: size, objectFit: 'contain', display: 'block', ...style }} />
);

Object.assign(window, {
  Icon, IconScissors, IconCalendar, IconChart, IconBox, IconUsers, IconSettings,
  IconCheck, IconInstagram, IconMap, IconRepeat, IconBell, IconPlus, IconMinus,
  IconClose, IconSearch, IconChevronRight, IconClock, IconLock, IconDollar,
  BarberPole, LogoMark
});
