// Fontes de dados e mapeamento de colunas (índice 0 = coluna A)
const CONFIG = {
  // Programação por mês (key = ano-mês, usado para abrir no mês atual)
  MESES: [
    { key: '2026-10', label: 'Outubro/2026', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlhIPA8O1KpDFQzgwrEyiMf6zLNKqVop_blp-6lyKiYibbMqZ6rbdc0QNS1AZcO73_5PfWkFdXaD_Q/pub?gid=181484497&single=true&output=csv' },
    { key: '2026-11', label: 'Novembro/2026', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlhIPA8O1KpDFQzgwrEyiMf6zLNKqVop_blp-6lyKiYibbMqZ6rbdc0QNS1AZcO73_5PfWkFdXaD_Q/pub?gid=1964527868&single=true&output=csv' },
  ],
  URL_FECHAMENTO:
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTqkRBosgI-zjU5oDHXwfY8mnecmI0FditEuXB7BKEIdKObFOyCeD6eatHc1kBwSg/pub?gid=14471879&single=true&output=csv',

  // Programação: colunas localizadas pelo nome no header (linha que contém PEP OBRA),
  // pois o layout varia entre os meses
  PROG: {
    ENCARREGADO: 'ENCARREGADOS', SUPERVISOR: 'SUPERVISOR', OBRA: 'PEP OBRA', VALOR: 'VALOR DE SERVIÇO', UTEP: 'UTEP',
    ANOTACOES: 'ANOTAÇÕES', POSTE_PREV: 'POSTE PREV', INICIO: 'INICIO', TERMINO: 'TERMINO', POSTE_EXEC: 'POSTE EXEC', AVNP: 'AVNP',
  },

  // Obras com AVNP (%) até este limite contam no mês da coluna TERMINO, não no mês da planilha
  AVNP_LIMITE_MES_TERMINO: 50,

  // Fechamento: pula 1 linha, a 2ª é header
  FECH_SKIP: 2,
  FECH: { OBRA: 2, ENERGIZACAO: 7, LINHA_VIVA: 27, PENDENCIA: 30, GEOEX: 35 },

  // Supervisor fixo (não vem da coluna B): obras/faturamento via coluna AB do fechamento
  SUP_FIXO: 'GABRIEL-IRC',

  COLORS: {
    cyan: '#00a8cc',
    orange: '#f26b00',
    grey: '#d5dbe3',
    greyLight: '#9aa5b4',
    text: '#0f172a',
    muted: '#5b6675',
    grid: 'rgba(15,23,42,0.07)',
  },
  UTEP_COLORS: { OESTE: '#f26b00', NOROESTE: '#00a8cc' },
};
