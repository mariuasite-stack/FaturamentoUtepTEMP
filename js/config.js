// Fontes de dados e mapeamento de colunas (índice 0 = coluna A)
const CONFIG = {
  URL_PROGRAMACAO:
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlhIPA8O1KpDFQzgwrEyiMf6zLNKqVop_blp-6lyKiYibbMqZ6rbdc0QNS1AZcO73_5PfWkFdXaD_Q/pub?gid=181484497&single=true&output=csv',
  URL_FECHAMENTO:
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTqkRBosgI-zjU5oDHXwfY8mnecmI0FditEuXB7BKEIdKObFOyCeD6eatHc1kBwSg/pub?gid=14471879&single=true&output=csv',

  // Programação: pula 2 linhas, a 3ª é header
  PROG_SKIP: 3,
  PROG: { ENCARREGADO: 0, SUPERVISOR: 1, OBRA: 2, VALOR: 5, UTEP: 7, ANOTACOES: 9, POSTE_PREV: 10, INICIO: 11, TERMINO: 12, POSTE_EXEC: 20 },

  // Fechamento: pula 1 linha, a 2ª é header
  FECH_SKIP: 2,
  FECH: { OBRA: 2, LINHA_VIVA: 27, PENDENCIA: 30, GEOEX: 35 },

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
