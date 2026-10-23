/* Execution screen — animação simulada para modo demo + polling real para tarefas
   submetidas ao backend. Quando taskId está presente, faz poll a cada 2s em
   /api/run/{taskId}/status. Ao terminar, exibe o resultado real (instrução CDH,
   tipo de ambiguidade, confiança, workers utilizados, resposta em Markdown). */

const EXEC_STEPS_CDH = [
  { t: 600,  label: 'Supervisor analisando entrada',           tag: 'Supervisor' },
  { t: 1100, label: 'Ciclo CDH 1 — desambiguação aplicada',    tag: 'CDH' },
  { t: 1700, label: 'Roteamento determinado · delegando',      tag: 'Supervisor' },
  { t: 2400, label: 'Worker executando · react step 1/4',      tag: 'Worker' },
  { t: 3200, label: 'Tool call · web_search retornado',        tag: 'Tool' },
  { t: 3900, label: 'Worker compilando observação final',      tag: 'Worker' },
  { t: 4600, label: 'Supervisor sintetizando resposta',        tag: 'Supervisor' },
  { t: 5200, label: 'Concluído',                               tag: 'Done' },
];

const TAG_TONE = {
  Supervisor: 'text-primary-2',
  CDH:        'text-warning',
  Worker:     'text-sky-400',
  Tool:       'text-fuchsia-400',
  Done:       'text-success',
};

