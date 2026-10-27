// Orquestração: carga, filtros e renderização
(() => {
  // Cada mês mostra a programação da sua planilha (inclusive obras iniciadas antes do mês),
  // exceto obras com AVNP <= CONFIG.AVNP_LIMITE_MES_TERMINO: essas contam no mês da coluna TERMINO.
  const FILTERS = ['f-sup', 'f-utep', 'f-avnp'];
  const state = { prog: [], porMes: new Map(), fech: new Map(), fechMode: 'status', postesMode: 'equipe' };
  const $ = (id) => document.getElementById(id);

  const ymKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const mesLabel = (key) => {
    const [y, m] = key.split('-').map(Number);
    const nome = new Date(y, m - 1, 1).toLocaleString('pt-BR', { month: 'long' });
    return `${nome[0].toUpperCase()}${nome.slice(1)}/${y}`;
  };

  // planilhas: [{ key, rows }] na ordem de CONFIG.MESES -> Map(mês -> rows)
  const distribuir = (planilhas) => {
    const porMes = new Map(planilhas.map((p) => [p.key, []]));
    const add = (key, r) => (porMes.get(key) || porMes.set(key, []).get(key)).push(r);
    // Obras de AVNP baixo com término: uma linha por obra, preferindo a planilha do mês do término,
    // senão a planilha mais recente
    const moveis = new Map();
    planilhas.forEach(({ key, rows }) =>
      rows.forEach((r) => {
        if (!(r.avnp <= CONFIG.AVNP_LIMITE_MES_TERMINO && r.termino)) return add(key, r);
        const destino = ymKey(r.termino);
        const cur = moveis.get(r.obra);
        // Valor de serviço de outra planilha, caso a linha escolhida esteja sem valor
        const valor = (cur && cur.valor) || r.valor;
        if (!cur || cur.key !== destino) moveis.set(r.obra, { key, row: r, valor });
        else cur.valor = cur.valor || valor;
      })
    );
    moveis.forEach(({ row, valor }) => add(ymKey(row.termino), { ...row, valor: row.valor || valor }));
    return porMes;
  };

  // Mês: planilhas cadastradas + meses que só existem pelo TERMINO das obras de AVNP baixo.
  // Mantém o mês selecionado; na primeira carga abre no mês atual ou, se não existir, no último.
  const buildMeses = () => {
    const keys = [...state.porMes.keys()].sort();
    const atual = $('f-mes').value || ymKey(new Date());
    $('f-mes').innerHTML = keys
      .map((k) => `<option value="${k}">${(CONFIG.MESES.find((m) => m.key === k) || { label: mesLabel(k) }).label}</option>`)
      .join('');
    $('f-mes').value = keys.includes(atual) ? atual : (CONFIG.MESES[CONFIG.MESES.length - 1] || {}).key;
  };

  const fillSelect = (el, values, labelFn = (v) => v) => {
    const current = el.value;
    el.innerHTML = '<option value="">Todos</option>' + values.map((v) => `<option value="${v}">${labelFn(v)}</option>`).join('');
    if (values.includes(current)) el.value = current;
  };

  const buildFilters = () => {
    fillSelect($('f-sup'), [...[...new Set(state.prog.map((r) => r.supervisor))].sort(), CONFIG.SUP_FIXO]);
    fillSelect($('f-utep'), [...new Set(state.prog.map((r) => r.utep))].sort());
    fillSelect($('f-avnp'), [...new Set(state.prog.map((r) => String(r.avnp)))].sort((a, b) => b - a), (v) => `${v}%`);
  };

  const filtered = () => {
    // Supervisor fixo não existe na coluna B: filtra só por UTEP
    const sup = $('f-sup').value === CONFIG.SUP_FIXO ? '' : $('f-sup').value;
    const utep = $('f-utep').value;
    const avnp = $('f-avnp').value;
    return state.prog.filter(
      (r) => (!sup || r.supervisor === sup) && (!utep || r.utep === utep) && (!avnp || String(r.avnp) === avnp)
    );
  };

  const selectMes = () => {
    state.prog = state.porMes.get($('f-mes').value) || [];
    buildFilters();
    render();
  };

  const render = () => {
    const rows = filtered();
    Charts.renderFaturamento(rows);
    Charts.renderAndamento(rows);
    Charts.renderFechamento(rows, state.fech, state.fechMode);
    Charts.renderSupervisores(rows, state.fech, $('f-sup').value);
    Charts.renderUtep(rows);
    Charts.renderPostes(rows, state.postesMode);
  };

  const load = async () => {
    document.body.classList.add('loading');
    $('error').hidden = true;
    try {
      const [fech, ...progs] = await Promise.all([
        Data.loadFechamento(),
        ...CONFIG.MESES.map((m) => Data.loadProgramacao(m.url)),
      ]);
      state.porMes = distribuir(CONFIG.MESES.map((m, i) => ({ key: m.key, rows: progs[i] })));
      state.fech = fech;
      buildMeses();
      selectMes();
      $('updated').textContent = 'Atualizado ' + new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
      console.error(e);
      $('error').textContent = 'Erro ao carregar dados: ' + e.message;
      $('error').hidden = false;
    } finally {
      document.body.classList.remove('loading');
    }
  };

  FILTERS.forEach((id) => $(id).addEventListener('change', render));
  $('f-clear').addEventListener('click', () => {
    FILTERS.forEach((id) => ($(id).value = ''));
    render();
  });
  $('refresh').addEventListener('click', load);
  $('f-mes').addEventListener('change', selectMes);

  // Abas segmentadas: liga os botões de um grupo a uma chave do estado
  const bindSeg = (id, key, onChange) =>
    document.querySelectorAll(`#${id} button`).forEach((b) =>
      b.addEventListener('click', () => {
        state[key] = b.dataset.mode;
        document.querySelectorAll(`#${id} button`).forEach((x) => x.classList.toggle('active', x === b));
        onChange();
      })
    );
  // Fechamento: Status (col. AJ) · Pendência (col. AE) · Tipo Pendência (tabela)
  bindSeg('seg-fech', 'fechMode', () => Charts.renderFechamento(filtered(), state.fech, state.fechMode));
  // Barras: postes por equipe · obras por supervisor
  bindSeg('seg-postes', 'postesMode', () => Charts.renderPostes(filtered(), state.postesMode));

  $('sup-prev').addEventListener('click', () => Charts.nextSupervisor(-1));
  $('sup-next').addEventListener('click', () => Charts.nextSupervisor(1));
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('select')) return;
    if (e.key === 'ArrowLeft') Charts.nextSupervisor(-1);
    if (e.key === 'ArrowRight') Charts.nextSupervisor(1);
  });
  load();
})();
