// Carregamento e normalização das planilhas
const Data = (() => {
  const parseBRL = (v) => {
    if (v == null) return 0;
    const s = String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const num = (v) => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };

  // dd/mm/yyyy (ou dd/mm/yy) -> Date (meia-noite local)
  const parseDate = (v) => {
    const m = String(v ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;
    let y = +m[3];
    if (y < 100) y += 2000;
    return new Date(y, +m[2] - 1, +m[1]);
  };

  // "ALAN NUNES BARRETO - MRA415566" -> "ALAN NUNES BARRETO"
  const cleanName = (v) => String(v ?? '').split('-')[0].trim();

  const normKey = (v) => String(v ?? '').trim().toUpperCase();

  const isEnergizada = (anotacao) => normKey(anotacao).includes('ENERGIZADA');

  const fetchCSV = async (url) => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Falha ao carregar planilha (${res.status})`);
    const text = await res.text();
    return Papa.parse(text, { skipEmptyLines: false }).data;
  };

  const loadProgramacao = async () => {
    const C = CONFIG.PROG;
    const rows = (await fetchCSV(CONFIG.URL_PROGRAMACAO)).slice(CONFIG.PROG_SKIP);
    return rows
      .filter((r) => r[C.OBRA] && r[C.OBRA].trim())
      .map((r) => ({
        encarregado: cleanName(r[C.ENCARREGADO]) || '—',
        supervisor: normKey(r[C.SUPERVISOR]) || '—',
        obra: normKey(r[C.OBRA]),
        valor: parseBRL(r[C.VALOR]),
        utep: normKey(r[C.UTEP]) || '—',
        energizada: isEnergizada(r[C.ANOTACOES]),
        postePrev: num(r[C.POSTE_PREV]),
        posteExec: num(r[C.POSTE_EXEC]),
        inicio: parseDate(r[C.INICIO]),
        termino: parseDate(r[C.TERMINO]),
      }));
  };

  // Map obra -> status GEOEX
  const loadFechamento = async () => {
    const C = CONFIG.FECH;
    const rows = (await fetchCSV(CONFIG.URL_FECHAMENTO)).slice(CONFIG.FECH_SKIP);
    const map = new Map();
    rows.forEach((r) => {
      const k = normKey(r[C.OBRA]);
      if (!k) return;
      const st = String(r[C.GEOEX] ?? '').trim();
      // Mantém o primeiro status não vazio encontrado
      if (!map.has(k) || (!map.get(k) && st)) map.set(k, st);
    });
    return map;
  };

  return { loadProgramacao, loadFechamento, parseBRL, parseDate, cleanName };
})();
