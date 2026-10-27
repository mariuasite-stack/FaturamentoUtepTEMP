// Orquestração: carga, filtros e renderização
(() => {
  // Planilha é a programação do mês selecionado: todas as obras contam para o mês,
  // inclusive as que iniciaram antes do mês.
  const FILTERS = ['f-sup', 'f-utep'];
  const state = { prog: [], fech: new Map(), fechMode: 'status', postesMode: 'equipe' };
  const $ = (id) => document.getElementById(id);

  // Mês: abre no mês atual (ano-mês de hoje) ou, se não existir, no último cadastrado
  const buildMeses = () => {
    const d = new Date();
    const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    $('f-mes').innerHTML = CONFIG.MESES.map((m) => `<option value="${m.key}">${m.label}</option>`).join('');
    $('f-mes').value = (CONFIG.MESES.find((m) => m.key === hoje) || CONFIG.MESES[CONFIG.MESES.length - 1]).key;
  };
  const mesAtual = () => CONFIG.MESES.find((m) => m.key === $('f-mes').value);

  const fillSelect = (el, values, labelFn = (v) => v) => {
    const current = el.value;
    el.innerHTML = '<option value="">Todos</option>' + values.map((v) => `<option value="${v}">${labelFn(v)}</option>`).join('');
    if (values.includes(current)) el.value = current;
  };

  const buildFilters = () => {
    fillSelect($('f-sup'), [...[...new Set(state.prog.map((r) => r.supervisor))].sort(), CONFIG.SUP_FIXO]);
    fillSelect($('f-utep'), [...new Set(state.prog.map((r) => r.utep))].sort());
  };

  const filtered = () => {
    // Supervisor fixo não existe na coluna B: filtra só por UTEP
    const sup = $('f-sup').value === CONFIG.SUP_FIXO ? '' : $('f-sup').value;
    const utep = $('f-utep').value;
    return state.prog.filter(
      (r) => (!sup || r.supervisor === sup) && (!utep || r.utep === utep)
    );
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
      const [prog, fech] = await Promise.all([Data.loadProgramacao(mesAtual().url), Data.loadFechamento()]);
      state.prog = prog;
      state.fech = fech;
      buildFilters();
      render();
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
  $('f-mes').addEventListener('change', load);

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
  buildMeses();
  load();
})();
