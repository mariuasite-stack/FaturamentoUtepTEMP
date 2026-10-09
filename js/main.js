// Orquestração: carga, filtros e renderização
(() => {
  // Planilha é a programação de outubro: todas as obras contam para o mês,
  // inclusive as que iniciaram antes (ex.: setembro).
  const FILTERS = ['f-sup', 'f-utep'];
  const state = { prog: [], fech: new Map(), fechMode: 'status' };
  const $ = (id) => document.getElementById(id);

  const fillSelect = (el, values, labelFn = (v) => v) => {
    const current = el.value;
    el.innerHTML = '<option value="">Todos</option>' + values.map((v) => `<option value="${v}">${labelFn(v)}</option>`).join('');
    if (values.includes(current)) el.value = current;
  };

  const buildFilters = () => {
    fillSelect($('f-sup'), [...new Set(state.prog.map((r) => r.supervisor))].sort());
    fillSelect($('f-utep'), [...new Set(state.prog.map((r) => r.utep))].sort());
  };

  const filtered = () => {
    const sup = $('f-sup').value;
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
    Charts.renderSupervisores(rows);
    Charts.renderUtep(rows);
    Charts.renderPostes(rows);
  };

  const load = async () => {
    document.body.classList.add('loading');
    $('error').hidden = true;
    try {
      const [prog, fech] = await Promise.all([Data.loadProgramacao(), Data.loadFechamento()]);
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

  // Alterna o gráfico de fechamento entre Status (col. AJ) e Pendência (col. AE)
  document.querySelectorAll('.seg button').forEach((b) =>
    b.addEventListener('click', () => {
      state.fechMode = b.dataset.mode;
      document.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('active', x === b));
      Charts.renderFechamento(filtered(), state.fech, state.fechMode);
    })
  );

  $('sup-prev').addEventListener('click', () => Charts.nextSupervisor(-1));
  $('sup-next').addEventListener('click', () => Charts.nextSupervisor(1));
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('select')) return;
    if (e.key === 'ArrowLeft') Charts.nextSupervisor(-1);
    if (e.key === 'ArrowRight') Charts.nextSupervisor(1);
  });
  load();
})();
