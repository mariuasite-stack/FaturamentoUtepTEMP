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

  // Status da coluna J exatamente "ENERGIZADA" (ignora espaços/maiúsculas)
  const isEnergizada = (anotacao) => normKey(anotacao) === 'ENERGIZADA';

  const fetchCSV = async (url) => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Falha ao carregar planilha (${res.status})`);
    const text = await res.text();
    return Papa.parse(text, { skipEmptyLines: false }).data;
  };

  const loadProgramacao = async (url) => {
    const all = await fetchCSV(url);
    const h = all.findIndex((r) => r.some((c) => normKey(c) === normKey(CONFIG.PROG.OBRA)));
    if (h < 0) throw new Error(`Header "${CONFIG.PROG.OBRA}" não encontrado na programação`);
    const header = all[h].map(normKey);
    const C = {};
    Object.entries(CONFIG.PROG).forEach(([k, name]) => {
      C[k] = header.indexOf(normKey(name));
      if (C[k] < 0) throw new Error(`Coluna "${name}" não encontrada na programação`);
    });
    const rows = all.slice(h + 1);
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

  // Map obra -> { status (GEOEX, col. AJ), pendencias (col. AE, separadas por vírgula), linhaViva (col. AB),
  //              energizacao (data da col. H) }
  const loadFechamento = async () => {
    const C = CONFIG.FECH;
    const rows = (await fetchCSV(CONFIG.URL_FECHAMENTO)).slice(CONFIG.FECH_SKIP);
    const map = new Map();
    rows.forEach((r) => {
      const k = normKey(r[C.OBRA]);
      if (!k) return;
      const status = String(r[C.GEOEX] ?? '').trim();
      const pendencias = String(r[C.PENDENCIA] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
      const linhaViva = parseBRL(r[C.LINHA_VIVA]);
      const energizacao = parseDate(r[C.ENERGIZACAO]);
      const cur = map.get(k);
      if (!cur) map.set(k, { status, pendencias, linhaViva, energizacao });
      else {
        if (!cur.status && status) cur.status = status;
        if (!cur.energizacao && energizacao) cur.energizacao = energizacao;
        cur.linhaViva += linhaViva;
        pendencias.forEach((x) => { if (!cur.pendencias.includes(x)) cur.pendencias.push(x); });
      }
    });
    return map;
  };

  return { loadProgramacao, loadFechamento, parseBRL, parseDate, cleanName };
})();
