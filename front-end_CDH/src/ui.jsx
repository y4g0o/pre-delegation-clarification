/* Shared UI primitives */

const Card = ({ className = '', children, padded = true }) => (
  <div className={`bg-surface rounded-lg border border-white/[0.04] shadow-card ${padded ? 'p-6' : ''} ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={18} className="text-text2" />}
      <h2 className="text-[18px] font-semibold tracking-tight text-text1">{title}</h2>
    </div>
    {action}
  </div>
);

/* Status badge — used for task status */
const STATUS_MAP = {
  success: { label: 'Sucesso',     bg: 'bg-success/15',  fg: 'text-success',  dot: 'bg-success' },
  failed:  { label: 'Falhou',      bg: 'bg-error/15',    fg: 'text-error',    dot: 'bg-error' },
  running: { label: 'Executando',  bg: 'bg-warning/15',  fg: 'text-warning',  dot: 'bg-warning' },
  queued:  { label: 'Em fila',     bg: 'bg-text3/20',    fg: 'text-text2',    dot: 'bg-text3' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.queued;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[12px] font-medium ${s.bg} ${s.fg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status === 'running' ? 'dot-pulse' : ''}`} />
      {s.label}
    </span>
  );
};

/* Mode pill — CDH or Baseline */
const ModeBadge = ({ mode }) => {
  const m = (mode || '').toLowerCase();
  const cls = m === 'cdh'
    ? 'bg-primary/15 text-primary-2 ring-1 ring-inset ring-primary/30'
    : m === 'cot'
    ? 'bg-warning/15 text-warning ring-1 ring-inset ring-warning/30'
    : 'bg-text3/15 text-text2 ring-1 ring-inset ring-white/5';
  const label = m === 'cot' ? 'CoT' : (mode || '—').toUpperCase();
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${cls}`}>
      {label}
    </span>
  );
};

/* Status dot for agents */
const AgentDot = ({ state }) => {
  const map = {
    idle:    'bg-success',
    working: 'bg-warning',
    error:   'bg-error',
    off:     'bg-text3',
  };
  return (
    <span className="relative inline-flex">
      <span className={`h-2 w-2 rounded-full ${map[state] || 'bg-text3'}`} />
      {state === 'working' && (
        <span className={`absolute inset-0 rounded-full ${map[state]} animate-ping opacity-60`} />
      )}
    </span>
  );
};

/* Stat card */
const StatCard = ({ label, value, sub, accent = 'primary', icon: Icon, trend }) => {
  const accents = {
    primary: 'text-primary-2',
    success: 'text-success',
    info:    'text-sky-400',
    warning: 'text-warning',
    purple:  'text-fuchsia-400',
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="text-[12px] uppercase tracking-wider text-text3 font-medium">{label}</div>
        {Icon && (
          <div className={`h-8 w-8 rounded-lg bg-surface2 flex items-center justify-center ${accents[accent]}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <div className={`text-[28px] font-bold tracking-tight ${accents[accent]}`}>{value}</div>
        {trend && (
          <div className={`text-[12px] mb-1 flex items-center gap-0.5 ${trend.dir === 'up' ? 'text-success' : 'text-error'}`}>
            {trend.dir === 'up' ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />}
            {trend.value}
          </div>
        )}
      </div>
      {sub && <div className="mt-1 text-[13px] text-text2">{sub}</div>}
    </Card>
  );
};

/* Tag / chip */
const Tag = ({ children, tone = 'default' }) => {
  const tones = {
    default: 'bg-surface2 text-text2 ring-1 ring-inset ring-white/5',
    primary: 'bg-primary/15 text-primary-2 ring-1 ring-inset ring-primary/30',
    success: 'bg-success/15 text-success ring-1 ring-inset ring-success/30',
    warning: 'bg-warning/15 text-warning ring-1 ring-inset ring-warning/30',
    mono:    'bg-bg/70 text-text2 ring-1 ring-inset ring-white/5 font-mono text-[11px]',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
};

/* Page header used inside main content area */
const PageHeader = ({ title, subtitle, eyebrow, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-8 gap-4 sm:gap-6">
    <div>
      {eyebrow && <div className="text-[12px] uppercase tracking-[0.18em] text-text3 font-medium mb-2">{eyebrow}</div>}
      <h1 className="text-[24px] sm:text-[32px] font-bold tracking-tight text-text1 leading-none">{title}</h1>
      {subtitle && <p className="mt-2 text-[14px] text-text2 max-w-xl">{subtitle}</p>}
    </div>
    {action}
  </div>
);

/* Button */
const Button = ({ children, variant = 'primary', size = 'md', className = '', icon: Icon, iconRight: IconR, ...rest }) => {
  const variants = {
    primary: 'bg-primary hover:bg-primary/90 text-white shadow-[0_8px_24px_-12px_rgba(99,102,241,0.7)]',
    ghost:   'bg-transparent hover:bg-surface2 text-text1',
    outline: 'bg-transparent hover:bg-surface2 text-text1 ring-1 ring-inset ring-white/10',
    soft:    'bg-surface2 hover:bg-surface2/80 text-text1 ring-1 ring-inset ring-white/5',
    danger:  'bg-error/15 hover:bg-error/25 text-error ring-1 ring-inset ring-error/30',
  };
  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-10 px-4 text-[14px]',
    lg: 'h-12 px-5 text-[15px]',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={16} />}
      {children}
      {IconR && <IconR size={16} />}
    </button>
  );
};

/* Form controls */
const Input = ({ className = '', icon: Icon, ...rest }) => (
  <div className={`relative ${className}`}>
    {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />}
    <input
      className={`w-full h-10 bg-surface2/60 border border-white/5 rounded-md text-[14px] text-text1 placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition ${Icon ? 'pl-9 pr-3' : 'px-3'}`}
      {...rest}
    />
  </div>
);

const Select = ({ value, onChange, options, className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={onChange}
      className="w-full h-10 appearance-none bg-surface2/60 border border-white/5 rounded-md pl-3 pr-9 text-[14px] text-text1 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface text-text1">{o.label}</option>
      ))}
    </select>
    <IconChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
  </div>
);

const Textarea = ({ className = '', ...rest }) => (
  <textarea
    className={`w-full bg-surface2/60 border border-white/5 rounded-md p-4 text-[14px] text-text1 placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition resize-none font-sans ${className}`}
    {...rest}
  />
);

/* Bar (used in benchmark visualizations) */
const Bar = ({ value, max = 100, color = 'bg-primary', label, valueLabel, height = 'h-2' }) => (
  <div>
    {(label || valueLabel) && (
      <div className="flex items-center justify-between text-[12px] mb-1.5">
        <span className="text-text2">{label}</span>
        <span className="text-text1 font-mono">{valueLabel}</span>
      </div>
    )}
    <div className={`w-full bg-surface2 rounded-full ${height} overflow-hidden`}>
      <div
        className={`${color} ${height} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%` }}
      />
    </div>
  </div>
);

Object.assign(window, {
  Card, SectionTitle, StatusBadge, ModeBadge, AgentDot, StatCard, Tag,
  PageHeader, Button, Input, Select, Textarea, Bar, STATUS_MAP,
});
