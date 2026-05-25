const fmt = (level, args) => {
  const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  console[level](`[${ts}]`, ...args)
}

export const log   = (...args) => fmt('log',   args)
export const warn  = (...args) => fmt('warn',  args)
export const error = (...args) => fmt('error', args)
