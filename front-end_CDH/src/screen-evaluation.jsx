/* Screen 7 — Avaliação Likert de tarefas do benchmark */

const EvaluationScreen = () => {
  const [tasks, setTasks] = React.useState(() => buildDefaultTasks());
  const [selected, setSelected] = React.useState(null);
  const [filterMode, setFilterMode] = React.useState('all');
  const [filterCat, setFilterCat] = React.useState('all');
  const [filterEval, setFilterEval] = React.useState('all'); // all | done | pending
  const [allEvals, setAllEvals] = React.useState(() => loadAllLikert());
  const refreshEvals = () => setAllEvals(loadAllLikert());

  function buildDefaultTasks() {
    const seen = new Set();
    const out = [];
    [...RECENT_TASKS, ...HISTORY].forEach((t) => {
      if (!seen.has(t.id) && t.status !== 'running') {
        seen.add(t.id);
        out.push(t);
      }
    });
    return out;
  }

  // Normaliza campos do benchmark_v3_results.json para o formato interno do dashboard
  function normalizeBenchmarkRow(r) {
    return {
      id:       r.id,
      task:     r.task,
      mode:     r.modo   || r.mode   || '—',
      worker:   r.cat    || r.worker || '—',
      status:   r.sucesso != null ? (r.sucesso ? 'success' : 'failed') : (r.status || 'queued'),
      duration: r.latencia_s != null ? `${r.latencia_s}s` : (r.duration || '—'),
      tokens:   r.tokens_total ?? r.tokens ?? 0,
      amb:      r.amb    || '—',
      resposta:      r.resposta      || '',
      instrucao_cdh: r.instrucao_cdh || '',
    };
  }

  // Auto-load do benchmark via backend (silencioso se offline)
  const [autoLoadState, setAutoLoadState] = React.useState('loading'); // loading | ok | offline
  React.useEffect(() => {
    let cancelled = false;
    const base = (window.API_BASE || 'http://localhost:8000');
    fetch(`${base}/api/results/benchmark_v3_results.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => {
        if (cancelled) return;
        const rows = Array.isArray(json) ? json : (json.results || json.tasks || []);
        if (rows.length) {
          setTasks(rows.map(normalizeBenchmarkRow));
          setAutoLoadState('ok');
        } else {
          setAutoLoadState('offline');
        }
      })
      .catch(() => { if (!cancelled) setAutoLoadState('offline'); });
    return () => { cancelled = true; };
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        const rows = Array.isArray(json) ? json : (json.results || json.tasks || []);
        if (rows.length) setTasks(rows.map(normalizeBenchmarkRow));
      } catch {
        alert('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  const evalKey = (t) => `${t.id}_${t.mode}`;

  const filtered = tasks.filter((t) => {
    if (filterMode !== 'all' && t.mode !== filterMode) return false;
    if (filterCat  !== 'all' && t.worker !== filterCat)  return false;
    if (filterEval === 'done'    && !allEvals[evalKey(t)])  return false;
    if (filterEval === 'pending' &&  allEvals[evalKey(t)])  return false;
    return true;
  });

  const evaluated = tasks.filter((t) => allEvals[evalKey(t)]).length;
  const pct = tasks.length ? Math.round((evaluated / tasks.length) * 100) : 0;

  const handleExport = () => {
    const rows = tasks
      .filter((t) => allEvals[evalKey(t)])
      .map((t) => {
        const ev = allEvals[evalKey(t)];
        return {
          id: t.id,
          task: t.task,
          mode: t.mode,
          worker: t.worker,
          status: t.status,
          ...Object.fromEntries(
            Object.entries(ev.values).map(([k, v]) => [`likert_${k}`, v])
          ),
          avg: (Object.values(ev.values).reduce((a, b) => a + b, 0) / LIKERT_CRITERIA.length).toFixed(2),
          comment: ev.comment,
          evaluatedAt: ev.at,
        };
      });
    exportCSV(rows, `cdh-likert-${Date.now()}.csv`);
  };

  const handleExportJSON = () => {
    exportJSON(
      tasks.filter((t) => allEvals[evalKey(t)]).map((t) => ({ task: t, evaluation: allEvals[evalKey(t)] })),
      `cdh-likert-${Date.now()}.json`
    );
  };

  return (
    <div className="screen-enter max-w-[1200px] mx-auto">
      <PageHeader
        eyebrow="Pesquisa qualitativa"
        title="Avaliação"
        subtitle="Avalie respostas do benchmark com escala Likert de 5 pontos."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={IconExport} onClick={handleExport} disabled={evaluated === 0}>
              CSV
            </Button>
            <Button variant="outline" size="sm" icon={IconExport} onClick={handleExportJSON} disabled={evaluated === 0}>
              JSON
            </Button>
          </div>
        }
      />

      {/* Progress bar */}
      <div className="mb-6 bg-surface rounded-lg p-4 border border-white/[0.04]">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] text-text2">Progresso da avaliação</div>
          <div className="font-mono text-[13px] text-text1 font-semibold">{evaluated} / {tasks.length} <span className="text-text3 font-normal">({pct}%)</span></div>
        </div>
        <div className="h-2 bg-surface2 rounded-full overflow-hidden">
          <div
            className="h-2 bg-primary rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && (
          <p className="mt-2 text-[12px] text-success flex items-center gap-1.5">
            <IconCheck size={13} /> Todas as tarefas avaliadas. Exporte os dados acima.
          </p>
        )}
      </div>

      {/* Filters + upload row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="w-[140px]"
          options={[
            { value: 'all',      label: 'Todos os modos' },
            { value: 'cdh',      label: 'CDH' },
            { value: 'cot',      label: 'CoT-Baseline' },
            { value: 'baseline', label: 'Baseline' },
          ]}
        />
        <Select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="w-[140px]"
          options={[
            { value: 'all',  label: 'Todas categorias' },
            { value: 'PESQ', label: 'PESQ' },
            { value: 'CALC', label: 'CALC' },
            { value: 'ESC',  label: 'ESC' },
          ]}
        />
        <Select
          value={filterEval}
          onChange={(e) => setFilterEval(e.target.value)}
          className="w-[150px]"
          options={[
            { value: 'all',     label: 'Todas' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'done',    label: 'Avaliadas' },
          ]}
        />
        <div className="ml-auto">
          <label className="h-10 px-3 inline-flex items-center gap-2 rounded-md text-[13px] font-medium bg-transparent ring-1 ring-inset ring-white/10 text-text1 hover:bg-surface2 transition cursor-pointer">
            <IconBars size={15} className="text-text2" />
            Carregar JSON
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">

        {/* Left — task list */}
        <div className="bg-surface rounded-lg border border-white/[0.04] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-text1">Tarefas</span>
            <Tag tone={filtered.length ? 'default' : 'warning'}>{filtered.length}</Tag>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-text3">Nenhuma tarefa para os filtros selecionados.</div>
          ) : (
            <ul className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
              {filtered.map((t) => {
                const isActive = selected?.id === t.id;
                const isDone   = !!allEvals[evalKey(t)];
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelected(t)}
                      className={`w-full text-left px-4 py-3 transition ${isActive ? 'bg-primary/10 ring-inset ring-1 ring-primary/30' : 'hover:bg-white/[0.025]'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10.5px] text-text3">{t.id}</span>
                        <div className="flex items-center gap-1.5">
                          <ModeBadge mode={t.mode} />
                          {isDone && <span className="h-4 w-4 rounded-full bg-success/20 flex items-center justify-center"><IconCheck size={9} className="text-success" /></span>}
                        </div>
                      </div>
                      <div className="text-[12.5px] text-text1 leading-snug line-clamp-2">{t.task}</div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-text3">
                        <Tag tone="mono">{t.worker || t.cat}</Tag>
                        <StatusBadge status={t.status} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right — task detail + Likert form */}
        <div>
          {selected ? (
            <div className="space-y-4">
              {/* Task detail card */}
              <Card>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] text-text3">{selected.id}</span>
                      <ModeBadge mode={selected.mode} />
                      {selected.amb && selected.amb !== '—' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-text3 font-mono">AMB:{selected.amb}</span>
                      )}
                    </div>
                    <h2 className="text-[16px] font-semibold text-text1 leading-snug">{selected.task}</h2>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-text3 hover:text-text1 transition shrink-0"
                    aria-label="Fechar"
                  >
                    <IconX size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-[12px]">
                  <ModeBadge mode={selected.mode} />
                  <Tag tone="mono">{selected.worker || selected.cat}</Tag>
                  <StatusBadge status={selected.status} />
                  {selected.duration && selected.duration !== '—' && (
                    <Tag><IconClock size={11} className="inline mr-0.5" />{selected.duration}</Tag>
                  )}
                  {selected.tokens > 0 && (
                    <Tag><IconCoins size={11} className="inline mr-0.5" />{selected.tokens.toLocaleString('pt-BR')} tok</Tag>
                  )}
                </div>
                {selected.instrucao_cdh && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="text-[11px] font-semibold text-text3 uppercase tracking-wide mb-2">
                      Instrução gerada pelo Supervisor <span className="text-primary-2 normal-case font-normal">({selected.mode})</span>
                    </div>
                    <div className="text-[12px] text-text2 leading-relaxed italic bg-primary/5 border border-primary/10 rounded-md px-3 py-2">
                      {selected.instrucao_cdh}
                    </div>
                  </div>
                )}
                {selected.resposta ? (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <div className="text-[11px] font-semibold text-text3 uppercase tracking-wide mb-2">Resposta do Worker</div>
                    <div className="text-[13px] text-text1 leading-relaxed whitespace-pre-wrap bg-surface2 rounded-md px-3 py-3 max-h-52 overflow-y-auto">
                      {selected.resposta}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] text-[12px] text-text3 italic">
                    Resposta não disponível — carregue o JSON gerado pelo <code className="font-mono text-primary-2">--sample</code>.
                  </div>
                )}
              </Card>

              {/* Likert form */}
              <LikertForm
                taskId={evalKey(selected)}
                taskTitle={selected.task}
                mode={selected.mode}
                onSubmitted={() => {
                  refreshEvals();
                  const currentIdx = tasks.findIndex((t) => evalKey(t) === evalKey(selected));
                  const next = currentIdx >= 0 ? tasks[currentIdx + 1] : undefined;
                  if (next) setSelected(next);
                }}
              />
            </div>
          ) : (
            <div className="bg-surface rounded-lg border border-white/[0.04] flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="h-12 w-12 rounded-full bg-surface2 flex items-center justify-center mb-4">
                <IconClipboard size={22} className="text-text3" />
              </div>
              <p className="text-[14px] font-medium text-text1 mb-1">Selecione uma tarefa</p>
              <p className="text-[13px] text-text3 max-w-xs">Clique em qualquer item à esquerda para iniciar a avaliação Likert.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { EvaluationScreen });
