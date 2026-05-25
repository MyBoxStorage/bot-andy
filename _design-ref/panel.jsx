// ============================================================
// PAINEL — Telas desktop (1280px de largura)
// Agenda, Estoque, Login
// ============================================================

// ---------- Sidebar ----------
const Sidebar = ({ active = 'agenda' }) => {
  const items = [
    { id: 'agenda', label: 'Agenda', Icon: IconCalendar },
    { id: 'clientes', label: 'Clientes', Icon: IconUsers },
    { id: 'servicos', label: 'Serviços', Icon: IconScissors },
    { id: 'estoque', label: 'Estoque', Icon: IconBox },
    { id: 'faturamento', label: 'Faturamento', Icon: IconChart },
    { id: 'config', label: 'Configurações', Icon: IconSettings },
  ];
  return (
    <aside style={{
      width: 220, background: '#0a0a0a',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, height: '100%',
    }}>
      {/* Logo no topo */}
      <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <img src="assets/logo.png" alt="Andy na Régua"
          style={{ height: 36, width: 'auto', objectFit: 'contain', display: 'block' }} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(it => {
          const isActive = it.id === active;
          return (
            <div key={it.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px',
              borderRadius: 8,
              color: isActive ? '#cc1f1f' : '#888',
              background: isActive ? 'rgba(204,31,31,0.06)' : 'transparent',
              borderLeft: isActive ? '2px solid #cc1f1f' : '2px solid transparent',
              paddingLeft: isActive ? 10 : 12,
              fontSize: 13.5, fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
            }}>
              <it.Icon size={17} />
              <span>{it.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Footer da sidebar — barber pole + status */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <BarberPole opacity={0.5} style={{ marginBottom: 10, borderRadius: 2 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#666' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
            boxShadow: '0 0 6px rgba(34,197,94,0.6)',
          }} />
          Online · 14:30 · seg 26/mai
        </div>
      </div>
    </aside>
  );
};

const Topbar = ({ title, subtitle, action }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '22px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    background: '#000',
  }}>
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{title}</div>
      <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>{subtitle}</div>
    </div>
    {action}
  </div>
);

const PrimaryButton = ({ children, ...rest }) => (
  <button {...rest} style={{
    background: '#cc1f1f', color: '#fff', border: 'none',
    borderRadius: 10, padding: '10px 18px',
    fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    ...(rest.style || {})
  }}>{children}</button>
);

// ============================================================
// PAINEL — Agenda
// ============================================================
const PanelAgenda = () => {
  const stats = [
    { label: 'Agendamentos', value: '14', sub: 'hoje', barColor: '#cc1f1f', iconBg: 'rgba(204,31,31,0.12)', iconColor: '#cc1f1f', Icon: IconCalendar },
    { label: 'Em serviços', value: 'R$ 720', sub: 'previsto', barColor: '#22c55e', iconBg: 'rgba(34,197,94,0.12)', iconColor: '#22c55e', Icon: IconScissors },
    { label: 'Em produtos', value: 'R$ 180', sub: 'vendido', barColor: '#2563eb', iconBg: 'rgba(37,99,235,0.12)', iconColor: '#2563eb', Icon: IconBox },
    { label: 'Total do dia', value: 'R$ 900', sub: '+12% vs ontem', barColor: '#cc1f1f', iconBg: 'rgba(204,31,31,0.12)', iconColor: '#cc1f1f', Icon: IconDollar },
  ];

  const appts = [
    { from: '09:00', to: '09:45', name: 'Lucas Pereira', svc: 'Corte Masculino', barber: 'Andy', status: 'Concluído', statusColor: 'blue', price: 'R$ 50' },
    { from: '10:00', to: '11:15', name: 'Renato Lima',  svc: 'Corte + Barba',    barber: 'Diego', status: 'Concluído', statusColor: 'blue', price: 'R$ 80' },
    { from: '11:30', to: '12:00', name: 'Pedro Souza',  svc: 'Barba Completa',   barber: 'Andy',  status: 'Concluído', statusColor: 'blue', price: 'R$ 40' },
    { from: '14:30', to: '15:15', name: 'Marcos Tavares', svc: 'Corte Degradê',  barber: 'Diego', status: 'Confirmado', statusColor: 'green', price: 'R$ 60', current: true },
    { from: '15:30', to: '16:00', name: 'João Vitor',   svc: 'Sobrancelha',      barber: 'Andy',  status: 'Confirmado', statusColor: 'green', price: 'R$ 20' },
    { from: '16:00', to: '16:30', name: 'Eduardo Brito', svc: 'Pigmentação',     barber: 'Bruno', status: 'Cancelado',  statusColor: 'red',   price: 'R$ 35' },
    { from: '17:00', to: '17:45', name: 'Felipe Ramos', svc: 'Corte Masculino',  barber: 'Andy',  status: 'Confirmado', statusColor: 'green', price: 'R$ 50' },
  ];

  const statusStyle = (c) => {
    const map = {
      green: { bg: 'rgba(34,197,94,0.12)',  fg: '#22c55e', bd: 'rgba(34,197,94,0.30)' },
      blue:  { bg: 'rgba(37,99,235,0.12)',  fg: '#3b82f6', bd: 'rgba(37,99,235,0.30)' },
      red:   { bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444', bd: 'rgba(239,68,68,0.30)' },
    };
    const s = map[c];
    return { background: s.bg, color: s.fg, border: `1px solid ${s.bd}` };
  };

  return (
    <div className="mockup" style={{ display: 'flex' }}>
      <Sidebar active="agenda" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          title="Agenda"
          subtitle="segunda-feira, 26 de maio · 14:30"
          action={
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                background: '#111', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 10, color: '#888', fontSize: 13,
              }}>
                <IconSearch size={15} /> Buscar cliente, serviço…
              </div>
              <PrimaryButton><IconPlus size={15} /> Novo agendamento</PrimaryButton>
            </div>
          }
        />

        <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {stats.map(s => (
              <div key={s.label} style={{
                position: 'relative', background: '#111',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '18px 18px 18px',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#666', textTransform: 'uppercase', fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginTop: 8, letterSpacing: '-0.02em' }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.sub}</div>
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: s.iconBg, color: s.iconColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <s.Icon size={18} />
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: s.barColor }} />
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 4, background: '#111', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: 3 }}>
              {['Todos', 'Andy', 'Diego', 'Bruno'].map((b, i) => (
                <div key={b} style={{
                  padding: '7px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                  background: i === 0 ? '#1a1a1a' : 'transparent',
                  color: i === 0 ? '#fff' : '#888',
                }}>{b}</div>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
              7 agendamentos · 5 confirmados · 1 cancelado
            </div>
          </div>

          {/* Cards de agendamento */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appts.map((a, i) => (
              <div key={i} style={{
                background: a.current ? 'rgba(204,31,31,0.04)' : '#111',
                border: a.current ? '1px solid rgba(204,31,31,0.35)' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'grid',
                gridTemplateColumns: '110px 1fr auto',
                gap: 18, alignItems: 'center',
              }}>
                {/* Hora */}
                <div>
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: '#fff',
                    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {a.current && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cc1f1f', boxShadow:'0 0 6px rgba(204,31,31,0.7)' }} />}
                    {a.from}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2, fontVariantNumeric:'tabular-nums' }}>até {a.to}</div>
                </div>

                {/* Cliente + serviço + barbeiro */}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{a.name}</div>
                  <div style={{ display:'flex', alignItems:'center', gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 13, color: '#888' }}>{a.svc}</span>
                    <span style={{
                      fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '3px 8px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: '#aaa', fontWeight: 600,
                    }}>{a.barber}</span>
                  </div>
                </div>

                {/* Status + preço + ação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{
                    ...statusStyle(a.statusColor),
                    fontSize: 11.5, fontWeight: 600,
                    padding: '5px 10px', borderRadius: 999,
                  }}>{a.status}</span>
                  <span style={{
                    fontSize: 15, fontWeight: 700,
                    color: a.statusColor === 'red' ? '#666' : '#22c55e',
                    textDecoration: a.statusColor === 'red' ? 'line-through' : 'none',
                    minWidth: 70, textAlign: 'right', fontVariantNumeric:'tabular-nums',
                  }}>{a.price}</span>
                  <button style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
                    color: '#666', display:'flex', alignItems:'center', justifyContent:'center',
                    cursor: 'pointer',
                  }}><IconClose size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PAINEL — Estoque
// ============================================================
const PanelEstoque = () => {
  const products = [
    { name: 'Pomada Modeladora Forte', desc: 'Fixação forte, acabamento matte. Linha barbershop classic.', price: 'R$ 45', stock: 12, max: 20, status: 'ok' },
    { name: 'Óleo para Barba — Cedro',  desc: 'Hidratação e brilho natural com aroma de cedro e bergamota.', price: 'R$ 38', stock: 3, max: 15, status: 'low' },
    { name: 'Shampoo Anti-caspa',        desc: 'Fórmula com tea tree, alívio imediato e hidratação prolongada.', price: 'R$ 32', stock: 8, max: 12, status: 'ok' },
    { name: 'Pente Profissional Aço',    desc: 'Aço inox antiestático, ideal para acabamento de degradê.', price: 'R$ 60', stock: 0, max: 10, status: 'out' },
    { name: 'Cera Capilar Matte',        desc: 'Acabamento natural sem brilho, fixação média e flexível.', price: 'R$ 42', stock: 14, max: 20, status: 'ok' },
    { name: 'Loção pós-barba',           desc: 'Acalma a pele após o corte, com mentol e calêndula.', price: 'R$ 28', stock: 5, max: 18, status: 'low' },
  ];

  const statusColor = (s) => s === 'ok' ? '#22c55e' : s === 'low' ? '#f59e0b' : '#ef4444';
  const statusLabel = (s, n) => s === 'out' ? 'Sem estoque' : s === 'low' ? `Estoque baixo · ${n}` : `Em estoque · ${n}`;

  return (
    <div className="mockup" style={{ display: 'flex' }}>
      <Sidebar active="estoque" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          title="Estoque"
          subtitle="6 produtos · 2 com alerta · última atualização há 12 min"
          action={
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                background: '#111', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 10, color: '#888', fontSize: 13, minWidth: 240,
              }}>
                <IconSearch size={15} /> Buscar produto…
              </div>
              <PrimaryButton><IconPlus size={15} /> Novo produto</PrimaryButton>
            </div>
          }
        />

        <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
          {/* Alert banner para estoque baixo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', marginBottom: 22,
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 10,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ fontSize: 13, color: '#f0ece4' }}>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>2 produtos</span> com estoque baixo ou esgotado.
              <span style={{ color: '#888', marginLeft: 4 }}>Considere repor antes do fim de semana.</span>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12.5, color: '#f59e0b', fontWeight: 600 }}>Ver lista →</div>
          </div>

          {/* Grid de produtos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {products.map((p, i) => {
              const c = statusColor(p.status);
              const pct = Math.max(4, (p.stock / p.max) * 100);
              return (
                <div key={i} style={{
                  background: '#111', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '18px 20px',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{p.name}</div>
                      <div style={{ fontSize: 13, color: '#888', marginTop: 6, lineHeight: 1.5 }}>{p.desc}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{p.price}</div>
                  </div>

                  {/* Estoque */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: '#888' }}>Estoque atual</span>
                      <span style={{ color: c, fontWeight: 600 }}>{statusLabel(p.status, p.stock)}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 999 }} />
                    </div>
                  </div>

                  {/* Stepper + ações */}
                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 10, overflow: 'hidden',
                    }}>
                      <button style={{
                        width: 36, height: 36, background: 'transparent', border: 'none',
                        color: '#888', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                      }}><IconMinus size={14} /></button>
                      <div style={{
                        minWidth: 42, textAlign: 'center', color: '#fff',
                        fontWeight: 600, fontSize: 14, fontVariantNumeric:'tabular-nums',
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        padding: '8px 0',
                      }}>{p.stock}</div>
                      <button style={{
                        width: 36, height: 36, background: 'transparent', border: 'none',
                        color: '#fff', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                      }}><IconPlus size={14} /></button>
                    </div>
                    <div style={{ flex: 1 }} />
                    <button style={{
                      padding: '8px 14px', background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8,
                      color: '#f0ece4', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}>Editar</button>
                    <button style={{
                      padding: '8px 14px', background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8,
                      color: '#888', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}>Desativar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PAINEL — Login
// ============================================================
const PanelLogin = () => {
  // Noise SVG embutido — textura sutil
  const noise = `url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;

  return (
    <div className="mockup" style={{
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundImage: noise, backgroundSize: '300px 300px',
      backgroundColor: '#000',
    }}>
      {/* Vinheta sutil */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Card de login */}
      <div style={{
        position: 'relative',
        width: 380,
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '40px 36px 36px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Logo grande */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <img src="assets/logo.png" alt="Andy na Régua"
            style={{ width: 200, height: 'auto', objectFit: 'contain', display: 'block' }} />
        </div>

        <BarberPole opacity={0.55} style={{ margin: '14px 0 26px', borderRadius: 2 }} />

        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Acesso ao painel</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Entre com a senha da barbearia.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, letterSpacing: '0.08em', color: '#666', textTransform: 'uppercase', fontWeight: 500 }}>Senha</label>
            <div style={{
              marginTop: 8,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              background: '#000',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
            }}>
              <IconLock size={16} />
              <span style={{
                flex: 1, color: '#fff', fontSize: 16, letterSpacing: '0.3em',
                fontFamily: 'JetBrains Mono, monospace',
              }}>••••••••</span>
              <span style={{ fontSize: 11, color: '#666', cursor: 'pointer' }}>mostrar</span>
            </div>
          </div>

          <button style={{
            marginTop: 4,
            background: '#cc1f1f', color: '#fff', border: 'none',
            borderRadius: 10, padding: '13px 0',
            fontSize: 14, fontWeight: 700, letterSpacing: '0.01em',
            fontFamily: 'inherit', cursor: 'pointer',
          }}>Entrar</button>

          <div style={{ textAlign: 'center', fontSize: 12, color: '#666', marginTop: 8 }}>
            Problemas para entrar? <span style={{ color: '#3b82f6' }}>Falar com o Andy</span>
          </div>
        </div>
      </div>

      {/* Footer minimal */}
      <div style={{
        position: 'absolute', bottom: 24, left: 0, right: 0,
        textAlign: 'center', fontSize: 11, color: '#444',
        letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500,
      }}>
        Andy Na Régua · Balneário Camboriú/SC
      </div>
    </div>
  );
};

Object.assign(window, { Sidebar, Topbar, PanelAgenda, PanelEstoque, PanelLogin });
