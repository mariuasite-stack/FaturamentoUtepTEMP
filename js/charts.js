// Renderização de cada seção do dashboard
const Charts = (() => {
  const K = CONFIG.COLORS;
  const instances = {};

  // Valores sempre completos com centavos: R$ 1.111.111,00 / R$ 11.111,00
  const fmtBRL = (v) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    // < 20% vermelho · 20–60% laranja · > 60% verde
    const level = p < 20 ? 'low' : p <= 60 ? 'mid' : 'high';
    const pctEl = document.getElementById('fat-pct');
    pctEl.textContent = fmtPct(p);
    pctEl.dataset.level = level;
    document.getElementById('fat-rest').textContent = fmtBRL(Math.max(prev - exec, 0));
    const bar = document.getElementById('fat-bar');
    bar.dataset.level = level;
    bar.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.width = Math.min(p, 100) + '%')));
  };

  // 2. Andamento de obras
  // Energizada = status da coluna J; demais pela data de início
  // (antes do início = Programada; a partir do início = Em execução).
  const statusObra = (r, today) => {
    if (r.energizada) return 'Energizada';
    if (!r.inicio || today < r.inicio) return 'Programada';
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

  // 3. Obras em fechamento — modo 'status' (GEOEX, col. AJ) ou 'pendencia' (col. AE),
  //    sempre considerando apenas as obras energizadas
  const SEM_PEND = 'Sem pendência';
  const NAO_ENC = 'Não encontrada no fechamento';

  const groupFechamento = (energizadas, fechMap, mode) => {
    const groups = new Map();
    const add = (cat, obra) => {
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(obra);
    };
    energizadas.forEach((r) => {
      const f = fechMap.get(r.obra);
      if (mode === 'status') {
        const st = (f?.status || '').toLowerCase();
        add(st === 'postado' ? 'POSTADO NEOEX' : st === 'aceita' ? 'ACEITA NEOEX' : 'NÃO POSTADA', r.obra);
      } else if (!f) add(NAO_ENC, r.obra);
      else if (!f.pendencias.length) add(SEM_PEND, r.obra);
      else f.pendencias.forEach((p) => add(p, r.obra));
    });
    if (mode === 'status') {
      const cats = ['ACEITA NEOEX', 'POSTADO NEOEX', 'NÃO POSTADA'];
      const colors = [K.cyan, K.orange, K.greyLight];
      return cats.map((c, i) => ({ label: c, obras: groups.get(c) || [], color: colors[i] }));
    }
    // Pendências reais ordenadas por quantidade; "sem pendência" e "não encontrada" ao final
    const real = [...groups.entries()].filter(([c]) => c !== SEM_PEND && c !== NAO_ENC).sort((x, y) => y[1].length - x[1].length);
    const list = real.map(([c, o]) => ({ label: c, obras: o, color: K.orange }));
    if (groups.has(SEM_PEND)) list.push({ label: SEM_PEND, obras: groups.get(SEM_PEND), color: K.cyan });
    if (groups.has(NAO_ENC)) list.push({ label: NAO_ENC, obras: groups.get(NAO_ENC), color: K.greyLight });
    return list;
  };

  const renderFechamento = (rows, fechMap, mode = 'status') => {
    const energizadas = rows.filter((r) => r.energizada);
    const data = groupFechamento(energizadas, fechMap, mode);
    draw('chart-fechamento', {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [{ data: data.map((d) => d.obras.length), backgroundColor: data.map((d) => d.color), borderRadius: 6, barPercentage: 0.6, maxBarThickness: 34 }],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: K.grid } },
          y: { grid: { display: false }, ticks: { color: K.text, font: { weight: 600 } } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.raw} obras`, afterLabel: (c) => data[c.dataIndex].obras.slice(0, 12).join('\n') } },
        },
      },
    });
    document.getElementById('fech-total').textContent = `${energizadas.length} energizadas`;
    document.getElementById('fech-list').innerHTML =
      data
        .map((d) => (d.obras.length
          ? `<div class="tag-group"><span class="dot" style="background:${d.color}"></span><b>${d.label}</b>${d.obras.map((o) => `<span class="tag">${o}</span>`).join('')}</div>`
          : ''))
        .join('') || '<span class="muted">Nenhuma obra energizada no filtro atual.</span>';
  };

  // 4. Status por supervisor — carrossel, 1 supervisor por vez
  let supIndex = 0;
  let supCount = 0;

  const showSupervisor = (i) => {
    if (!supCount) return;
    supIndex = (i + supCount) % supCount;
    document.getElementById('sup-track').style.transform = `translateX(-${supIndex * 100}%)`;
    document.getElementById('sup-counter').textContent = `${supIndex + 1} / ${supCount}`;
    document.querySelectorAll('#sup-dots button').forEach((b, j) => b.classList.toggle('active', j === supIndex));
  };

  const renderSupervisores = (rows, fechMap, supFilter = '') => {
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
    // Supervisor fixo: obras energizadas que constam no fechamento, faturamento = coluna AB (linha viva)
    const ircCard = (i) => {
      const base = rows.filter((r) => r.energizada && fechMap.has(r.obra));
      const com = base.filter((r) => fechMap.get(r.obra).linhaViva > 0);
      const sup = CONFIG.SUP_FIXO;
      return `<div class="sup-card ${i % 2 ? 'alt' : ''}">
          <div class="sup-name"><span class="avatar">${sup.charAt(0)}</span><div><b>${sup}</b><small>${base.length} obras energizadas no fechamento</small></div></div>
          <div class="sup-metrics">
            ${metric('Obras linha viva', com.length, base.length, fmtInt, K.cyan)}
            <div class="sup-metric">
              <div class="sup-metric-head"><span>Faturamento linha viva</span></div>
              <div class="sup-metric-val"><b>${fmtBRL(sum(com, (r) => fechMap.get(r.obra).linhaViva))}</b></div>
            </div>
          </div>
        </div>`;
    };
    const isFixo = supFilter === CONFIG.SUP_FIXO;
    const entries = isFixo ? [] : [...bySup.entries()].sort((a, b) => b[1].length - a[1].length);
    if (!supFilter || isFixo) entries.push([CONFIG.SUP_FIXO, null]);
    supCount = entries.length;
    document.getElementById('sup-track').innerHTML = entries
      .map(([sup, list], i) => {
        if (!list) return ircCard(i);
        const en = list.filter((r) => r.energizada);
        return `<div class="sup-card ${i % 2 ? 'alt' : ''}">
          <div class="sup-name"><span class="avatar">${sup.charAt(0)}</span><div><b>${sup}</b><small>${list.length} obras programadas</small></div></div>
          <div class="sup-metrics">
            ${metric('Postes exec / prev', sum(list, (r) => r.posteExec), sum(list, (r) => r.postePrev), fmtInt, K.orange)}
            ${metric('Obras energizadas', en.length, list.length, fmtInt, K.cyan)}
            ${metric('Faturamento energizado', sum(en, (r) => r.valor), sum(list, (r) => r.valor), fmtBRL, K.cyan)}
          </div>
        </div>`;
      })
      .join('') || '<div class="sup-card"><span class="muted">Sem dados.</span></div>';
    document.getElementById('sup-dots').innerHTML = entries
      .map(([sup], i) => `<button type="button" title="${sup}" data-i="${i}"></button>`)
      .join('');
    document.querySelectorAll('#sup-dots button').forEach((b) => b.addEventListener('click', () => showSupervisor(+b.dataset.i)));
    document.querySelectorAll('.sup-arrow').forEach((b) => (b.disabled = supCount < 2));
    showSupervisor(Math.min(supIndex, Math.max(supCount - 1, 0)));
  };

  const nextSupervisor = (step) => showSupervisor(supIndex + step);

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
          x: { stacked: true, beginAtZero: true, ticks: { callback: (v) => fmtBRL(v), maxTicksLimit: 5 }, grid: { color: K.grid } },
          y: { stacked: true, grid: { display: false }, ticks: { color: K.text, font: { weight: 600 } } },
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            onClick: null,
            labels: { generateLabels: () => [...uteps.map((u) => legendItem(u, utepColor(u))), legendItem('Previsto', K.grey)] },
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

  return { renderFaturamento, renderAndamento, renderFechamento, renderSupervisores, nextSupervisor, renderUtep, renderPostes };
})();
