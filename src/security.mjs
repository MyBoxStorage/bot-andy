const PADRAO_CARTAO = /\b(?:\d[ -]*?){13,19}\b/
const PADRAO_CPF    = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/
const PADRAO_LINK_SUSPEITO = /https?:\/\/(?!(?:wa\.me|www\.instagram\.com\/andynaregua))/i

export function temDadoSensivel(texto) {
  return PADRAO_CARTAO.test(texto) || PADRAO_CPF.test(texto)
}

export function sanitizarTexto(texto) {
  return texto.replace(PADRAO_LINK_SUSPEITO, '[link removido]')
}

const TENTATIVAS_INJECTION = [
  /ignor[ae]\s+(as\s+)?instru[çc][õo]es?/i,
  /esque[çc]a\s+(as\s+)?regras?/i,
  /finja\s+que\s+(voc[êe]\s+)?[ée]/i,
  /role[\s-]?play\s+como/i,
  /system\s+prompt/i,
  /100%\s+de\s+desconto/i,
  /de\s+gra[çc]a/i,
]

export function tentativaInjection(texto) {
  return TENTATIVAS_INJECTION.some(re => re.test(texto))
}
