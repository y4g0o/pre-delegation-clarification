/* Screen 2 — Submit New Task */

const NewTaskScreen = ({ onNavigate, setExecPayload }) => {
  const [mode, setMode] = React.useState('CDH');
  const [task, setTask] = React.useState('');
  const [supModel, setSupModel] = React.useState('llama3.1:8b');
  const [wkrModel, setWkrModel] = React.useState('llama3.1:8b');
  const [submitting, setSubmitting] = React.useState(false);
  const [showClarif, setShowClarif] = React.useState(false);
  const [availableModels, setAvailableModels] = React.useState([
    'llama3.1:8b',
    'llama3.2:3b',
    'qwen2.5-coder:7b',
    'mistral:7b',
  ]);
  const [submitError, setSubmitError] = React.useState(null);

  // Carrega modelos reais do Ollama via backend; falha silenciosa cai no fallback
  React.useEffect(() => {
    let cancelled = false;
    fetchOllamaModels().then((models) => {
      if (cancelled || !models.length) return;
      setAvailableModels(models);
      if (!models.includes(supModel)) setSupModel(models[0]);
      if (!models.includes(wkrModel)) setWkrModel(models[0]);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exampleClick = (txt) => setTask(txt);

  const submit = (e) => {
    e.preventDefault();
    if (!task.trim()) return;
    if (mode === 'CDH') {
      setShowClarif(true);
      return;
    }
    runTask(null);
  };

  const runTask = async (clarification) => {
    setSubmitting(true);
    setSubmitError(null);
    const fullTask = clarification
      ? `${task}\n\nEsclarecimento: ${clarification}`
      : task;

    try {
      const resp = await fetch(`${API_BASE}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: fullTask,
          mode: mode.toLowerCase(),
          supervisor_model: supModel,
          worker_model: wkrModel,
        }),
      });
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try {
          const errBody = await resp.json();
          if (errBody?.detail) detail = errBody.detail;
        } catch (_) {}
        throw new Error(detail);
      }
      const { task_id } = await resp.json();
      if (setExecPayload) {
        setExecPayload({ task: fullTask, mode, supModel, wkrModel, task_id, clarification });
      }
      onNavigate('execution');
      setShowClarif(false);
    } catch (err) {
      // Falha de submissão — mostra erro real e oferece modo demo explícito
      const msg = err?.message || String(err);
      console.warn('[CDH] falha em /api/run:', err);
      setSubmitError(
        `Falha ao contatar o backend (${msg}). Verifique se está rodando em ${API_BASE} ou use "Modo demo" abaixo.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const runDemoMode = () => {
    setSubmitError(null);
    const fullTask = task;
    if (setExecPayload) {
      setExecPayload({ task: fullTask, mode, supModel, wkrModel, task_id: null, clarification: null });
    }
    setShowClarif(false);
    onNavigate('execution');
  };

  const modelOptions = availableModels.map((m) => ({ value: m, label: m }));

  return (
    <div className="screen-enter max-w-[860px] mx-auto">
      <PageHeader
        eyebrow="Execução"
        title="Nova Tarefa"
        subtitle="Envie uma instrução em linguagem natural. Escolha o modo de execução e os modelos."
      />

      <Card>
        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-[12px] uppercase tracking-wider text-text3 font-medium mb-2">
              Descrição da tarefa
            </label>
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Descreva sua tarefa..."
              rows={5}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[11px] text-text3 self-center mr-1">Exemplos:</span>
              {[
                'Calcular a raiz quadrada de 2048 e explicar o método.',
                'Escrever um resumo sobre LangGraph.',
                'Buscar artigos recentes sobre arquiteturas multi-agente.',
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => exampleClick(ex)}
                  className="text-[11px] text-text2 hover:text-text1 bg-surface2/60 hover:bg-surface2 px-2.5 py-1 rounded-md ring-1 ring-inset ring-white/5 transition"
                >
                  “{ex.length > 48 ? ex.slice(0, 48) + '…' : ex}”
                </button>
              ))}
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <label className="block text-[12px] uppercase tracking-wider text-text3 font-medium mb-2">
              Modo de execução
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'CDH',      title: 'Modo CDH',      desc: 'Ciclo de desambiguação ativo — maior precisão',     tag: 'Recomendado', icon: IconBolt },
                { id: 'Baseline', title: 'Modo Baseline', desc: 'Execução direta — mais rápido, sem desambiguação',  tag: 'Comparativo', icon: IconArrowRight },
              ].map((opt) => {
                const active = mode === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    className={`relative text-left p-4 rounded-md transition-all ${
                      active
                        ? 'bg-primary/10 ring-2 ring-primary shadow-glow-primary'
                        : 'bg-surface2/40 ring-1 ring-inset ring-white/5 hover:bg-surface2/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${active ? 'bg-primary text-white' : 'bg-surface text-text2'}`}>
                          <Icon size={14} />
                        </div>
                        <span className={`text-[15px] font-semibold ${active ? 'text-text1' : 'text-text1'}`}>{opt.title}</span>
                      </div>
                      <Tag tone={active ? 'primary' : 'default'}>{opt.tag}</Tag>
                    </div>
                    <p className="text-[12.5px] text-text2 leading-snug">{opt.desc}</p>
                    {active && (
                      <div className="absolute top-3 right-3 h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center">
                        <IconCheck size={10} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] uppercase tracking-wider text-text3 font-medium mb-2">
                Modelo do Supervisor
              </label>
              <Select
                value={supModel}
                onChange={(e) => setSupModel(e.target.value)}
                options={modelOptions}
              />
            </div>
            <div>
              <label className="block text-[12px] uppercase tracking-wider text-text3 font-medium mb-2">
                Modelo dos Workers
              </label>
              <Select
                value={wkrModel}
                onChange={(e) => setWkrModel(e.target.value)}
                options={modelOptions}
              />
            </div>
          </div>

          {submitError && (
            <div className="text-[12px] text-error bg-error/10 ring-1 ring-inset ring-error/20 px-3 py-2 rounded-md">
              <div className="mb-2">{submitError}</div>
              <button
                type="button"
                onClick={runDemoMode}
                className="text-[11px] text-text1 bg-surface2 hover:bg-surface2/80 ring-1 ring-inset ring-white/10 px-2.5 py-1 rounded-md transition"
              >
                Continuar em Modo demo
              </button>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            iconRight={IconArrowRight}
            disabled={!task.trim() || submitting}
          >
            {submitting ? 'Enviando…' : 'Executar Tarefa'}
          </Button>
        </form>
      </Card>

      <ClarificationDialog
        open={showClarif}
        taskText={task}
        mode={mode}
        onCancel={() => setShowClarif(false)}
        onConfirm={(payload) => runTask(payload)}
      />

      {/* Last 3 tasks */}
      <div className="mt-8">
        <SectionTitle icon={IconClock} title="Últimas 3 execuções" />
        <Card padded={false}>
          <ul className="divide-y divide-white/[0.04]">
            {RECENT_TASKS.slice(0, 3).map((t) => (
              <li key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.025] transition">
                <span className="font-mono text-[11px] text-text3 w-14">{t.id}</span>
                <span className="flex-1 text-[13px] text-text1 truncate">{t.task}</span>
                <ModeBadge mode={t.mode} />
                <StatusBadge status={t.status} />
                <span className="text-[11px] text-text3 w-16 text-right">{t.ago}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

Object.assign(window, { NewTaskScreen });