const ExecutionScreen = ({ taskText, mode, onComplete, onCancel, onNavigate, taskId, setExecPayload }) => {
  const [now, setNow] = React.useState(0);
  const [aborted, setAborted] = React.useState(false);
  const [status, setStatus] = React.useState('running'); // running | done | error
  const [result, setResult] = React.useState(null);
  const [pollError, setPollError] = React.useState(null);
  const startRef = React.useRef(Date.now());

  // ── Modo DEMO (sem backend): mantém animação simulada original ──
  React.useEffect(() => {
    if (taskId) return; // backend real assume controle abaixo
    if (aborted) return;
    let raf;
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      setNow(elapsed);
      if (elapsed < EXEC_STEPS_CDH[EXEC_STEPS_CDH.length - 1].t + 600) {
        raf = requestAnimationFrame(tick);
      } else {
        setStatus('done');
        // Modo demo navega direto para o grafo (comportamento legado)
        onComplete && onComplete();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [aborted, taskId]);

  // ── Modo REAL: polling no backend ──
  React.useEffect(() => {
    if (!taskId || aborted) return;
    let cancelled = false;

    const tickElapsed = () => {
      if (cancelled) return;
      setNow(Date.now() - startRef.current);
    };
    const elapsedTimer = setInterval(tickElapsed, 200);

    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/run/${taskId}/status`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        if (data.status === 'done') {
          setResult(data.result);
          setStatus('done');
          clearInterval(elapsedTimer);
          clearInterval(pollTimer);
        } else if (data.status === 'error') {
          setStatus('error');
          setPollError(data.error || 'Erro desconhecido no backend.');
          clearInterval(elapsedTimer);
          clearInterval(pollTimer);
        }
      } catch (e) {
        // erros de rede transitórios são silenciados — backend pode reiniciar
        console.warn('[CDH] poll error:', e);
      }
    };
    poll();
    const pollTimer = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      clearInterval(elapsedTimer);
      clearInterval(pollTimer);
    };
  }, [taskId, aborted]);

  // ── Animação derivada (compartilhada entre demo e real) ──
  const total = EXEC_STEPS_CDH[EXEC_STEPS_CDH.length - 1].t;
  // Em modo real, o "progresso" é cosmético — anda até 90% e fica esperando o backend
  const pct = taskId
    ? (status === 'done' ? 100 : Math.min(90, (now / 8000) * 90))
    : Math.min(100, (now / total) * 100);
  const currentIdx = EXEC_STEPS_CDH.findIndex((s) => s.t > now);
  const liveIdx = currentIdx === -1 ? EXEC_STEPS_CDH.length - 1 : Math.max(0, currentIdx - 1);

  const tokensSoFar = result?.tokens_grand_total
    ?? result?.tokens_total
    ?? Math.floor((now / total) * 3120);
  const reactSteps = result?.ciclos_react ?? Math.min(4, Math.floor((now / total) * 5));

  // ── RESULT VIEW ──
  if (status === 'done' && result) {
    return (
      <ExecutionResult
        result={result}
        taskText={taskText}
        mode={mode}
        elapsed={result.latencia_s ?? (now / 1000)}
        onNavigate={onNavigate}
        setExecPayload={setExecPayload}
      />
    );
  }

  if (status === 'error') {
    return (
      <div className="screen-enter max-w-[920px] mx-auto">
        <PageHeader
          eyebrow="Erro"
          title="Falha na execução"
          subtitle="O backend retornou um erro durante a execução desta tarefa."
        />
        <Card>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-error/15 ring-1 ring-inset ring-error/30 flex items-center justify-center text-error shrink-0">
              <IconWarning size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] text-text1 font-semibold mb-1">Erro durante a execução</div>
              <pre className="text-[12px] font-mono text-text2 bg-surface2 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap">
                {pollError || 'Erro desconhecido.'}
              </pre>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onNavigate && onNavigate('new')}>
                  Nova tarefa
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="screen-enter max-w-[920px] mx-auto">
      <PageHeader
        eyebrow={taskId ? 'Em andamento (backend real)' : 'Em andamento (modo demo)'}
        title="Executando tarefa"
        subtitle={taskId
          ? 'Acompanhe o ciclo em tempo real. O resultado será exibido abaixo quando o backend concluir.'
          : 'Backend offline — exibindo animação simulada. Suba o backend para execução real.'}
        action={
          <Button variant="outline" size="sm" icon={IconStop} onClick={() => { setAborted(true); onCancel && onCancel(); }}>
            Abortar
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex items-start gap-4">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="#293548" strokeWidth="4" fill="none" />
              <circle
                cx="28" cy="28" r="24"
                stroke="url(#execGrad)" strokeWidth="4" fill="none"
                strokeDasharray={2 * Math.PI * 24}
                strokeDashoffset={(1 - pct / 100) * 2 * Math.PI * 24}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 200ms linear' }}
              />
              <defs>
                <linearGradient id="execGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-text1 font-semibold">
              {Math.round(pct)}%
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ModeBadge mode={mode} />
              <span className="text-[11px] text-text3 font-mono">{taskId ? `task ${taskId.slice(0, 8)}` : 'cycle 1/3'}</span>
              <Tag tone="warning"><span className="dot-pulse">●</span> live</Tag>
            </div>
            <div className="text-[14px] text-text1 leading-snug truncate font-medium">{taskText || 'Tarefa em execução…'}</div>
            <div className="text-[12px] text-text3 mt-0.5 truncate font-mono">
              {taskId
                ? (status === 'running' ? 'aguardando resposta do backend…' : '')
                : EXEC_STEPS_CDH[liveIdx]?.label}
            </div>
          </div>
          <div className="hidden sm:grid grid-cols-3 gap-5 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3">Elapsed</div>
              <div className="font-mono text-[15px] text-text1 font-semibold">{(now / 1000).toFixed(1)}s</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3">Tokens</div>
              <div className="font-mono text-[15px] text-primary-2 font-semibold">{(tokensSoFar || 0).toLocaleString('pt-BR')}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3">React</div>
              <div className="font-mono text-[15px] text-warning font-semibold">{reactSteps}/10</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle title="Linha do tempo do ciclo" icon={IconClock} />
          <div className="space-y-0.5">
            {EXEC_STEPS_CDH.map((s, i) => {
              const passed = now >= s.t;
              const isLive = i === liveIdx && now < total;
              return (
                <div key={i} className={`flex items-center gap-3 py-2 transition-opacity ${passed ? 'opacity-100' : 'opacity-45'}`}>
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                    passed && !isLive ? 'bg-success/20 text-success ring-1 ring-inset ring-success/30' :
                    isLive            ? 'bg-primary/15 ring-2 ring-primary text-primary-2 dot-pulse' :
                                        'bg-surface2 text-text3 ring-1 ring-inset ring-white/5'
                  }`}>
                    {passed && !isLive ? <IconCheck size={11} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  <span className={`text-[13px] flex-1 ${passed ? 'text-text1' : 'text-text2'}`}>{s.label}</span>
                  <span className={`font-mono text-[10px] ${TAG_TONE[s.tag] || 'text-text3'}`}>{s.tag}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/5">
            <h2 className="text-[15px] font-semibold tracking-tight text-text1">Log ao vivo</h2>
            <Tag tone="warning">stream</Tag>
          </div>
          <div className="px-5 py-3 font-mono text-[12px] leading-relaxed max-h-[320px] overflow-auto">
            {AGENT_LOG.slice(0, Math.max(2, Math.floor((now / total) * AGENT_LOG.length))).map((l, i) => (
              <div key={i} className="flex gap-2 py-0.5">
                <span className="text-text3 shrink-0">[{l.t}]</span>
                <span className={`${l.tone} font-semibold shrink-0`}>{l.who}</span>
                <span className="text-text3">›</span>
                <span className="text-text2">{l.msg}</span>
              </div>
            ))}
            {(now < total || (taskId && status === 'running')) && (
              <div className="flex items-center gap-2 py-1.5">
                <span className="text-text3">»</span>
                <span className="text-text2 italic">processando…</span>
                <span className="inline-block h-3 w-1.5 bg-primary-2 animate-pulse" />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ── ExecutionResult — exibido quando o backend retorna `done` ───────── */
const ExecutionResult = ({ result, taskText, mode, elapsed, onNavigate, setExecPayload }) => {
  const ok = result.sucesso;
  const workers = (result.workers_escolhidos || []).filter(Boolean);
  const tokens = result.tokens_grand_total ?? result.tokens_total ?? 0;
  const ciclos = result.ciclos_react ?? 0;

  const handleSaveHistory = () => {
    try {
      const key = 'cdh_local_history';
      const prev = JSON.parse(localStorage.getItem(key) || '[]');
      prev.unshift({
        id: `LOCAL_${Date.now()}`,
        task: taskText,
        mode,
        worker: workers[0] || result.cat || '—',
        tokens: result.tokens_total || 0,
        duration: `${(elapsed || 0).toFixed(1)}s`,
        cycles: ciclos,
        status: ok ? 'success' : 'failed',
        date: new Date().toLocaleDateString('pt-BR'),
        result,
      });
      localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
      alert('Salvo no histórico local.');
    } catch {
      alert('Falha ao salvar.');
    }
  };

  return (
    <div className="screen-enter max-w-[960px] mx-auto">
      <PageHeader
        eyebrow="Resultado"
        title={ok ? 'Tarefa concluída' : 'Tarefa finalizada com falha'}
        subtitle={`Modo ${mode} · ${(elapsed || 0).toFixed(1)}s · ${tokens.toLocaleString('pt-BR')} tokens · ${ciclos} ciclo(s) ReAct`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={IconClipboard} onClick={handleSaveHistory}>
              Salvar no histórico
            </Button>
            <Button size="sm" icon={IconPlay} onClick={() => onNavigate && onNavigate('new')}>
              Nova tarefa
            </Button>
          </div>
        }
      />

      {/* Status banner */}
      <Card className="mb-4">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-md ring-1 ring-inset flex items-center justify-center shrink-0 ${
            ok ? 'bg-success/15 ring-success/30 text-success' : 'bg-error/15 ring-error/30 text-error'
          }`}>
            {ok ? <IconCheck size={18} /> : <IconWarning size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[14px] font-semibold text-text1">
                {ok ? 'FINALIZADO' : 'FALHA'}
              </span>
              <ModeBadge mode={mode} />
              {result.tipo_ambiguidade && result.tipo_ambiguidade !== 'nenhuma' && (
                <Tag tone="warning">amb: {result.tipo_ambiguidade}</Tag>
              )}
              {typeof result.confianca === 'number' && result.confianca > 0 && (
                <Tag tone="primary">confiança: {result.confianca}%</Tag>
              )}
              {result.fallback_usado === true && (
                <Tag tone="warning">Guard A: fallback</Tag>
              )}
            </div>
            <div className="text-[12.5px] text-text2 leading-snug">{taskText}</div>
          </div>
          <div className="hidden sm:grid grid-cols-3 gap-5 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3">Latência</div>
              <div className="font-mono text-[15px] text-text1 font-semibold">{(elapsed || 0).toFixed(1)}s</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3">Tokens</div>
              <div className="font-mono text-[15px] text-primary-2 font-semibold">{tokens.toLocaleString('pt-BR')}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text3">Ciclos</div>
              <div className="font-mono text-[15px] text-warning font-semibold">{ciclos}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Instrução CDH */}
      {result.instrucao_cdh && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] uppercase tracking-wider text-text3 font-medium">
              Instrução gerada pelo Supervisor
            </span>
            <Tag tone="primary">{mode}</Tag>
          </div>
          <div className="text-[13px] text-text1 leading-relaxed italic bg-primary/5 border border-primary/10 rounded-md px-4 py-3 whitespace-pre-wrap">
            {result.instrucao_cdh}
          </div>
        </Card>
      )}

      {/* Workers + métricas detalhadas */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1.5">
              Workers utilizados
            </div>
            {workers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {workers.map((w) => (
                  <Tag key={w} tone="mono">{w}</Tag>
                ))}
              </div>
            ) : (
              <span className="text-[12px] text-text3 italic">nenhum registrado</span>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1.5">
              Tokens (Worker / Supervisor)
            </div>
            <div className="font-mono text-[13px] text-text1">
              {(result.tokens_total || 0).toLocaleString('pt-BR')}
              <span className="text-text3"> / </span>
              {(result.tokens_supervisor || 0).toLocaleString('pt-BR')}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1.5">
              Próximo final
            </div>
            <div className="font-mono text-[13px] text-text1">{result.proximo_final || '—'}</div>
          </div>
        </div>
      </Card>

      {/* Modelos efetivamente usados (heterogeneous routing) */}
      {result.models && typeof result.models === 'object' && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] uppercase tracking-wider text-text3 font-medium">
              Modelos efetivamente usados
            </span>
            {Object.keys(result.models).length > 1 &&
              new Set(Object.values(result.models)).size > 1 && (
                <Tag tone="primary">heterogêneo</Tag>
              )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(result.models).map(([role, model]) => (
              <div key={role} className="bg-surface2/40 ring-1 ring-inset ring-white/5 rounded-md px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-text3 font-medium">{role}</div>
                <div className="font-mono text-[11.5px] text-text1 truncate">{model}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Resposta */}
      <Card padded={false}>
        <div className="px-5 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-text1">Resposta do Worker</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate && onNavigate('graph')}
          >
            Ver no Grafo
          </Button>
        </div>
        <div className="px-5 py-4">
          {result.resposta ? (
            typeof window.MarkdownView === 'function'
              ? <window.MarkdownView text={result.resposta} />
              : <div className="text-[13px] text-text1 leading-relaxed whitespace-pre-wrap">{result.resposta}</div>
          ) : (
            <div className="text-[12.5px] text-text3 italic">Nenhuma resposta foi gerada.</div>
          )}
        </div>
      </Card>
    </div>
  );
};

Object.assign(window, { ExecutionScreen, ExecutionResult });
