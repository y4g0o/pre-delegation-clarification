/* Screen 1 — Overview */

const OverviewScreen = ({ onNavigate }) => {
  const { stats, loading, error } = useAppData();
  const live = !loading && !error && stats.source === 'live';
  const recentTasks = live ? stats.recentTasks : RECENT_TASKS;
  const recursionFailures = live ? stats.recursionFailures : RECURSION_FAILURES;
  const fmtPct = (n) => `${(n || 0).toFixed(1).replace('.', ',')}%`;
  const fmtSec = (n) => `${(n || 0).toFixed(1).replace('.', ',')}s`;
  return (
    <div className="screen-enter">
      <PageHeader
        eyebrow="Painel principal"
        title="Visão Geral"
        subtitle="Estado atual do sistema multi-agente, tarefas recentes e desempenho."
        action={
          <Button icon={IconPlay} onClick={() => onNavigate('new')}>Nova tarefa</Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Tarefas no benchmark"
          value={loading ? '…' : String(stats.total)}
          accent="primary"
          icon={IconClipboard}
          sub={`${stats.cdhCount} CDH · ${stats.baselineCount} Baseline${stats.cotCount ? ` · ${stats.cotCount} CoT` : ''}`}
        />
        <StatCard
          label="Taxa de Conclusão"
          value={loading ? '…' : fmtPct(stats.cdhSuccessRate)}
          accent="success"
          icon={IconCheck}
          sub={
            <span>
              <span className="text-success font-medium">CDH {fmtPct(stats.cdhSuccessRate)}</span>
              <span className="text-text3"> · </span>
              <span className="text-error font-medium">Baseline {fmtPct(stats.baselineSuccessRate)}</span>
            </span>
          }
        />
        <StatCard
          label="Latência média"
          value={loading ? '…' : fmtSec(stats.cdhAvgLatency)}
          accent="info"
          icon={IconBolt}
          sub={
            <span>
              <span className="text-sky-400 font-medium">CDH {fmtSec(stats.cdhAvgLatency)}</span>
              <span className="text-text3"> · Baseline {fmtSec(stats.baselineAvgLatency)}</span>
            </span>
          }
        />
        <StatCard
          label="Tokens consumidos"
          value={loading ? '…' : `${(stats.tokensConsumed24h / 1000).toFixed(1).replace('.', ',')}k`}
          accent="purple"
          icon={IconCoins}
          sub={live ? 'Total no benchmark' : 'Janela últimas 24h'}
        />
      </div>

      {/* Recursion-limit failure spotlight — central paper claim */}
      <Card className="mb-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-error/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 relative">
          <div className="flex items-start gap-3 lg:max-w-[280px]">
            <div className="h-10 w-10 rounded-md bg-error/15 ring-1 ring-inset ring-error/30 flex items-center justify-center text-error shrink-0">
              <IconWarning size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold tracking-tight text-text1">Falhas por limite de recursão</h3>
                <Tag tone="warning">Baseline only</Tag>
              </div>
              <p className="text-[12px] text-text2 mt-1 leading-snug">
                Tarefas abortadas após atingir 15 iterações ReAct. O modo CDH evita esse modo de falha via desambiguação proativa.
              </p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4 lg:border-l lg:border-white/5 lg:pl-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3 font-medium">Total Baseline</div>
              <div className="font-mono text-[24px] text-error font-bold mt-0.5">{recursionFailures.length}</div>
              <div className="text-[11px] text-text3">tarefas abortadas</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3 font-medium">Total CDH</div>
              <div className="font-mono text-[24px] text-success font-bold mt-0.5">0</div>
              <div className="text-[11px] text-text3">no mesmo período</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3 font-medium">Tokens perdidos</div>
              <div className="font-mono text-[24px] text-warning font-bold mt-0.5">
                {(recursionFailures.reduce((a, b) => a + (b.tokensWasted || 0), 0) / 1000).toFixed(1)}k
              </div>
              <div className="text-[11px] text-text3">em loops sem retorno</div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('compare')}
            className="text-[12px] text-primary-2 hover:text-text1 inline-flex items-center gap-1 transition self-start lg:self-center shrink-0"
          >
            Ver comparação A/B <IconArrowRight size={12} />
          </button>
        </div>
      </Card>

      {/* Two-column: Recent tasks + Agent status */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <Card padded={false}>
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold tracking-tight text-text1">Tarefas Recentes</h2>
              <Tag>{recentTasks.length} de {live ? stats.total : 78}</Tag>
              {live && <Tag tone="success">live</Tag>}
              {!live && !loading && <Tag tone="warning">offline</Tag>}
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-[13px] text-text2 hover:text-text1 inline-flex items-center gap-1 transition"
            >
              Ver histórico <IconArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-text3 border-y border-white/5">
                  <th className="px-6 py-2.5 font-medium">ID</th>
                  <th className="px-2 py-2.5 font-medium">Tarefa</th>
                  <th className="px-2 py-2.5 font-medium">Modo</th>
                  <th className="px-2 py-2.5 font-medium">Status</th>
                  <th className="px-2 py-2.5 font-medium">Duração</th>
                  <th className="px-6 py-2.5 font-medium text-right">Quando</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((t, idx) => (
                  <tr
                    key={`${t.id}-${idx}`}
                    className={`group hover:bg-white/[0.025] transition cursor-pointer ${idx !== recentTasks.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                  >
                    <td className="px-6 py-3 font-mono text-[12px] text-text2">{t.id}</td>
                    <td className="px-2 py-3 text-text1 max-w-[320px]">
                      <div className="truncate group-hover:text-primary-2 transition">{t.task}</div>
                    </td>
                    <td className="px-2 py-3"><ModeBadge mode={t.mode} /></td>
                    <td className="px-2 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-2 py-3 font-mono text-[12px] text-text2">{t.duration}</td>
                    <td className="px-6 py-3 text-right text-text3 text-[12px]">{t.ago}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right panel — Agent status */}
        <Card padded={false}>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold tracking-tight text-text1">Agentes</h2>
            <button
              onClick={() => onNavigate('graph')}
              className="text-[12px] text-text2 hover:text-text1 inline-flex items-center gap-1 transition"
            >
              Grafo <IconArrowRight size={12} />
            </button>
          </div>
          <div className="px-3 pb-4 space-y-1.5">
            {AGENTS.map((a) => (
              <div key={a.name} className="px-3 py-3 rounded-md hover:bg-white/[0.03] transition">
                <div className="flex items-center gap-2.5">
                  <AgentDot state={a.state} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-text1">{a.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-text3">{a.role}</span>
                    </div>
                    <div className="font-mono text-[11px] text-text3 truncate">{a.model}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-text2">{a.last}</div>
                    {a.cycles > 0 && <div className="font-mono text-[10px] text-warning">cycles: {a.cycles}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-white/5 text-[12px] text-text3 flex items-center justify-between">
            <span>Atualizado há 2s</span>
            <button className="hover:text-text1 transition inline-flex items-center gap-1">
              <IconRefresh size={12} /> atualizar
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

Object.assign(window, { OverviewScreen });
