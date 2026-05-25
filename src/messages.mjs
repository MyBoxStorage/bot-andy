export const M = {
  lembrete2h: ({ nome, hora, servico, barbeiro }) =>
    `Fala${nome ? `, ${nome}` : ''}! 👊 Tua reserva na *Andy Na Régua* é hoje às *${hora}* (${servico} com ${barbeiro}).\n\nConfirma presença? Responde *SIM* ou *NÃO*.\n\n_Você tem até 1h antes pra confirmar._`,

  cancelAuto: ({ hora, rigorosa }) =>
    `Brother, teu horário das *${hora}* foi cancelado porque não recebemos confirmação. 😕\n\nSe quiser remarcar, é só me chamar.${rigorosa ? '\n\n_Como essa é a 2ª vez sem confirmar, próximas reservas vão precisar de sinal de 50% via Pix pra garantir o horário. 🙏_' : ''}`,

  cancelMeio: () =>
    `Tranquilo, cancelo aqui. Só um toque, brother: como tá em cima da hora, isso conta como meio no-show. Tenta avisar com mais antecedência da próxima vez 👊`,

  cancelTarde: () =>
    `Cancelei aqui, brother. Como foi com menos de 1h, isso entra como no-show completo. Tenta avisar com mais antecedência da próxima 🙏`,

  sinalSolicitado: ({ valor, chavePix }) =>
    `Brother, como teve 2 no-shows no histórico, pra confirmar o horário precisa de sinal de 50% (R$${valor}) via Pix:\n\n*${chavePix}*\n\nManda o comprovante aqui que o Andy aprova e eu garanto teu horário. 👊`,

  sinalAguardando: () =>
    `Recebido! ✅ Tô passando pro Andy aprovar. Assim que ele OK eu te confirmo aqui.`,

  sinalAprovado: ({ hora, dataLabel, barbeiro, servico }) =>
    `Show! Sinal aprovado. ✅\n\nTua reserva tá confirmada: *${servico}* no ${dataLabel} às *${hora}* com ${barbeiro}. Te espero!`,

  slotPerdido: ({ alternativas }) =>
    `Ih, brother, esse horário acabou de ser pego enquanto a gente conversava. 😕\n\nTenho ${alternativas.join(' ou ')} no lugar. Qual prefere?`,

  filaAbriu: ({ hora, dataLabel }) =>
    `Boa notícia! 🎉 O horário que você queria — *${hora} do ${dataLabel}* — abriu!\n\nQuer que eu reserve? Responde *SIM* que eu garanto.`,

  upsellPosAg: ({ nome, produtos }) => {
    const lista = produtos.map(p => `*${p.nome}* — R$ ${p.preco.toFixed(2)}\n_${p.descricao || ''}_`).join('\n\n')
    return `Aproveitando${nome ? `, ${nome}` : ''}: pra manter o resultado no ponto, recomendo esses produtos que combinam com o teu serviço:\n\n${lista}\n\nTá tudo no balcão quando vier. Qualquer dúvida, me avisa 👊`
  },

  upsellPosServico: ({ nome, produtos }) => {
    const lista = produtos.map(p => `*${p.nome}* — R$ ${p.preco.toFixed(2)}`).join('\n')
    return `E aí${nome ? `, ${nome}` : ''}! Pra prolongar o resultado em casa, esses dois aqui funcionam muito:\n\n${lista}\n\nDa próxima vinda dá uma olhada no balcão. 😊`
  },

  feedback: ({ nome }) =>
    `E aí${nome ? `, ${nome}` : ''}! Ficou show o serviço? De *0 a 10*, quanto você dá pro atendimento de hoje? 👊`,

  feedbackPositivo: (link = '') =>
    `Show, brother! 🙌 Se puder deixar uma avaliação no Google ajuda demais a barbearia:\n\n${link || '[link Google review]'}\n\nValeu de mais!`,

  feedbackNegativo: () =>
    `Poxa, foi mal mesmo. 😕 Tô passando pro Andy direto pra ele te responder. Valeu por avisar.`,

  reativacao: ({ nome, dias }) =>
    `Fala${nome ? `, ${nome}` : ''}! ✂️ Faz uns ${dias} dias do teu último corte na Andy Na Régua. Bora marcar essa semana?`,

  handoff: () =>
    `Vou pedir pro Andy te responder direto, só um instante! ✂️`,

  handoffFollowUp: () =>
    `Brother, o Andy tá vendo aqui já. Qualquer coisa eu reforço. Tamo junto! 👊`,

  dadoSensivel: () =>
    `Pode tirar isso daí, brother. Aqui a gente não precisa desses dados 😉`,

  sticker: () =>
    `Recebido 😊 Como posso ajudar?`,

  foraHorarioAgora: ({ proximoDia, proximaHora }) =>
    `Hoje a gente tá fechado, brother. Abrimos *${proximoDia}* às *${proximaHora}*. Quer que eu já deixe um horário marcado pra você?`,

  audioLongo: () =>
    `Áudio meio longo, brother. Pode resumir em texto ou um áudio menor? Assim consigo te atender melhor.`,

  falhaApi: () =>
    `Brother, tô com uma instabilidade aqui. Já tô chamando o Andy pra te atender direto. Aguenta um instante. 👊`,

  boasVindas: () =>
    `Fala, brother! Aqui é o atendente da Andy Na Régua ✂️ Como posso te chamar?`,

  posNome: ({ nome }) =>
    `Prazer, ${nome}! Posso te ajudar com agendamento, dúvidas sobre serviços ou produtos. (PS: usamos teu nome só pra personalizar o atendimento, conforme a LGPD.) O que vai ser?`,

  confirmadoLembrete: () =>
    `Confirmado! ✅ Te esperamos no horário. Qualquer coisa é só chamar!`,

  canceladoCliente: () =>
    `Tudo bem, cancelei teu horário! 😊 Quando quiser remarcar é só falar.`,

  falhaTecnica: () =>
    `Tive um probleminha técnico aqui, pode tentar de novo? 🙏`,
}
