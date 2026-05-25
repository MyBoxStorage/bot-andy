// ============================================================
// LANDING — Telas mobile (390px de largura)
// Passo 1 (Serviço), Passo 3 (Data/Hora), Passo 5 (Confirmação)
// ============================================================

const COLORS = {
  bg: '#000000',
  surface1: '#0a0a0a',
  surface2: '#111111',
  surface3: '#1a1a1a',
  text: '#f0ece4',
  textDim: '#888888',
  border1: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.12)',
  border3: 'rgba(255,255,255,0.20)',
  red: '#cc1f1f',
  blue: '#2563eb',
  blueText: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
  errRed: '#ef4444',
};

// ---------- Cabeçalho compartilhado ----------
const LandingHeader = ({ step }) => (
  <div style={{
    position: 'sticky', top: 0, background: '#000', zIndex: 5,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 20px 14px' }}>
      <img src="assets/logo.png" alt="Andy na Régua"
        style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block' }} />
      <div style={{
        marginTop: 8, fontSize: 10, letterSpacing: '0.18em', color: '#888',
        fontWeight: 500, textTransform: 'uppercase',
      }}>Agendamento Online</div>
    </div>
    {/* Progress bar — 4 segmentos */}
    <div style={{ display: 'flex', gap: 6, padding: '0 20px 12px' }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < step ? '#ffffff' : 'rgba(255,255,255,0.10)',
        }} />
      ))}
    </div>
    <BarberPole opacity={0.4} />
  </div>
);

// ---------- Footer compartilhado ----------
const LandingFooter = () => (
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'rgba(0,0,0,0.95)',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    padding: '14px 20px 16px',
    textAlign: 'center', fontSize: 11, color: '#888', lineHeight: 1.5,
  }}>
    <BarberPole opacity={0.35} style={{ position:'absolute', top: 0, left: 0, right: 0 }} />
    Rua 900, nº 41 — Balneário Camboriú/SC<br/>
    <a href="#" style={{ color: COLORS.blueText, textDecoration: 'none', fontSize: 11 }}>@andynaregua</a>
  </div>
);

const StepTitle = ({ title, subtitle }) => (
  <div style={{ padding: '24px 20px 18px' }}>
    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>{title}</div>
    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{subtitle}</div>
  </div>
);

