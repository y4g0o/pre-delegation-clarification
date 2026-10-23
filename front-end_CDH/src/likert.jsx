/* Likert evaluation — 5-point scale, persisted to localStorage by task id.
   Criteria align with CDH paper: completion accuracy, clarity, ambiguity
   resolution, latency acceptability, response usefulness. */

const LIKERT_CRITERIA = [
  { id: 'completion', label: 'Conclusão da tarefa',      hint: 'A resposta cumpriu integralmente o objetivo solicitado?' },
  { id: 'accuracy',   label: 'Correção factual',         hint: 'As informações são corretas, precisas e sem erros evidentes?' },
  { id: 'clarity',    label: 'Clareza e estrutura',      hint: 'A saída foi compreensível, bem organizada e sem prolixidade?' },
  { id: 'disambig',   label: 'Resolução da ambiguidade', hint: 'O agente interpretou/refinou bem a tarefa antes de executar?' },
  { id: 'latency',    label: 'Latência aceitável',       hint: 'O tempo de resposta foi adequado para o tipo de tarefa?' },
  { id: 'utility',    label: 'Utilidade global',         hint: 'Você usaria este resultado diretamente ou com ajustes mínimos?' },
];

const LIKERT_LABELS = [
  { v: 1, label: 'Discordo totalmente', short: 'DT' },
  { v: 2, label: 'Discordo',             short: 'D'  },
  { v: 3, label: 'Neutro',               short: 'N'  },
  { v: 4, label: 'Concordo',             short: 'C'  },
  { v: 5, label: 'Concordo totalmente',  short: 'CT' },
];

const STORE_KEY = 'cdh-likert-evaluations';

const loadAll = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
  catch (e) { return {}; }
};
const saveAll = (data) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  catch (e) {}
};

const useLikert = (taskId) => {
  const [all, setAll] = React.useState(() => loadAll());
  const evaluation = all[taskId];
  const submit = (values, comment) => {
    const next = { ...all, [taskId]: { values, comment: comment || '', at: new Date().toISOString() } };
    setAll(next);
    saveAll(next);
  };
  const clear = () => {
    const next = { ...all };
    delete next[taskId];
    setAll(next);
    saveAll(next);
  };
  return { evaluation, submit, clear, all };
};

