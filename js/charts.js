// Renderização de cada seção do dashboard
const Charts = (() => {
  const K = CONFIG.COLORS;
  const instances = {};

  const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const fmtBRLshort = (v) => {
    if (Math.abs(v) >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
    if (Math.abs(v) >= 1e3) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    return fmtBRL(v);
  };
  const fmtInt = (v) => Math.round(v).toLocaleString('pt-BR');
  const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
  const fmtPct = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

  Chart.defaults.color = K.muted;
  Chart.defaults.font.family = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
  Chart.defaults.borderColor = K.grid;
  Chart.defaults.plugins.tooltip.backgroundColor = '#0b0f14';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.12)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = 'rectRounded';

  const draw = (id, config) => {
    if (instances[id]) instances[id].destroy();
    instances[id] = new Chart(document.getElementById(id), config);
  };

  const legendItem = (text, color) => ({ text, fillStyle: color, strokeStyle: 'transparent', fontColor: K.text, pointStyle: 'rectRounded' });

  // 1. Faturamento previsto x executado
  const renderFaturamento = (rows) => {
    const prev = sum(rows, (r) => r.valor);
    const exec = sum(rows.filter((r) => r.energizada), (r) => r.valor);
    const p = pct(exec, prev);
    document.getElementById('fat-prev').textContent = fmtBRL(prev);
    document.getElementById('fat-exec').textContent = fmtBRL(exec);
    document.getElementById('fat-pct').textContent = fmtPct(p);
    document.getElementById('fat-rest').textContent = fmtBRL(Math.max(prev - exec, 0));
    const bar = document.getElementById('fat-bar');
    bar.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.width = Math.min(p, 100) + '%')));
  };

  // 2. Andamento de obras (por data de início/término)
  const statusObra = (r, today) => {
    if (!r.inicio || !r.termino) return null;
    if (today < r.inicio) return 'Programada';
    if (today >= r.termino) return 'Energizada';
    return 'Em execução';
  };

  const centerText = {
    id: 'centerText',
    afterDraw(chart, _args, opts) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = K.text;
      ctx.font = "700 34px 'Inter', system-ui, sans-serif";
      ctx.fillText(opts.value, x, y + 6);
      ctx.fillStyle = K.muted;
      ctx.font = "500 12px 'Inter', system-ui, sans-serif";
      ctx.fillText(opts.label, x, y + 26);
      ctx.restore();
    },
  };

  const renderAndamento = (rows) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const labels = ['Programada', 'Em execução', 'Energizada'];
    const colors = [K.greyLight, K.orange, K.cyan];
    const counts = labels.map((l) => rows.filter((r) => statusObra(r, today) === l).length);
    const total = counts.reduce((a, b) => a + b, 0);
    draw('chart-andamento', {
      type: 'doughnut',
      data: { labels, datasets: [{ data: counts, backgroundColor: colors, borderColor: '#121821', borderWidth: 3, hoverOffset: 6 }] },
      options: {
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 18,
              font: { size: 13 },
              generateLabels: () => labels.map((l, i) => ({ ...legendItem(`${l}   ${counts[i]}  (${fmtPct(pct(counts[i], total))})`, colors[i]), index: i })),
            },
          },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} obras (${fmtPct(pct(c.raw, total))})` } },
          centerText: { value: fmtInt(total), label: 'obras' },
        },
      },
      plugins: [centerText],
    });
  };

  // 3. Obras energizadas x status no fechamento (GEOEX)
  const renderFechamento = (rows, fechMap) => {
    const cats = ['ACEITA NEOEX', 'POSTADO NEOEX', 'NÃO POSTADA'];
    const colors = [K.cyan, K.orange, K.greyLight];
    const groups = Object.fromEntries(cats.map((c) => [c, []]));
    rows.filter((r) => r.energizada).forEach((r) => {
      const st = (fechMap.get(r.obra) || '').toLowerCase();
      const cat = st === 'postado' ? 'POSTADO NEOEX' : st === 'aceita' ? 'ACEITA NEOEX' : 'NÃO POSTADA';
      groups[cat].push(r.obra);
    });
    draw('chart-fechamento', {
      type: 'bar',
      data: { labels: cats, datasets: [{ data: cats.map((c) => groups[c].length), backgroundColor: colors, borderRadius: 6, barPercentage: 0.6 }] },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: K.grid } },
          y: { grid: { display: false }, ticks: { color: K.text, font: { weight: 600 } } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.raw} obras`, afterLabel: (c) => groups[c.label].slice(0, 12).join('\n') } },
        },
      },
    });
    const total = sum(cats, (c) => groups[c].length);
    document.getElementById('fech-total').textContent = `${total} energizadas`;
    document.getElementById('fech-list').innerHTML =
      cats
        .map((c, i) => (groups[c].length
          ? `<div class="tag-group"><span class="dot" style="background:${colors[i]}"></span><b>${c}</b>${groups[c].map((o) => `<span class="tag">${o}</span>`).join('')}</div>`
          : ''))
        .join('') || '<span class="muted">Nenhuma obra energizada no filtro atual.</span>';
  };

  // 4. Status por supervisor
  const renderSupervisores = (rows) => {
    const bySup = new Map();
    rows.forEach((r) => {
      if (!bySup.has(r.supervisor)) bySup.set(r.supervisor, []);
      bySup.get(r.supervisor).push(r);
    });
    const metric = (label, a, b, fmt, color) => {
      const p = pct(a, b);
      return `<div class="sup-metric">
        <div class="sup-metric-head"><span>${label}</span><span class="sup-pct" style="color:${color}">${fmtPct(p)}</span></div>
        <div class="sup-metric-val"><b>${fmt(a)}</b> <span class="muted">/ ${fmt(b)}</span></div>
        <div class="mini-bar"><div style="width:${Math.min(p, 100)}%;background:${color}"></div></div>
      </div>`;
    };
    const html = [...bySup.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([sup, list]) => {
        const en = list.filter((r) => r.energizada);
        return `<div class="sup-card">
          <div class="sup-name"><span class="avatar">${sup.charAt(0)}</span><div><b>${sup}</b><small>${list.length} obras</small></div></div>
          <div class="sup-metrics">
            ${metric('Postes exec / prev', sum(list, (r) => r.posteExec), sum(list, (r) => r.postePrev), fmtInt, K.orange)}
            ${metric('Obras energizadas', en.length, list.length, fmtInt, K.cyan)}
            ${metric('Faturamento energizado', sum(en, (r) => r.valor), sum(list, (r) => r.valor), fmtBRLshort, K.cyan)}
          </div>
        </div>`;
      })
      .join('');
    document.getElementById('supervisores').innerHTML = html || '<span class="muted">Sem dados.</span>';
  };

  // 5. Faturamento por UTEP (barra horizontal empilhada)
  const renderUtep = (rows) => {
    const uteps = [...new Set(rows.map((r) => r.utep))].sort();
    const prev = uteps.map((u) => sum(rows.filter((r) => r.utep === u), (r) => r.valor));
    const exec = uteps.map((u) => sum(rows.filter((r) => r.utep === u && r.energizada), (r) => r.valor));
    const rest = prev.map((p, i) => Math.max(p - exec[i], 0));
    const utepColor = (u) => CONFIG.UTEP_COLORS[u] || K.cyan;
    draw('chart-utep', {
      type: 'bar',
      data: {
        labels: uteps,
        datasets: [
          { label: 'Executado', data: exec, backgroundColor: uteps.map(utepColor), borderRadius: 4, barPercentage: 0.55 },
          { label: 'Previsto (restante)', data: rest, backgroundColor: K.grey, borderRadius: 4, barPercentage: 0.55 },
        ],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, beginAtZero: true, ticks: { callback: (v) => fmtBRLshort(v) }, grid: { color: K.grid } },
          y: { stacked: true, grid: { display: false }, ticks: { color: K.text, font: { weight: 600 } } },
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            onClick: null,
            labels: { generateLabels: () => [...uteps.map((u) => legendItem(`Exec. ${u}`, utepColor(u))), legendItem('Previsto', K.grey)] },
          },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.dataset.label}: ${fmtBRL(c.raw)}`,
              footer: (items) => {
                const i = items[0].dataIndex;
                return `Previsto total: ${fmtBRL(prev[i])}\nAtingido: ${fmtPct(pct(exec[i], prev[i]))}`;
              },
            },
          },
        },
      },
    });
  };

  // 6. Postes previsto x executado por encarregado (rolagem horizontal)
  const renderPostes = (rows) => {
    const byEnc = new Map();
    rows.forEach((r) => {
      const e = byEnc.get(r.encarregado) || { prev: 0, exec: 0 };
      e.prev += r.postePrev;
      e.exec += r.posteExec;
      byEnc.set(r.encarregado, e);
    });
    const list = [...byEnc.entries()].sort((a, b) => b[1].prev - a[1].prev || b[1].exec - a[1].exec);
    const labels = list.map(([n]) => n.split(' ').slice(0, 2).join(' '));
    const inner = document.getElementById('postes-inner');
    inner.style.width = Math.max(list.length * 70, inner.parentElement.clientWidth) + 'px';
    draw('chart-postes', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Poste previsto', data: list.map(([, v]) => v.prev), backgroundColor: K.cyan, borderRadius: 4, categoryPercentage: 0.7, barPercentage: 0.9 },
          { label: 'Poste executado', data: list.map(([, v]) => v.exec), backgroundColor: K.orange, borderRadius: 4, categoryPercentage: 0.7, barPercentage: 0.9 },
        ],
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: K.text, maxRotation: 50, minRotation: 50, autoSkip: false, font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: K.grid } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => list[items[0].dataIndex][0],
              footer: (items) => {
                const v = list[items[0].dataIndex][1];
                return `Execução: ${fmtPct(pct(v.exec, v.prev))}`;
              },
            },
          },
        },
      },
    });
  };

  return { renderFaturamento, renderAndamento, renderFechamento, renderSupervisores, renderUtep, renderPostes };
})();
