/* Screen 3 — Agent Graph (live monitoring) */

const AgentGraphScreen = () => {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const supervisor = AGENTS[0];
  const workers = AGENTS.slice(1);

  // Show progress on the active worker (PESQ)
  const activeWorker = 'PESQ';

  return (
    <div className="screen-enter">
      <PageHeader
        eyebrow="Monitoramento"
        title="Grafo de Agentes"
        subtitle="Estado em tempo real dos agentes e do ciclo de desambiguação atual."
        action={
          <div className="flex items-center gap-2">
            <Tag tone="warning"><span className="dot-pulse">●</span> Ciclo ativo</Tag>
            <Button variant="outline" size="sm" icon={IconRefresh}>Resetar</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">
        {/* Graph canvas */}
        <Card padded={false} className="overflow-hidden">
          <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold tracking-tight text-text1">Topologia</h2>
              <Tag tone="mono">CDH-tree</Tag>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-text3">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />ocioso</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />trabalhando</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-error" />erro</span>
            </div>
          </div>

          <div className="relative dot-grid h-[460px] sm:h-[560px] flex items-start justify-center px-4 sm:px-10 pt-12 pb-8">
            {/* SVG connectors layer */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 560" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#6366F1" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* From supervisor (300, 110) to PESQ (150, 380), CALC (300, 380), ESC (450, 380) */}
              {[150, 300, 450].map((x, i) => (
                <g key={i}>
                  <path
                    d={`M 300 130 C 300 240, ${x} 240, ${x} 360`}
                    stroke={i === 0 ? '#6366F1' : '#334155'}
                    strokeWidth={i === 0 ? '2' : '1.5'}
                    strokeDasharray="4 4"
                    fill="none"
                    className={i === 0 ? 'dash-flow' : ''}
                    strokeLinecap="round"
                    opacity={i === 0 ? 1 : 0.55}
                  />
                </g>
              ))}
            </svg>

            {/* Supervisor node */}
            <div className="absolute left-1/2 -translate-x-1/2 max-w-[calc(100%-2rem)]" style={{ top: 32 }}>
              <AgentNode agent={supervisor} variant="supervisor" />
            </div>

            {/* Workers row */}
            <div className="absolute left-0 right-0 px-2 sm:px-10" style={{ top: 320 }}>
              <div className="grid grid-cols-3 max-w-[640px] mx-auto gap-2 sm:gap-4">
                {workers.map((w) => (
                  <div key={w.name} className="flex justify-center">
                    <AgentNode agent={w} active={w.name === activeWorker} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom progress bar — Cycle 2/~3 */}
          <div className="px-6 py-4 border-t border-white/5 bg-bg/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text2">Ciclo de desambiguação</span>
                <span className="font-mono text-[12px] text-text1">2 / ~3 esperados</span>
              </div>
              <span className="font-mono text-[11px] text-text3">elapsed 14.3s</span>
            </div>
            <div className="relative h-2 bg-surface2 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary-2 rounded-full" style={{ width: '66%' }} />
              <div className="absolute inset-0 shimmer" />
            </div>
          </div>
        </Card>

        {/* Live log panel */}
        <Card padded={false} className="flex flex-col">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold tracking-tight text-text1">Ciclo Atual</h2>
              <Tag tone="warning">live</Tag>
            </div>
            <button className="text-[11px] text-text3 hover:text-text1 transition">limpar</button>
          </div>
          <div className="flex-1 overflow-auto px-5 py-3 font-mono text-[12.5px] leading-relaxed">
            {AGENT_LOG.map((l, i) => (
              <div key={i} className="flex gap-2 py-0.5">
                <span className="text-text3 shrink-0">[{l.t}]</span>
                <span className={`${l.tone} font-semibold shrink-0`}>{l.who}</span>
                <span className="text-text3">›</span>
                <span className="text-text2">{l.msg}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 py-1.5">
              <span className="text-text3">[10:42:{20 + (tick % 8)}]</span>
              <span className="text-text2 italic">aguardando próximo evento</span>
              <span className="inline-block h-3 w-1.5 bg-primary-2 animate-pulse" />
            </div>
          </div>
          <div className="px-5 py-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
            <Stat label="Tokens" value="3.7k" />
            <Stat label="Cycles" value="2" />
            <Stat label="React" value="6" />
          </div>
        </Card>
      </div>

      {/* Tool calls panel */}
      <Card padded={false}>
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <IconWrench size={16} className="text-text2" />
            <h2 className="text-[16px] font-semibold tracking-tight text-text1">Chamadas de ferramentas</h2>
            <Tag tone="mono">{TOOL_CALLS.length}</Tag>
          </div>
          <span className="text-[11px] text-text3 font-mono">tool_calls.log</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[680px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-text3 border-b border-white/5">
                <th className="px-6 py-2.5 font-medium">timestamp</th>
                <th className="px-2 py-2.5 font-medium">worker</th>
                <th className="px-2 py-2.5 font-medium">tool</th>
                <th className="px-2 py-2.5 font-medium">arguments</th>
                <th className="px-2 py-2.5 font-medium">result</th>
                <th className="px-6 py-2.5 font-medium">status</th>
              </tr>
            </thead>
            <tbody>
              {TOOL_CALLS.map((tc, i) => (
                <tr key={i} className={`hover:bg-white/[0.025] transition ${i !== TOOL_CALLS.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <td className="px-6 py-3 font-mono text-[11.5px] text-text3">{tc.t}</td>
                  <td className="px-2 py-3"><Tag tone="mono">{tc.worker}</Tag></td>
                  <td className="px-2 py-3 font-mono text-[12.5px] text-primary-2">{tc.tool}()</td>
                  <td className="px-2 py-3 font-mono text-[11.5px] text-text2 max-w-[260px] truncate">{tc.args}</td>
                  <td className="px-2 py-3 font-mono text-[11.5px] text-text2">{tc.result}</td>
                  <td className="px-6 py-3">
                    {tc.status === 'ok'
                      ? <span className="inline-flex items-center gap-1 text-success text-[11.5px] font-mono"><IconCheck size={11} /> ok</span>
                      : <span className="inline-flex items-center gap-1 text-error text-[11.5px] font-mono"><IconX size={11} /> err</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-text3">{label}</div>
    <div className="font-mono text-[14px] text-text1 font-semibold">{value}</div>
  </div>
);

const AgentNode = ({ agent, variant = 'worker', active = false }) => {
  const isSupervisor = variant === 'supervisor';
  const isWorking = agent.state === 'working';

  return (
    <div
      className={`relative rounded-lg border transition-all ${
        isSupervisor ? 'w-full max-w-[260px] p-4' : 'w-full max-w-[170px] p-2.5 sm:p-3.5'
      } ${
        active
          ? 'bg-primary/10 border-primary pulse-glow'
          : isSupervisor
            ? 'bg-surface border-primary/40'
            : 'bg-surface border-white/10'
      }`}
    >
      {isSupervisor && (
        <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded bg-primary text-white text-[10px] uppercase tracking-wider font-semibold">
          Supervisor
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AgentDot state={agent.state} />
          <span className={`font-bold tracking-tight text-text1 ${isSupervisor ? 'text-[18px]' : 'text-[15px]'}`}>{agent.name}</span>
        </div>
        {!isSupervisor && (
          <span className={`text-[10px] uppercase tracking-wider ${isWorking ? 'text-warning' : 'text-text3'}`}>
            {isWorking ? agent.role : 'idle'}
          </span>
        )}
      </div>
      <div className={`font-mono text-text3 ${isSupervisor ? 'text-[12px]' : 'text-[11px]'} truncate`}>
        {agent.model}
      </div>
      {!isSupervisor && (
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
          <span className="text-text3">react_cycles</span>
          <span className={`font-mono font-semibold ${agent.cycles > 0 ? 'text-warning' : 'text-text2'}`}>{agent.cycles}</span>
        </div>
      )}
      {isSupervisor && (
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
          <span className="text-text3">{agent.desc}</span>
          <span className="font-mono font-semibold text-warning">cycle {agent.cycles}</span>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { AgentGraphScreen });
