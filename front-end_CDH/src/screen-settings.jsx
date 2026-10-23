/* Screen 6 — Settings */

const SettingsScreen = () => {
  const [supModel, setSupModel] = React.useState('llama3.1:8b');
  const [wkrModel, setWkrModel] = React.useState('llama3.1:8b');
  const [temp,     setTemp]     = React.useState(0.3);
  const [maxDis,   setMaxDis]   = React.useState(3);
  const [maxReact, setMaxReact] = React.useState(10);
  const [timeout_, setTimeout_] = React.useState(120);
  const [lang,     setLang]     = React.useState('pt');
  const [saved,    setSaved]    = React.useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportConfig = () => {
    exportJSON({
      models:    { supervisor: supModel, workers: wkrModel, temperature: temp },
      cdh:       { maxDisambiguationCycles: maxDis, maxReactCycles: maxReact, timeoutSec: timeout_ },
      interface: { language: lang },
      exportedAt: new Date().toISOString(),
    }, 'cdh-config.json');
  };

  return (
    <div className="screen-enter max-w-[920px] mx-auto">
      <PageHeader
        eyebrow="Sistema"
        title="Configurações"
        subtitle="Ajuste modelos, parâmetros do CDH e preferências da interface."
      />

      <div className="space-y-6">
        {/* Model Configuration */}
        <SettingsSection
          number="01"
          title="Configuração de modelos"
          subtitle="Modelos LLM utilizados pelo Supervisor e pelos Workers."
          icon={IconCpu}
        >
          <SettingRow label="Modelo do Supervisor" hint="Orquestra desambiguação e delegação.">
            <Select
              value={supModel}
              onChange={(e) => setSupModel(e.target.value)}
              options={[
                { value: 'llama3.1:8b', label: 'llama3.1:8b   (padrão)' },
                { value: 'llama3.2:3b', label: 'llama3.2:3b   (mais rápido)' },
                { value: 'mistral:7b',  label: 'mistral:7b' },
              ]}
            />
          </SettingRow>
          <SettingRow label="Modelo dos Workers" hint="Compartilhado entre PESQ, CALC e ESC.">
            <Select
              value={wkrModel}
              onChange={(e) => setWkrModel(e.target.value)}
              options={[
                { value: 'llama3.1:8b',      label: 'llama3.1:8b   (padrão)' },
                { value: 'qwen2.5-coder:7b', label: 'qwen2.5-coder:7b' },
                { value: 'codellama:7b',     label: 'codellama:7b' },
              ]}
            />
          </SettingRow>
          <SettingRow label="Temperatura" hint="0,0 = determinístico · 1,0 = mais criativo.">
            <div className="flex items-center gap-4">
              <input type="range" min="0" max="1" step="0.05" value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} className="flex-1" />
              <span className="font-mono text-[13px] text-text1 w-12 text-right">{temp.toFixed(2)}</span>
            </div>
          </SettingRow>
        </SettingsSection>

        {/* CDH Parameters */}
        <SettingsSection
          number="02"
          title="Parâmetros do CDH"
          subtitle="Limites e timeouts do ciclo de desambiguação hierárquica."
          icon={IconBeaker}
        >
          <SettingRow label="Ciclos máx. de desambiguação" hint="Quantas vezes o Supervisor pode reformular a tarefa.">
            <NumberInput value={maxDis} onChange={setMaxDis} min={1} max={8} />
          </SettingRow>
          <SettingRow label="React cycles por worker" hint="Limite de iterações thought-action-observation.">
            <NumberInput value={maxReact} onChange={setMaxReact} min={1} max={30} />
          </SettingRow>
          <SettingRow label="Timeout por tarefa (s)" hint="Após esse tempo a tarefa é abortada.">
            <NumberInput value={timeout_} onChange={setTimeout_} min={10} max={600} step={10} />
          </SettingRow>
        </SettingsSection>

        {/* Interface */}
        <SettingsSection
          number="03"
          title="Interface"
          subtitle="Idioma e preferências de exibição."
          icon={IconGlobe}
        >
          <SettingRow label="Idioma" hint="Aplicado a rótulos e mensagens do dashboard.">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'pt', label: 'Português (BR)' },
                { id: 'en', label: 'English' },
              ].map((opt) => {
                const active = lang === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLang(opt.id)}
                    className={`h-10 rounded-md text-[13px] font-medium transition ${
                      active ? 'bg-primary text-white' : 'bg-surface2/60 text-text2 ring-1 ring-inset ring-white/5 hover:bg-surface2'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </SettingRow>
        </SettingsSection>

        {/* Save bar */}
        <div className="flex items-center justify-between bg-surface/60 ring-1 ring-inset ring-white/5 rounded-lg p-4 backdrop-blur sticky bottom-4">
          <div className="text-[13px] text-text2">
            {saved ? (
              <span className="inline-flex items-center gap-2 text-success">
                <IconCheck size={14} /> Configurações salvas com sucesso.
              </span>
            ) : (
              <span>Alterações ainda não salvas em disco.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" icon={IconExport} onClick={exportConfig}>Exportar config</Button>
            <Button size="md" icon={IconCheck} onClick={save}>Salvar configuração</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsSection = ({ number, title, subtitle, icon: Icon, children }) => (
  <Card padded={false}>
    <div className="px-6 pt-5 pb-4 border-b border-white/5 flex items-start gap-4">
      <div className="h-10 w-10 rounded-md bg-surface2 flex items-center justify-center text-primary-2 shrink-0">
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-text3">{number}</span>
          <h2 className="text-[18px] font-semibold tracking-tight text-text1">{title}</h2>
        </div>
        {subtitle && <p className="text-[13px] text-text2 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="divide-y divide-white/[0.04]">
      {children}
    </div>
  </Card>
);

const SettingRow = ({ label, hint, children }) => (
  <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-2 md:gap-6 px-6 py-4 md:items-center">
    <div>
      <div className="text-[13px] font-medium text-text1">{label}</div>
      {hint && <div className="text-[12px] text-text3 mt-0.5">{hint}</div>}
    </div>
    <div>{children}</div>
  </div>
);

const NumberInput = ({ value, onChange, min = 0, max = 999, step = 1 }) => (
  <div className="inline-flex items-center bg-surface2/60 rounded-md ring-1 ring-inset ring-white/5 overflow-hidden h-10 w-[140px]">
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - step))}
      className="h-full w-10 text-text2 hover:bg-white/5 transition"
    >−</button>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseInt(e.target.value || '0', 10))}
      className="flex-1 bg-transparent text-center font-mono text-[14px] text-text1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
    <button
      type="button"
      onClick={() => onChange(Math.min(max, value + step))}
      className="h-full w-10 text-text2 hover:bg-white/5 transition"
    >+</button>
  </div>
);

Object.assign(window, { SettingsScreen });
