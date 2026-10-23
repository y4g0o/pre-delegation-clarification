/* Sidebar — persistent navigation, 240px fixed */

const NAV_ITEMS = [
  { id: 'overview', label: 'Visão Geral',   icon: IconHome },
  { id: 'new',      label: 'Nova Tarefa',   icon: IconPlay },
  { id: 'graph',    label: 'Grafo Agentes', icon: IconNetwork },
  { id: 'compare',  label: 'Comparação A/B',icon: IconSplit },
  { id: 'metrics',  label: 'Métricas',      icon: IconBars },
  { id: 'history',    label: 'Histórico',     icon: IconClock },
  { id: 'evaluation', label: 'Avaliação',    icon: IconClipboard },
  { id: 'settings',   label: 'Configurações',icon: IconSettings },
];

const Sidebar = ({ active, onNavigate, open = false, onClose = () => {} }) => {
  return (
    <React.Fragment>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
    <aside className={`fixed md:static z-50 md:z-auto top-0 left-0 w-[260px] md:w-[240px] shrink-0 h-full bg-[#0B1322] border-r border-white/5 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      {/* Logo */}
      <div className="px-6 pt-6 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-[0_0_24px_-4px_rgba(99,102,241,0.6)]">
              <span className="text-[11px] font-bold tracking-tight text-white">CDH</span>
            </div>
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary-2 ring-2 ring-[#0B1322]" />
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-text1 tracking-tight">CDH</div>
            <div className="text-[11px] text-text3 -mt-0.5">Dashboard</div>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-6 mb-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-text3 font-semibold">Navegação</div>
      </div>

      {/* Nav items */}
      <nav className="px-3 flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`group w-full flex items-center gap-3 px-3 h-10 rounded-md text-[14px] transition-colors ${
                    isActive
                      ? 'bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_-12px_rgba(99,102,241,0.7)]'
                      : 'text-text2 hover:text-text1 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-text2 group-hover:text-text1'} />
                  <span className="font-medium">{item.label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom — system status */}
      <div className="p-4 border-t border-white/5">
        <div className="bg-surface/60 rounded-md p-3 ring-1 ring-inset ring-white/5">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
            </span>
            <span className="text-[12px] font-medium text-text1">Sistema online</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-text3">
            <span>4 agentes ativos</span>
            <span className="font-mono">v0.4.2</span>
          </div>
        </div>
        <div className="mt-3 px-1 text-[11px] text-text3 leading-snug">
          IFCE Aracati · CDH<br />
          Yago Macambira · 2026
        </div>
      </div>
    </aside>
    </React.Fragment>
  );
};

Object.assign(window, { Sidebar, NAV_ITEMS });
