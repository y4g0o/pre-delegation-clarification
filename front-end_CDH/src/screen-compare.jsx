/* Screen 7 — A/B comparison: same task in CDH mode vs Baseline mode.
   Highlights the central paper claim: CDH avoids recursion-limit failures. */

const CompareScreen = () => {
  const [activeId, setActiveId] = React.useState(AB_COMPARISONS[0].id);
  const ab = AB_COMPARISONS.find((x) => x.id === activeId);

  const winner = (a, b, lowerIsBetter = false) => {
    if (a == null || b == null) return null;
    if (a === b) return null;
    if (lowerIsBetter) return a < b ? 'A' : 'B';
    return a > b ? 'A' : 'B';
  };

  const cdhWinsCompletion = ab.cdh.status === 'success' && ab.baseline.status === 'failed';
  const latencyA = parseFloat(ab.cdh.latency);
  const latencyB = parseFloat(ab.baseline.latency);
  const latWinner = winner(latencyA, latencyB, true);
  const tokWinner = winner(ab.cdh.tokens, ab.baseline.tokens, true);

  return (
    <div className="screen-enter">
      <PageHeader
        eyebrow="Análise pareada"
        title="Comparação CDH vs Baseline"
        subtitle="A mesma tarefa executada nos dois modos. Use para evidenciar trade-offs no artigo."
        action={
          <Button
            variant="outline"
            size="sm"
            icon={IconExport}
            onClick={() => exportJSON(AB_COMPARISONS, 'cdh-ab-comparisons.json')}
          >
            Exportar JSON
          </Button>
        }
      />

      {/* Task picker */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {AB_COMPARISONS.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`text-left p-3 rounded-md transition ${
                active
                  ? 'bg-primary/10 ring-2 ring-primary'
                  : 'bg-surface ring-1 ring-inset ring-white/5 hover:bg-surface2/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-text3">{c.id}</span>
                <Tag tone="mono">{c.category}</Tag>
              </div>
              <div className="text-[12.5px] text-text1 leading-snug line-clamp-2">{c.task}</div>
            </button>
          );
        })}
      </div>

      {/* Side-by-side cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ABColumn
          title="CDH"
          tone="primary"
          run={ab.cdh}
          highlight={{ completion: cdhWinsCompletion, latency: latWinner === 'A', tokens: tokWinner === 'A' }}
          taskText={ab.task}
          fallbackId="cdh-sample"
        />
        <ABColumn
          title="Baseline"
          tone="neutral"
          run={ab.baseline}
          highlight={{ completion: !cdhWinsCompletion && ab.baseline.status === 'success' && ab.cdh.status === 'failed', latency: latWinner === 'B', tokens: tokWinner === 'B' }}
          taskText={ab.task}
          fallbackId="baseline-sample"
        />
      </div>

      {/* Verdict bar */}
      <Card>
        <SectionTitle icon={IconSplit} title="Veredito" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Verdict
            label="Conclusão"
            winner={cdhWinsCompletion ? 'CDH' : (ab.cdh.status === ab.baseline.status ? 'empate' : (ab.cdh.status === 'success' ? 'CDH' : 'Baseline'))}
            detail={cdhWinsCompletion ? 'Baseline atingiu limite de recursão' : 'Ambos concluíram'}
          />
          <Verdict
            label="Latência"
            winner={latWinner === 'A' ? 'CDH' : (latWinner === 'B' ? 'Baseline' : 'empate')}
            detail={`Δ ${Math.abs(latencyA - latencyB).toFixed(1)}s`}
          />
          <Verdict
            label="Tokens"
            winner={tokWinner === 'A' ? 'CDH' : (tokWinner === 'B' ? 'Baseline' : 'empate')}
            detail={`Δ ${Math.abs(ab.cdh.tokens - ab.baseline.tokens).toLocaleString('pt-BR')} tokens`}
          />
        </div>
      </Card>
    </div>
  );
};

const ABColumn = ({ title, tone, run, highlight, taskText, fallbackId }) => {
  const isCDH = title === 'CDH';
  const responseMd = run.response
    ? SAMPLE_RESPONSE_MD[run.response]
    : (run.status === 'failed'
        ? `## Falha por limite de recursão\n\nA execução foi abortada após **${run.react} iterações ReAct** consecutivas sem convergência. Sem o ciclo de desambiguação proativa, o worker entrou em loop de reformulação.\n\n> No modo CDH essa tarefa concluiu em ${run.react} steps com sucesso.`
        : `## Resposta\n\n${taskText}\n\nResposta produzida em modo ${title} sem ciclo de refinamento adicional.`);

  return (
    <Card padded={false} className={isCDH ? 'ring-1 ring-inset ring-primary/30' : ''}>
      <div className={`px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/5 ${isCDH ? 'bg-primary/5' : ''}`}>
        <div className="flex items-center gap-2">
          <span className={`h-7 w-7 rounded-md flex items-center justify-center ${isCDH ? 'bg-primary text-white' : 'bg-surface2 text-text2'}`}>
            <span className="text-[10px] font-bold">{isCDH ? 'CDH' : 'B'}</span>
          </span>
          <h3 className="text-[15px] font-semibold tracking-tight text-text1">Modo {title}</h3>
          <StatusBadge status={run.status} />
        </div>
        {run.recursion && (
          <Tag tone="warning"><IconWarning size={10} /> recursion-limit</Tag>
        )}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
        <ABMetric label="Latência" value={run.latency}        win={highlight.latency} />
        <ABMetric label="Tokens"   value={run.tokens.toLocaleString('pt-BR')} win={highlight.tokens} />
        <ABMetric label="React"    value={`${run.react}${run.recursion ? ' /15 ⚠' : ''}`} muted={!run.recursion} />
      </div>

      {/* Response preview */}
      <div className="px-5 py-4">
        <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2 flex items-center gap-2">
          <IconText size={11} /> Resposta {isCDH && <Tag tone="primary">cycles {run.cycles}</Tag>}
        </div>
        <div className="bg-bg/60 rounded-md ring-1 ring-inset ring-white/5 p-4 max-h-[280px] overflow-auto">
          <Markdown>{responseMd}</Markdown>
        </div>
      </div>
    </Card>
  );
};

const ABMetric = ({ label, value, win = false, muted = false }) => (
  <div className={`px-4 py-3 ${win ? 'bg-success/5' : ''}`}>
    <div className="text-[10px] uppercase tracking-wider text-text3 font-medium">{label}</div>
    <div className={`font-mono text-[15px] font-semibold mt-0.5 flex items-center gap-1.5 ${
      win ? 'text-success' : muted ? 'text-text1' : 'text-text1'
    }`}>
      {value}
      {win && <IconCheck size={11} className="text-success" />}
    </div>
  </div>
);

const Verdict = ({ label, winner, detail }) => {
  const isCDH = winner === 'CDH';
  const isTie = winner === 'empate';
  return (
    <div className={`p-4 rounded-md ring-1 ring-inset ${
      isTie     ? 'bg-surface2/30 ring-white/5' :
      isCDH     ? 'bg-primary/10 ring-primary/30' :
                  'bg-surface2/40 ring-white/5'
    }`}>
      <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1.5">{label}</div>
      <div className={`text-[20px] font-bold tracking-tight mb-0.5 ${
        isTie ? 'text-text2' : isCDH ? 'text-primary-2' : 'text-text1'
      }`}>
        {winner}
      </div>
      <div className="text-[11.5px] text-text3">{detail}</div>
    </div>
  );
};

Object.assign(window, { CompareScreen });