// ============================================================
// PASSO 1 — Escolha do serviço
// ============================================================
const Landing1 = () => {
  const cats = ['Todos', 'Cabelo', 'Barba', 'Estética'];
  const active = 0;
  const services = [
    { name: 'Corte Masculino', dur: '45 min', price: 'R$ 50' },
    { name: 'Corte + Barba', dur: '1h 15min', price: 'R$ 80' },
    { name: 'Corte Degradê', dur: '50 min', price: 'R$ 60' },
    { name: 'Corte Infantil', dur: '30 min', price: 'R$ 40' },
    { name: 'Barba Completa', dur: '40 min', price: 'R$ 40' },
    { name: 'Pigmentação', dur: '30 min', price: 'R$ 35' },
    { name: 'Sobrancelha', dur: '15 min', price: 'R$ 20' },
  ];
  return (
    <div className="mockup" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <LandingHeader step={1} />
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 80 }}>
        <StepTitle title="Escolha o serviço" subtitle="Preços e duração estimada" />

        {/* Chips de categoria */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 18px', overflow: 'auto' }}>
          {cats.map((c, i) => {
            const isActive = i === active;
            return (
              <div key={c} style={{
                flex: '0 0 auto',
                padding: '8px 16px',
                borderRadius: 999,
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#000' : '#888',
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                fontSize: 13, fontWeight: 600,
                letterSpacing: '0.01em',
              }}>{c}</div>
            );
          })}
        </div>

        {/* Cards de serviço */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {services.map((s, i) => (
            <div key={s.name} style={{
              background: COLORS.surface2,
              border: `1px solid ${i === 1 ? 'rgba(255,255,255,0.20)' : COLORS.border1}`,
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{s.dur}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{s.price}</div>
                <div style={{ color: '#555' }}><IconChevronRight size={16} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <LandingFooter />
    </div>
  );
};

// ============================================================
// PASSO 3 — Data + horário
// ============================================================
const Landing3 = () => {
  const dates = [
    { dow: 'HOJE', d: '26', m: 'mai' },
    { dow: 'TER', d: '27', m: 'mai' },
    { dow: 'QUA', d: '28', m: 'mai' },
    { dow: 'QUI', d: '29', m: 'mai' },
    { dow: 'SEX', d: '30', m: 'mai' },
    { dow: 'SAB', d: '31', m: 'mai' },
    { dow: 'SEG', d: '02', m: 'jun' },
  ];
  const selectedDate = 1;
  const slots = [
    '09:00','09:30','10:00',
    '10:30','11:00','11:30',
    '14:00','14:30','15:00',
    '15:30','16:00','16:30',
    '17:00','17:30','18:00',
  ];
  const selectedSlot = 4;

  return (
    <div className="mockup" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <LandingHeader step={3} />
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 80 }}>
        <StepTitle title="Escolha data e horário" subtitle="Disponibilidade em tempo real" />

        {/* Resumo do que foi escolhido */}
        <div style={{ margin: '0 20px 18px', padding: '12px 14px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10, display: 'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#666', textTransform: 'uppercase' }}>Serviço · barbeiro</div>
            <div style={{ fontSize: 13, color: '#f0ece4', marginTop: 4, fontWeight: 500 }}>
              Corte + Barba <span style={{ color: '#555' }}>·</span> Andy
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#888' }}>Trocar</div>
        </div>

        {/* Datas */}
        <div style={{ padding: '0 20px 6px' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#666', textTransform: 'uppercase', marginBottom: 10 }}>Data</div>
          <div style={{ display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 4 }}>
            {dates.map((d, i) => {
              const sel = i === selectedDate;
              return (
                <div key={i} style={{
                  flex: '0 0 auto',
                  background: sel ? 'rgba(255,255,255,0.10)' : COLORS.surface2,
                  border: sel ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 12, padding: '10px 14px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  minWidth: 56,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.08em', color: sel ? '#fff' : '#888', textTransform: 'uppercase' }}>{d.dow}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 2, lineHeight: 1 }}>{d.d}</div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2, textTransform: 'lowercase' }}>{d.m}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Horários */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#666', textTransform: 'uppercase' }}>Horário</div>
            <div style={{ fontSize: 11, color: '#666' }}>terça, 27 de maio</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {slots.map((t, i) => {
              const sel = i === selectedSlot;
              return (
                <div key={t} style={{
                  background: sel ? '#2563eb' : 'rgba(37,99,235,0.10)',
                  border: sel ? '1px solid #2563eb' : '1px solid rgba(37,99,235,0.35)',
                  color: sel ? '#fff' : COLORS.blueText,
                  borderRadius: 12, padding: '12px 0',
                  textAlign: 'center', fontWeight: 600, fontSize: 14,
                  fontVariantNumeric: 'tabular-nums',
                }}>{t}</div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '24px 20px 0' }}>
          <button style={{
            width: '100%', background: COLORS.red, color: '#fff',
            border: 'none', borderRadius: 14, padding: '15px 0',
            fontSize: 15, fontWeight: 700, letterSpacing: '0.01em',
            fontFamily: 'inherit',
          }}>Continuar para confirmação</button>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
};

// ============================================================
// PASSO 5 — Confirmação
// ============================================================
const Landing5 = () => (
  <div className="mockup" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
    <LandingHeader step={4} />
    <div style={{ flex: 1, overflow: 'auto', paddingBottom: 80, display: 'flex', flexDirection: 'column' }}>
      {/* Ícone check grande */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 28 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(37,99,235,0.12)',
          border: '1px solid rgba(37,99,235,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#2563eb',
        }}>
          <IconCheck size={32} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Agendado!</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>Te esperamos no horário marcado.</div>
      </div>

      {/* Resumo do agendamento */}
      <div style={{
        margin: '24px 20px 0',
        background: COLORS.surface2,
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 14, padding: '18px 18px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#666', textTransform: 'uppercase' }}>Confirmação</div>
          <div style={{ fontSize: 11, color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>#A2K-0427</div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888', fontSize: 13 }}>Serviço</span>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Corte + Barba</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888', fontSize: 13 }}>Barbeiro</span>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Andy</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888', fontSize: 13 }}>Data</span>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>terça, 27 de maio</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888', fontSize: 13 }}>Horário</span>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>14:30 — 15:45</span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888', fontSize: 13 }}>Total</span>
            <span style={{ color: '#22c55e', fontSize: 16, fontWeight: 700 }}>R$ 80,00</span>
          </div>
        </div>
      </div>

      {/* 4 CTAs empilhados */}
      <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button style={{
          background: COLORS.red, color: '#fff', border: 'none',
          borderRadius: 12, padding: '14px 16px', fontFamily: 'inherit',
          fontSize: 14, fontWeight: 700, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <IconRepeat size={16} /> Fazer outro agendamento
        </button>
        <button style={{
          background: 'rgba(37,99,235,0.10)', color: COLORS.blueText,
          border: '1px solid rgba(37,99,235,0.35)', borderRadius: 12,
          padding: '13px 16px', fontFamily: 'inherit',
          fontSize: 14, fontWeight: 600, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <IconCalendar size={16} /> Salvar no calendário
        </button>
        <button style={{
          background: COLORS.surface2, color: '#f0ece4',
          border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12,
          padding: '13px 16px', fontFamily: 'inherit',
          fontSize: 14, fontWeight: 500, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <IconInstagram size={16} /> Seguir @andynaregua
        </button>
        <button style={{
          background: COLORS.surface2, color: '#888',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
          padding: '13px 16px', fontFamily: 'inherit',
          fontSize: 14, fontWeight: 500, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <IconMap size={16} /> Ver no mapa
        </button>
      </div>
    </div>
    <LandingFooter />
  </div>
);

Object.assign(window, { COLORS, Landing1, Landing3, Landing5 });
