/* App shell — wires sidebar + screens */

const SCREEN_LABELS = {
  overview:   '01 Visão Geral',
  new:        '02 Nova Tarefa',
  execution:  '02b Execução',
  graph:      '03 Grafo de Agentes',
  compare:    '04 Comparação A/B',
  metrics:    '05 Métricas',
  history:    '06 Histórico',
  evaluation: '07 Avaliação',
  settings:   '08 Configurações',
};

const App = () => {
  const [active, setActive] = React.useState('overview');
  const [navOpen, setNavOpen] = React.useState(false);
  const [execPayload, setExecPayload] = React.useState(null);

  // Persist current screen in URL hash for refreshes
  React.useEffect(() => {
    const fromHash = window.location.hash.replace('#', '');
    if (fromHash && SCREEN_LABELS[fromHash]) setActive(fromHash);
    const onHash = () => {
      const h = window.location.hash.replace('#', '');
      if (h && SCREEN_LABELS[h]) setActive(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (id) => {
    setActive(id);
    setNavOpen(false);
    window.location.hash = id;
  };

  let Screen;
  switch (active) {
    case 'new':       Screen = NewTaskScreen;    break;
    case 'execution': Screen = ExecutionScreen;  break;
    case 'graph':     Screen = AgentGraphScreen; break;
    case 'compare':   Screen = CompareScreen;    break;
    case 'metrics':   Screen = MetricsScreen;    break;
    case 'history':   Screen = HistoryScreen;    break;
    case 'evaluation': Screen = EvaluationScreen; break;
    case 'settings':  Screen = SettingsScreen;   break;
    default:          Screen = OverviewScreen;
  }

  const activeItem = NAV_ITEMS.find((n) => n.id === active);

  return (
    <div className="h-full md:flex bg-bg text-text1 dot-grid">
      <Sidebar active={active} onNavigate={navigate} open={navOpen} onClose={() => setNavOpen(false)} />
      <main
        className="flex-1 overflow-auto h-full"
        data-screen-label={SCREEN_LABELS[active]}
      >
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-[#0B1322]/95 backdrop-blur border-b border-white/5 flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => setNavOpen(true)}
            className="h-9 w-9 rounded-md bg-surface2/60 ring-1 ring-inset ring-white/5 flex items-center justify-center text-text1"
            aria-label="Abrir menu"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">CDH</span>
            </div>
            <span className="text-[14px] font-semibold text-text1">{activeItem?.label || 'Dashboard'}</span>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-text2">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> online
          </span>
        </div>
        <div className="px-4 py-6 sm:px-6 md:px-10 md:py-10 min-h-full" key={active}>
          <Screen
            onNavigate={navigate}
            setExecPayload={setExecPayload}
            taskText={execPayload?.task}
            mode={execPayload?.mode}
            onComplete={() => navigate('graph')}
            onCancel={() => navigate('new')}
          />
        </div>
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