/* The radio-row picker for one criterion */
const LikertRow = ({ criterion, value, onChange }) => (
  <div className="py-3 border-t border-white/[0.04] first:border-t-0">
    <div className="flex items-start justify-between gap-4 mb-2">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-text1">{criterion.label}</div>
        <div className="text-[11.5px] text-text3 mt-0.5">{criterion.hint}</div>
      </div>
      {value > 0 && (
        <span className="font-mono text-[11px] text-primary-2 shrink-0 mt-0.5">
          {value}/5 · {LIKERT_LABELS[value - 1].short}
        </span>
      )}
    </div>
    <div role="radiogroup" className="grid grid-cols-5 gap-1.5">
      {LIKERT_LABELS.map((opt) => {
        const selected = value === opt.v;
        return (
          <button
            key={opt.v}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.v)}
            className={`group relative h-12 rounded-md text-[11px] font-semibold transition-all ring-1 ring-inset ${
              selected
                ? 'bg-primary text-white ring-primary shadow-[0_8px_24px_-12px_rgba(99,102,241,0.7)]'
                : 'bg-surface2/40 text-text2 ring-white/5 hover:bg-surface2 hover:text-text1'
            }`}
            title={opt.label}
          >
            <div className="flex flex-col items-center justify-center gap-0.5">
              <span className="font-mono">{opt.v}</span>
              <span className="text-[9px] tracking-wider opacity-90">{opt.short}</span>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

/* Compact summary used inside table rows / cards once submitted */
const LikertSummary = ({ evaluation, onEdit }) => {
  const avg = (Object.values(evaluation.values).reduce((a, b) => a + b, 0) / LIKERT_CRITERIA.length).toFixed(1);
  return (
    <div className="bg-surface2/40 rounded-md p-3 ring-1 ring-inset ring-white/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/15 ring-1 ring-inset ring-primary/30 flex items-center justify-center">
            <IconCheck size={14} className="text-primary-2" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-text1">Avaliação registrada</div>
            <div className="text-[11px] text-text3">média {avg} / 5</div>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-[11px] text-text2 hover:text-text1 transition px-2 py-1 rounded ring-1 ring-inset ring-white/5"
        >
          editar
        </button>
      </div>
      <div className="space-y-1.5">
        {LIKERT_CRITERIA.map((c) => {
          const v = evaluation.values[c.id] || 0;
          return (
            <div key={c.id} className="flex items-center gap-3">
              <span className="text-[11px] text-text2 flex-1 truncate">{c.label}</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((n) => (
                  <span
                    key={n}
                    className={`h-1.5 w-4 rounded-full ${n <= v ? 'bg-primary' : 'bg-surface2'}`}
                  />
                ))}
              </div>
              <span className="font-mono text-[11px] text-text2 w-6 text-right">{v}</span>
            </div>
          );
        })}
      </div>
      {evaluation.comment && (
        <div className="mt-3 pt-3 border-t border-white/5 text-[12px] text-text2 italic leading-snug">
          “{evaluation.comment}”
        </div>
      )}
    </div>
  );
};

/* Full Likert form — used in History expansion and after task submit */
const LikertForm = ({ taskId, taskTitle, mode = '', compact = false, onSubmitted }) => {
  const { evaluation, submit, clear } = useLikert(taskId);
  const [editing, setEditing] = React.useState(!evaluation);
  const [values, setValues] = React.useState(() => evaluation?.values || {});
  const [comment, setComment] = React.useState(evaluation?.comment || '');
  const [confirming, setConfirming] = React.useState(false);

  const allFilled = LIKERT_CRITERIA.every((c) => values[c.id] >= 1);
  const filledCount = LIKERT_CRITERIA.filter((c) => values[c.id] >= 1).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!allFilled) return;
    submit(values, comment);
    setEditing(false);
    setConfirming(true);
    setTimeout(() => setConfirming(false), 1800);
    if (onSubmitted) onSubmitted({ values, comment });
  };

  if (!editing && evaluation) {
    return <LikertSummary evaluation={evaluation} onEdit={() => setEditing(true)} />;
  }

  return (
    <div className={`bg-surface2/30 rounded-md ring-1 ring-inset ring-white/5 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary/15 ring-1 ring-inset ring-primary/30 flex items-center justify-center">
              <IconBars size={12} className="text-primary-2" />
            </div>
            <div className="text-[13px] font-semibold text-text1">Avaliação Likert</div>
            <Tag tone="primary">{filledCount}/{LIKERT_CRITERIA.length}</Tag>
          </div>
          {taskTitle && (
            <div className="text-[11px] text-text3 mt-1 truncate max-w-[420px]">
              referente: “{taskTitle}”
            </div>
          )}
        </div>
        {evaluation && (
          <button
            type="button"
            onClick={() => { setEditing(false); }}
            className="text-text3 hover:text-text1 transition"
            aria-label="Cancelar"
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mt-2">
          {LIKERT_CRITERIA.map((c) => {
            const m = mode.toLowerCase();
            const criterion = c.id === 'disambig'
              ? m === 'baseline'
                ? { ...c, label: 'Interpretação sem refinamento', hint: 'Baseline: sem refinamento — o Worker interpretou corretamente a tarefa crua?' }
                : m === 'cot'
                ? { ...c, label: 'Refinamento por reflexão (CoT)', hint: 'CoT: o Supervisor refletiu sobre ambiguidades e gerou instrução melhor que o Baseline?' }
                : c  // CDH: critério padrão
              : c;
            return (
              <LikertRow
                key={c.id}
                criterion={criterion}
                value={values[c.id] || 0}
                onChange={(v) => setValues((p) => ({ ...p, [c.id]: v }))}
              />
            );
          })}
        </div>

        <div className="mt-4">
          <label className="block text-[11px] uppercase tracking-wider text-text3 font-medium mb-1.5">
            Comentário (opcional)
          </label>
          <Textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="O que poderia melhorar nesta resposta?"
          />
        </div>

        <div className="mt-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-[11px] text-text3">
            {confirming ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <IconCheck size={12} /> avaliação salva localmente
              </span>
            ) : (
              <span>Os dados ficam salvos no navegador para análise posterior.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {evaluation && (
              <Button type="button" variant="ghost" size="sm" onClick={clear}>limpar</Button>
            )}
            <Button type="submit" size="sm" disabled={!allFilled} icon={IconCheck}>
              {evaluation ? 'Atualizar' : 'Enviar avaliação'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

Object.assign(window, {
  LIKERT_CRITERIA, LIKERT_LABELS, LikertForm, LikertSummary, useLikert, loadAllLikert: loadAll,
});
