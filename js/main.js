// Orquestração: carga, filtros e renderização
(() => {
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const FILTERS = ['f-mes', 'f-sup', 'f-utep'];
  const state = { prog: [], fech: new Map() };
  const $ = (id) => document.getElementById(id);

  const monthKey = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '');

  const fillSelect = (el, values, labelFn = (v) => v) => {
    const current = el.value;
    el.innerHTML = '<option value="">Todos</option>' + values.map((v) => `<option value="${v}">${labelFn(v)}</option>`).join('');
    if (values.includes(current)) el.value = current;
  };

  const buildFilters = () => {
    const months = [...new Set(state.prog.map((r) => monthKey(r.inicio)).filter(Boolean))].sort();
    fillSelect($('f-mes'), months, (k) => {
      const [y, m] = k.split('-');
      return `${MESES[+m - 1]}/${y}`;
    });
    fillSelect($('f-sup'), [...new Set(state.prog.map((r) => r.supervisor))].sort());
    fillSelect($('f-utep'), [...new Set(state.prog.map((r) => r.utep))].sort());
  };

  const filtered = () => {
    const mes = $('f-mes').value;
    const sup = $('f-sup').value;
    const utep = $('f-utep').value;
    return state.prog.filter(
      (r) => (!mes || monthKey(r.inicio) === mes) && (!sup || r.supervisor === sup) && (!utep || r.utep === utep)
    );
  };

  const render = () => {
    const rows = filtered();
    Charts.renderFaturamento(rows);
    Charts.renderAndamento(rows);
    Charts.renderFechamento(rows, state.fech);
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
  load();
})();
