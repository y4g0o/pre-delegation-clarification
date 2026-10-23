/* Human-in-the-Loop clarification dialog — appears for CDH-mode tasks
   detected as ambiguous, before the task is dispatched to workers. */

const ClarificationDialog = ({ open, taskText, mode, onConfirm, onCancel }) => {
  const cat = inferTaskCategory(taskText);
  const tmpl = CLARIFICATION_TEMPLATES[cat] || CLARIFICATION_TEMPLATES.generic;
  const [picked, setPicked] = React.useState(null);
  const [custom, setCustom] = React.useState('');
  const [skipFuture, setSkipFuture] = React.useState(false);

  React.useEffect(() => {
    if (open) { setPicked(null); setCustom(''); }
  }, [open]);

  if (!open) return null;

  const choice = picked === 'custom' ? custom : (picked != null ? tmpl.options[picked] : null);
  const canConfirm = !!choice && choice.trim();

  const isCDH = mode === 'CDH';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-[600px] bg-surface rounded-xl ring-1 ring-inset ring-white/10 shadow-2xl overflow-hidden screen-enter">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
            isCDH ? 'bg-primary/15 ring-1 ring-inset ring-primary/30 text-primary-2' : 'bg-text3/10 ring-1 ring-inset ring-white/5 text-text2'
          }`}>
            <IconQuestion size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-[16px] font-semibold tracking-tight text-text1">
                {isCDH ? 'Ciclo de Desambiguação · Cycle 1' : 'Confirmação direta'}
              </h2>
              <Tag tone={isCDH ? 'primary' : 'default'}>Supervisor</Tag>
            </div>
            <p className="text-[12px] text-text3 leading-snug">
              {isCDH
                ? 'O Supervisor detectou ambiguidade no escopo da tarefa antes da delegação. Esclareça para continuar.'
                : 'Modo Baseline — esta confirmação é informativa, sem ciclo de refinamento.'}
            </p>
          </div>
          <button onClick={onCancel} className="text-text3 hover:text-text1 transition shrink-0" aria-label="Fechar">
            <IconX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1.5">Tarefa original</div>
          <div className="bg-bg/60 rounded-md p-3 text-[13px] text-text1 ring-1 ring-inset ring-white/5 leading-relaxed mb-5 font-mono">
            “{taskText}”
          </div>

          <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-1.5">Pergunta do Supervisor</div>
          <div className="text-[14px] text-text1 leading-relaxed mb-4">{tmpl.question}</div>

          <div className="space-y-2">
            {tmpl.options.map((opt, i) => {
              const selected = picked === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPicked(i)}
                  className={`w-full text-left px-4 py-3 rounded-md text-[13.5px] transition flex items-center gap-3 ${
                    selected
                      ? 'bg-primary/10 ring-2 ring-primary text-text1'
                      : 'bg-surface2/40 ring-1 ring-inset ring-white/5 text-text2 hover:bg-surface2 hover:text-text1'
                  }`}
                >
                  <span className={`h-4 w-4 rounded-full ring-2 shrink-0 flex items-center justify-center ${
                    selected ? 'ring-primary bg-primary' : 'ring-white/15 bg-transparent'
                  }`}>
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="flex-1">{opt}</span>
                  <span className="font-mono text-[10px] text-text3">opt-{i+1}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPicked('custom')}
              className={`w-full text-left px-4 py-3 rounded-md transition ${
                picked === 'custom' ? 'bg-primary/10 ring-2 ring-primary' : 'bg-surface2/40 ring-1 ring-inset ring-white/5 hover:bg-surface2'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={`h-4 w-4 rounded-full ring-2 shrink-0 flex items-center justify-center ${
                  picked === 'custom' ? 'ring-primary bg-primary' : 'ring-white/15 bg-transparent'
                }`}>
                  {picked === 'custom' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className="flex-1 text-[13.5px] text-text1">Outra interpretação (especificar)</span>
              </div>
              {picked === 'custom' && (
                <input
                  autoFocus
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Descreva sua intenção…"
                  className="w-full h-9 bg-bg/60 rounded-md px-3 text-[13px] text-text1 placeholder:text-text3 focus:outline-none ring-1 ring-inset ring-white/5 focus:ring-primary/50"
                />
              )}
            </button>
          </div>

          {/* Reasoning preview */}
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-text3 font-medium mb-2">Diagnóstico do Supervisor</div>
            <div className="font-mono text-[11.5px] leading-relaxed text-text2 space-y-0.5">
              <div><span className="text-text3">›</span> entropia(intent) = <span className="text-warning">0.72</span> &gt; threshold(0.55)</div>
              <div><span className="text-text3">›</span> tokens(prompt) = 142 · roteamento candidato: <span className="text-primary-2">{cat.toUpperCase()}</span></div>
              <div><span className="text-text3">›</span> ambiguidade detectada em: <span className="text-warning">escopo</span>, <span className="text-warning">profundidade</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-bg/40 border-t border-white/5 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[12px] text-text2 cursor-pointer">
            <input
              type="checkbox"
              checked={skipFuture}
              onChange={(e) => setSkipFuture(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Não perguntar nas próximas tarefas similares
          </label>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
            <Button
              size="sm"
              icon={IconCheck}
              disabled={!canConfirm}
              onClick={() => onConfirm({ choice, skipFuture })}
            >
              Confirmar e executar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ClarificationDialog });
