/* Screen 4 — Metrics & Benchmarks */

const MetricsScreen = () => {
  const [bench, setBench] = React.useState('I');
  const { stats, loading, error } = useAppData();
  const live = !loading && !error && stats.source === 'live';

  // Numbers driven by selected benchmark — when live, Benchmark I usa stats reais
  const data = bench === 'I'
    ? (live
        ? {
            n: stats.total,
            completion: { cdh: stats.cdhSuccessRate, base: stats.baselineSuccessRate },
            latency:    { cdh: stats.cdhAvgLatency,  base: stats.baselineAvgLatency },
            tokenDelta: (() => {
              const c = stats.cdhAvgTokens, b = stats.baselineAvgTokens;
              if (!b) return '—';
              const pct = Math.round(((c - b) / b) * 100);
              return `${pct >= 0 ? '+' : ''}${pct}%`;
            })(),
            tokenColor: stats.cdhAvgTokens > stats.baselineAvgTokens ? 'text-warning' : 'text-success',
          }
        : { n: 78, completion: { cdh: 100,  base: 73.3 }, latency: { cdh: 20.5, base: 25.9 }, tokenDelta: '+88%', tokenColor: 'text-warning' }
      )
    : { n: 50, completion: { cdh: 94.0, base: 88.0 }, latency: { cdh: 15.7, base: 11.3 }, tokenDelta: '-47%', tokenColor: 'text-success' };

  const tokenBreakdown     = live ? stats.tokenBreakdown     : TOKEN_BREAKDOWN;
  const topTokenTasks      = live ? stats.topTokenTasks      : TOP_TOKEN_TASKS;
  const recursionFailures  = live ? stats.recursionFailures  : RECURSION_FAILURES;
  const categoryBreakdown  = live ? stats.categoryBreakdown  : CATEGORY_BREAKDOWN;
  const ambBreakdown       = live ? stats.ambBreakdown       : AMB_BREAKDOWN;

  return (
    <div className="screen-enter">
      <PageHeader
        eyebrow="Análise comparativa"
        title="Métricas"
        subtitle="Comparativo CDH vs Baseline em conjuntos benchmark."
        action={
          <Button
            variant="outline"
            size="sm"
            icon={IconExport}
            onClick={() => exportCSV([...HISTORY, ...TOP_TOKEN_TASKS], `cdh-metricas-${Date.now()}.csv`)}
          >
            Exportar CSV
          </Button>
        }
      />

      {/* Benchmark tabs */}
      <div className="border-b border-white/5 mb-6 flex items-center gap-6">
        {[
          { id: 'I',  label: 'Benchmark I',  n: 78 },
          { id: 'II', label: 'Benchmark II', n: 50 },
        ].map((b) => {
          const active = bench === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setBench(b.id)}
              className={`relative pb-3 -mb-px flex items-center gap-2 text-[14px] transition ${
                active ? 'text-text1 font-semibold' : 'text-text2 hover:text-text1'
              }`}
            >
              {b.label} <Tag tone={active ? 'primary' : 'default'}>N = {b.n}</Tag>
              {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Completion */}
        <Card>
          <div className="text-[12px] uppercase tracking-wider text-text3 font-medium mb-4">Taxa de Conclusão</div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-text2 inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success" /> CDH
                </span>
                <span className="font-mono text-[14px] text-success font-semibold">{data.completion.cdh.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                <div className="h-2 bg-success rounded-full transition-all duration-700" style={{ width: `${data.completion.cdh}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-text2 inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-error" /> Baseline
                </span>
                <span className="font-mono text-[14px] text-error font-semibold">{data.completion.base.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                <div className="h-2 bg-error rounded-full transition-all duration-700" style={{ width: `${data.completion.base}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 text-[12px] text-text2">
            Δ <span className="text-success font-semibold">+{(data.completion.cdh - data.completion.base).toFixed(1)} pp</span> a favor do CDH
          </div>
        </Card>

        {/* Latency */}
        <Card>
          <div className="text-[12px] uppercase tracking-wider text-text3 font-medium mb-4">Latência média</div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-text2 inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> CDH
                </span>
                <span className="font-mono text-[14px] text-primary-2 font-semibold">{data.latency.cdh.toFixed(1)}s</span>
              </div>
              <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                <div className="h-2 bg-primary rounded-full transition-all duration-700" style={{ width: `${(data.latency.cdh / 30) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-text2 inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-text3" /> Baseline
                </span>
                <span className="font-mono text-[14px] text-text2 font-semibold">{data.latency.base.toFixed(1)}s</span>
              </div>
              <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                <div className="h-2 bg-text3 rounded-full transition-all duration-700" style={{ width: `${(data.latency.base / 30) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 text-[12px] text-text2">
            {data.latency.base > data.latency.cdh
              ? <>Δ <span className="text-success font-semibold">−{(data.latency.base - data.latency.cdh).toFixed(1)}s</span> mais rápido com CDH</>
              : <>Δ <span className="text-warning font-semibold">+{(data.latency.cdh - data.latency.base).toFixed(1)}s</span> overhead CDH (desambiguação)</>
            }
          </div>
        </Card>

        {/* Token overhead */}
        <Card>
          <div className="text-[12px] uppercase tracking-wider text-text3 font-medium mb-4">Tokens Workers (geral)</div>
          <div className="flex items-end gap-2 mb-3">
            <div className={`text-[28px] font-bold tracking-tight ${data.tokenColor}`}>{data.tokenDelta}</div>
            <div className="text-[12px] text-text2 mb-1.5">CDH vs Baseline</div>
          </div>
          <div className="space-y-2">
            {tokenBreakdown.map((b) => {
              const positive = b.deltaPct.startsWith('+');
              return (
                <div key={b.category} className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-text2 w-10">{b.category}</span>
                  <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${positive ? 'bg-warning' : 'bg-success'}`}
                      style={{ width: `${Math.min(100, Math.abs(parseInt(b.deltaPct)) / 1.6)}%` }}
                    />
                  </div>
                  <span className={`font-mono text-[11px] w-12 text-right ${positive ? 'text-warning' : 'text-success'}`}>{b.deltaPct}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Grouped bar chart — token usage by category */}
      <Card className="mb-4">
        <SectionTitle icon={IconBars} title="Uso de tokens por categoria" />
        <TokenChart data={tokenBreakdown} />
        <div className="flex items-center gap-4 mt-4 text-[12px]">
          <span className="inline-flex items-center gap-1.5 text-text2"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> CDH</span>
          <span className="inline-flex items-center gap-1.5 text-text2"><span className="h-2.5 w-2.5 rounded-sm bg-text3" /> Baseline</span>
        </div>
      </Card>

      {/* Success vs failure breakdown by category */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 mb-8">
        <Card>
          <SectionTitle icon={IconSplit} title="Sucesso vs Falha por categoria" />
          <div className="space-y-5">
            {categoryBreakdown.map((c) => {
              const cdhTotal = c.cdh.success + c.cdh.failed;
              const baseTotal = c.baseline.success + c.baseline.failed;
              return (
                <div key={c.category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[12px] text-text1 font-semibold">{c.category}</span>
                    <span className="text-[11px] text-text3 font-mono">N={cdhTotal}</span>
                  </div>
                  <div className="space-y-2">
                    {/* CDH bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] w-16 text-text2">CDH</span>
                      <div className="flex-1 h-5 bg-surface2/40 rounded-md overflow-hidden flex ring-1 ring-inset ring-white/5">
                        <div className="bg-success h-full flex items-center px-2 text-[10px] font-mono font-semibold text-bg" style={{ width: `${(c.cdh.success / cdhTotal) * 100}%` }}>
                          {c.cdh.success > 2 ? `${c.cdh.success}` : ''}
                        </div>
                        {c.cdh.failed > 0 && (
                          <div className="bg-error h-full flex items-center px-2 text-[10px] font-mono font-semibold text-white" style={{ width: `${(c.cdh.failed / cdhTotal) * 100}%` }}>
                            {c.cdh.failed}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-success w-12 text-right">{((c.cdh.success / cdhTotal) * 100).toFixed(0)}%</span>
                    </div>
                    {/* Baseline bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] w-16 text-text2">Baseline</span>
                      <div className="flex-1 h-5 bg-surface2/40 rounded-md overflow-hidden flex ring-1 ring-inset ring-white/5">
                        <div className="bg-success/70 h-full flex items-center px-2 text-[10px] font-mono font-semibold text-bg" style={{ width: `${(c.baseline.success / baseTotal) * 100}%` }}>
                          {c.baseline.success > 2 ? `${c.baseline.success}` : ''}
                        </div>
                        {c.baseline.failed > 0 && (
                          <div className="bg-error/80 h-full flex items-center px-2 text-[10px] font-mono font-semibold text-white" style={{ width: `${(c.baseline.failed / baseTotal) * 100}%` }}>
                            {c.baseline.failed}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-text2 w-12 text-right">{((c.baseline.success / baseTotal) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/5 text-[11.5px]">
            <span className="inline-flex items-center gap-1.5 text-text2"><span className="h-2.5 w-2.5 rounded-sm bg-success" /> Sucesso</span>
            <span className="inline-flex items-center gap-1.5 text-text2"><span className="h-2.5 w-2.5 rounded-sm bg-error" /> Falha</span>
          </div>
        </Card>

        {/* Recursion failures list */}
        <Card padded={false} className="ring-1 ring-inset ring-error/20">
          <div className="px-5 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconWarning size={16} className="text-error" />
              <h2 className="text-[15px] font-semibold tracking-tight text-text1">Limite de recursão</h2>
            </div>
            <Tag tone="warning">{recursionFailures.length} casos</Tag>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {recursionFailures.map((f) => (
              <li key={f.id} className="px-5 py-3 hover:bg-white/[0.025] transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] text-text3">{f.id}</span>
                  <Tag tone="mono">{f.worker}</Tag>
                </div>
                <div className="text-[12.5px] text-text1 leading-snug line-clamp-2 mb-1">{f.task}</div>
                <div className="flex items-center gap-3 text-[11px] text-text3">
                  <span className="font-mono text-error">react {f.recursion}/15</span>
                  <span className="font-mono">{f.tokensWasted.toLocaleString('pt-BR')} tokens</span>
                  <span className="ml-auto">{f.date}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 bg-bg/40 border-t border-white/5 text-[11.5px] text-text3">
            CDH no mesmo período: <span className="text-success font-semibold">3 falhas</span> <span className="text-text3">(nenhuma por recursão)</span>
          </div>
        </Card>
      </div>

      {/* Ambiguity breakdown — Benchmark II only */}
      {bench === 'II' && (
        <Card className="mb-4">
          <SectionTitle icon={IconQuestion} title="Desempenho por nível de ambiguidade" />
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-text3 border-b border-white/5">
                  <th className="pb-2.5 font-medium w-20">Nível</th>
                  <th className="pb-2.5 font-medium text-center w-12">N</th>
                  <th className="pb-2.5 font-medium text-right">CDH conclusão</th>
                  <th className="pb-2.5 font-medium text-right">Base conclusão</th>
                  <th className="pb-2.5 font-medium text-right pr-4">CDH tokens</th>
                  <th className="pb-2.5 font-medium text-right">Base tokens</th>
                  <th className="pb-2.5 font-medium text-right">Δ tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {ambBreakdown.map((a) => {
                  const delta = a.cdh.tokens - a.baseline.tokens;
                  const deltaPct = ((delta / a.baseline.tokens) * 100).toFixed(0);
                  const positive = delta > 0;
                  return (
                    <tr key={a.level} className="hover:bg-white/[0.02] transition">
                      <td className="py-3">
                        <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
                          a.level === 'ALTA'  ? 'bg-error/15 text-error' :
                          a.level === 'MÉDIA' ? 'bg-warning/15 text-warning' :
                                                'bg-success/15 text-success'
                        }`}>{a.level}</span>
                      </td>
                      <td className="py-3 text-center font-mono text-[12px] text-text3">{a.n}</td>
                      <td className="py-3 text-right">
                        <span className={`font-mono text-[13px] font-semibold ${a.cdh.rate === 100 ? 'text-success' : a.cdh.rate >= 90 ? 'text-success' : 'text-warning'}`}>
                          {a.cdh.rate}%
                        </span>
                        <span className="text-[11px] text-text3 ml-1">({a.cdh.success}/{a.n})</span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`font-mono text-[13px] font-semibold ${a.baseline.rate >= 90 ? 'text-text2' : 'text-error'}`}>
                          {a.baseline.rate}%
                        </span>
                        <span className="text-[11px] text-text3 ml-1">({a.baseline.success}/{a.n})</span>
                      </td>
                      <td className="py-3 text-right pr-4 font-mono text-[12px] text-text2">{a.cdh.tokens.toLocaleString('pt-BR')}</td>
                      <td className="py-3 text-right font-mono text-[12px] text-text3">{a.baseline.tokens.toLocaleString('pt-BR')}</td>
                      <td className="py-3 text-right">
                        <span className={`font-mono text-[12px] font-semibold ${positive ? 'text-warning' : 'text-success'}`}>
                          {positive ? '+' : ''}{deltaPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[12px] text-text3 leading-relaxed">
            Em tarefas de ambiguidade <span className="text-warning font-medium">ALTA</span>, o CDH melhora a conclusão de 67% para 87% (+20 pp) e reduz tokens em 62%. Em tarefas <span className="text-success font-medium">BAIXA</span>, ambos atingem 94% com consumo equivalente — o overhead de desambiguação não compensa.
          </p>
        </Card>
      )}

      {/* Top tasks table */}
      <Card padded={false}>
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-tight text-text1">Top 5 tarefas por consumo</h2>
          <Tag>tokens</Tag>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-text3 border-y border-white/5">
              <th className="px-6 py-2.5 font-medium">Tarefa</th>
              <th className="px-2 py-2.5 font-medium">Categoria</th>
              <th className="px-2 py-2.5 font-medium">Modo</th>
              <th className="px-2 py-2.5 font-medium text-right">Tokens</th>
              <th className="px-2 py-2.5 font-medium text-right">Latência</th>
              <th className="px-6 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {topTokenTasks.map((t, i) => (
              <tr key={t.id} className={`hover:bg-white/[0.025] transition ${i !== topTokenTasks.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                <td className="px-6 py-3 text-text1 max-w-[360px] truncate">{t.task}</td>
                <td className="px-2 py-3"><Tag tone="mono">{t.cat}</Tag></td>
                <td className="px-2 py-3"><ModeBadge mode={t.mode} /></td>
                <td className="px-2 py-3 font-mono text-text1 text-right">{t.tokens.toLocaleString('pt-BR')}</td>
                <td className="px-2 py-3 font-mono text-text2 text-right">{t.latency}</td>
                <td className="px-6 py-3"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const TokenChart = ({ data }) => {
  const max = Math.max(...data.flatMap((d) => [d.cdh, d.baseline]));
  const H = 220;
  return (
    <div className="flex items-end gap-6 sm:gap-12 px-2 sm:px-4 pt-2 pb-8 relative overflow-x-auto">
      {/* gridlines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none px-4 pt-2 pb-8">
        {[0,1,2,3,4].map((i) => (
          <div key={i} className="border-t border-white/[0.04] flex justify-end">
            <span className="text-[10px] font-mono text-text3 -translate-y-2 -translate-x-2">
              {Math.round((max * (4 - i) / 4) / 1000)}k
            </span>
          </div>
        ))}
      </div>
      {data.map((d) => (
        <div key={d.category} className="flex-1 flex flex-col items-center relative z-10">
          <div className="flex items-end gap-2 h-[220px]">
            <div className="w-10 bg-gradient-to-t from-primary/60 to-primary rounded-t-md transition-all duration-700 relative group" style={{ height: `${(d.cdh / max) * H}px` }}>
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-text2 whitespace-nowrap">{(d.cdh/1000).toFixed(1)}k</span>
            </div>
            <div className="w-10 bg-text3/70 rounded-t-md transition-all duration-700 relative" style={{ height: `${(d.baseline / max) * H}px` }}>
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-text3 whitespace-nowrap">{(d.baseline/1000).toFixed(1)}k</span>
            </div>
          </div>
          <div className="mt-2 text-[12px] font-medium text-text1">{d.category}</div>
          <div className="text-[10px] text-text3">{d.deltaPct}</div>
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { MetricsScreen });
