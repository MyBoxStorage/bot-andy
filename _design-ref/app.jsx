// Composição final — design canvas com todos os 6 mockups
const App = () => (
  <DesignCanvas>
    <DCSection id="landing" title="Landing — Agendamento" subtitle="Mobile · 390 × 844 · cliente acessa via WhatsApp">
      <DCArtboard id="l1" label="Passo 1 · Escolha do serviço" width={390} height={844}>
        <Landing1 />
      </DCArtboard>
      <DCArtboard id="l3" label="Passo 3 · Data e horário" width={390} height={844}>
        <Landing3 />
      </DCArtboard>
      <DCArtboard id="l5" label="Passo 5 · Confirmação" width={390} height={844}>
        <Landing5 />
      </DCArtboard>
    </DCSection>

    <DCSection id="panel" title="Painel administrativo" subtitle="Desktop · 1280 × 832 · uso do Andy e da secretária">
      <DCArtboard id="p1" label="Agenda do dia" width={1280} height={832}>
        <PanelAgenda />
      </DCArtboard>
      <DCArtboard id="p2" label="Estoque · stepper rápido" width={1280} height={832}>
        <PanelEstoque />
      </DCArtboard>
      <DCArtboard id="p3" label="Login" width={1280} height={832}>
        <PanelLogin />
      </DCArtboard>
    </DCSection>
  </DesignCanvas>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
