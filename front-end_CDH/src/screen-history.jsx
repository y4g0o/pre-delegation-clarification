/* Screen 5 — History (filterable, expandable rows) */

const HistoryScreen = () => {
  const [search, setSearch]   = React.useState('');
  const [modeF, setModeF]     = React.useState('all');
  const [statusF, setStatusF] = React.useState('all');
  const [evalF, setEvalF]     = React.useState('all');
  const [expanded, setExpanded] = React.useState(null);
  const [evalsTick, setEvalsTick] = React.useState(0);
  const evals = React.useMemo(() => loadAllLikert(), [evalsTick, expanded]);

  // Re-read evaluations when collapse happens (form may have saved)
  React.useEffect(() => { setEvalsTick((t) => t + 1); }, [expanded]);

  const rowEval = (id) => evals[id];
  const rowAvg  = (id) => {
    const e = evals[id];
    if (!e) return null;
    const vals = Object.values(e.values);
    return vals.reduce((a,b) => a+b, 0) / vals.length;
  };

  const rows = HISTORY.filter((r) => {
    if (search && !r.task.toLowerCase().includes(search.toLowerCase())) return false;
    if (modeF !== 'all' && r.mode !== modeF) return false;
    if (statusF !== 'all' && r.status !== statusF) return false;
    if (evalF === 'rated'   && !rowEval(r.id)) return false;
    if (evalF === 'unrated' && rowEval(r.id))  return false;
    return true;
  });

  const ratedCount = HISTORY.filter((r) => rowEval(r.id)).length;
  const overallAvg = (() => {
    const evs = Object.values(evals);
    if (!evs.length) return null;
    const all = evs.flatMap((e) => Object.values(e.values));
    return (all.reduce((a,b)=>a+b,0) / all.length).toFixed(2);
  })();

  return (
    <div className="screen-enter">
      <PageHeader
        eyebrow="Registros"
        title="Histórico de Execuções"
        subtitle="Todas as tarefas executadas, filtráveis por modo, status e data."
        action={
          <Button
            variant="outline"
            size="sm"
            icon={IconExport}
            onClick={() => {
              const payload = HISTORY.map((r) => ({
                ...r,
                evaluation: evals[r.id]
                  ? { values: evals[r.id].values, comment: evals[r.id].comment, avg: rowAvg(r.id) }
                  : null,
              }));
              exportJSON(payload, `cdh-historico-${Date.now()}.json`);
            }}
          >
            Exportar JSON
          </Button>
        }
      />

      {/* Evaluation summary banner */}
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/15 ring-1 ring-inset ring-primary/30 flex items-center justify-center text-primary-2">
              <IconBars size={18} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-text1">Avaliações Likert</div>
              <div className="text-[11.5px] text-text3">Clique em uma tarefa para avaliá-la em 5 critérios.</div>
            </div>
          </div>
          <div className="sm:ml-auto grid grid-cols-3 gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3 font-medium">Avaliadas</div>
              <div className="font-mono text-[18px] text-text1 font-semibold">{ratedCount}<span className="text-text3 text-[12px]"> / {HISTORY.length}</span></div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3 font-medium">Média geral</div>
              <div className="font-mono text-[18px] text-primary-2 font-semibold">{overallAvg ?? '—'}{overallAvg && <span className="text-text3 text-[12px]"> / 5</span>}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3 font-medium">Pendentes</div>
              <div className="font-mono text-[18px] text-warning font-semibold">{HISTORY.length - ratedCount}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter bar */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_160px_160px_160px_160px] gap-3">
          <Input icon={IconSearch} placeholder="Buscar por descrição da tarefa…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select
            value={modeF}
            onChange={(e) => setModeF(e.target.value)}
            options={[{ value: 'all', label: 'Modo · Todos' }, { value: 'CDH', label: 'CDH' }, { value: 'Baseline', label: 'Baseline' }]}
          />
          <Select
            value={statusF}
            onChange={(e) => setStatusF(e.target.value)}
            options={[
              { value: 'all',     label: 'Status · Todos' },
              { value: 'success', label: 'Sucesso' },
              { value: 'failed',  label: 'Falhou' },
              { value: 'running', label: 'Executando' },
            ]}
          />
          <Select
            value={evalF}
            onChange={(e) => setEvalF(e.target.value)}
            options={[
              { value: 'all',     label: 'Avaliação · Todas' },
              { value: 'rated',   label: 'Já avaliadas' },
              { value: 'unrated', label: 'Sem avaliação' },
            ]}
          />
          <Select
            value="last7"
            onChange={() => {}}
            options={[
              { value: 'last7',  label: 'Últimos 7 dias' },
              { value: 'last30', label: 'Últimos 30 dias' },
              { value: 'all',    label: 'Período total' },
            ]}
          />
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-text1">{rows.length} execuções</h2>
            <Tag>filtrado</Tag>
          </div>
          <div className="text-[11px] text-text3 font-mono">ordenado por data ↓</div>
        </div>

        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-text3 border-b border-white/5">
              <th className="pl-6 pr-2 py-2.5 font-medium w-8"></th>
              <th className="px-2 py-2.5 font-medium w-12">#</th>
              <th className="px-2 py-2.5 font-medium">Tarefa</th>
              <th className="px-2 py-2.5 font-medium">Modo</th>
              <th className="px-2 py-2.5 font-medium">Worker</th>
              <th className="px-2 py-2.5 font-medium text-right">Tokens</th>
              <th className="px-2 py-2.5 font-medium text-right">Latência</th>
              <th className="px-2 py-2.5 font-medium text-right">Cycles</th>
              <th className="px-2 py-2.5 font-medium">Status</th>
              <th className="px-2 py-2.5 font-medium">Avaliação</th>
              <th className="px-6 py-2.5 font-medium text-right">Data</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isOpen = expanded === r.id;
              return (
                <React.Fragment key={r.id}>
                  <tr
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className={`hover:bg-white/[0.025] transition cursor-pointer ${isOpen ? 'bg-white/[0.025]' : ''} ${i !== rows.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                  >
                    <td className="pl-6 pr-2 py-3">
                      <span className={`inline-block transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                        <IconChevronRight size={14} className="text-text3" />
                      </span>
                    </td>
                    <td className="px-2 py-3 font-mono text-[12px] text-text3">{r.n}</td>
                    <td className="px-2 py-3 text-text1 max-w-[380px]"><div className="truncate">{r.task}</div></td>
                    <td className="px-2 py-3"><ModeBadge mode={r.mode} /></td>
                    <td className="px-2 py-3"><Tag tone="mono">{r.worker}</Tag></td>
                    <td className="px-2 py-3 font-mono text-text1 text-right">{r.tokens.toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-3 font-mono text-text2 text-right">{r.duration}</td>
                    <td className="px-2 py-3 font-mono text-warning text-right">{r.cycles}</td>
                    <td className="px-2 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-2 py-3">
                      {(() => {
                        const avg = rowAvg(r.id);
                        if (avg == null) return <span className="text-[11px] text-text3">— pendente</span>;
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/15 text-primary-2 text-[11px] font-mono ring-1 ring-inset ring-primary/30">
                            <IconCheck size={10} /> {avg.toFixed(1)}/5
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-3 text-right text-text3 text-[12px]">{r.date}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-bg/40 border-b border-white/[0.04]">
                      <td colSpan={11} className="px-6 py-5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Texto da tarefa</div>
                            <div className="bg-surface2/40 rounded-md p-3 text-[13px] text-text1 leading-relaxed ring-1 ring-inset ring-white/5">
                              {r.task}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-4 mb-2">Resposta final</div>
                            <div className="bg-surface2/40 rounded-md p-4 ring-1 ring-inset ring-white/5 max-h-[320px] overflow-auto">
                              <Markdown>{responseFor(r.id, r.task)}</Markdown>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Log do ciclo</div>
                            <div className="bg-bg/80 rounded-md p-3 ring-1 ring-inset ring-white/5 font-mono text-[12px] leading-relaxed text-text2 max-h-[280px] overflow-auto">
                              {CYCLE_DETAIL_LOG.map((line, idx) => (
                                <div key={idx} className="py-0.5">
                                  <span className={
                                    line.includes('DONE')        ? 'text-success'   :
                                    line.includes('CDH cycle')   ? 'text-warning'   :
                                    line.includes('Supervisor')  ? 'text-primary-2' :
                                    line.includes('PESQ')        ? 'text-sky-400'   : 'text-text2'
                                  }>{line}</span>
                                </div>
                              ))}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mt-4 mb-2">Avaliação do usuário</div>
                            <LikertForm taskId={r.id} taskTitle={r.task} compact />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-text3 text-[13px]">
                  Nenhum resultado para os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

Object.assign(window, { HistoryScreen });
