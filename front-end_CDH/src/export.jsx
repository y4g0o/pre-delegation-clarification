/* CSV / JSON download helpers — turn arrays of objects into real downloads */

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

const toCSV = (rows) => {
  if (!rows || !rows.length) return '';
  const cols = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.join(',');
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(',')).join('\n');
  return head + '\n' + body;
};

const exportJSON = (data, filename = 'cdh-export.json') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, filename);
};

const exportCSV = (rows, filename = 'cdh-export.csv') => {
  const blob = new Blob(['\uFEFF' + toCSV(rows)], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
};

Object.assign(window, { exportJSON, exportCSV, toCSV, downloadBlob });
