import NodeCache from 'node-cache'
import { WhatsAppBrokerService } from '../broker/whatsapp-broker'
import { CustomerService } from '../services/customer-service'

interface Conversation {
  state: string
  userId: string
  phone: string
  name: string
}

export class MessageChannel {
  private readonly whatsappBroker: WhatsAppBrokerService
  private readonly customerService: CustomerService

  constructor(
    whatsappBroker: WhatsAppBrokerService,
    customerService: CustomerService,
  ) {
    this.whatsappBroker = whatsappBroker
    this.customerService = customerService
  }

  async execute(body: any, conversations: NodeCache): Promise<void> {
    try {
      const { Body, From, To } = body
      const optionsMessage = await this.buildOptionsMessage(
        Body,
        To,
        From,
        conversations,
      )
      await this.whatsappBroker.sendMessage(optionsMessage)

      let conversation: Conversation = (conversations &&
        conversations.get(From)) || {
        state: '',
        userId: '',
        phone: '',
        name: '',
      }

      if (conversation.state === 'finished_tele_ia') {
        setTimeout(
          async () => {
            const optionsMessage = await this.buildOptionsMessage(
              Body,
              To,
              From,
              conversations,
            )

            await this.whatsappBroker.sendMessage(optionsMessage)
          },
          1000 * 60 * 10,
        )
      }
    } catch (error) {
      console.error('An error occurred:', error)
    }
  }

  async buildOptionsMessage(body: any, to: any, from: any, conversations: any) {
    let conversation = conversations && conversations.get(from)
    const message: any = {
      from: to,
      to: from,
      body: '',
    }
    if (!conversation) {
      conversations.set(from, {
        state: 'first_option',
        userId: '',
        phone: '',
        name: '',
        type: '',
      })
      conversation = conversations && conversations.get(from)
      message.body = [
        'Olá, bem vindo(a) a Tele Clínica Brasil 💙\n' +
          '1 - Sou cliente e quero atendimento \n' +
          '2 - Não sou cliente',
      ]
    } else {
      switch (conversation.state) {
        case 'first_option':
          if (body === '1') {
            message.body =
              'Se você já é cliente, insira o seu CPF para começar o atendimento \n\n ' +
              'Informe apenas os 11 números. Ex: 00000000000'
            conversation.state = 'start'
          } else if (body === '2') {
            message.body =
              'Para dúvidas de suporte e comercial entre em contato pelo número 👇 \n +55 (54) 996263972 \n\n' +
              'Para voltar ao menu anterior digite 1'
            conversation.state = 'initial_finished'
          } else {
            message.body =
              'Essa opção não existe, por favor selecionar a opção desejada.'
            conversation.state = 'first_option'
          }
          break
        case 'start':
          const customer = await this.customerService.getCustomerData(body)
          const simpleCustomer =
            await this.customerService.getSimpleCustomer(body)
          if (simpleCustomer && simpleCustomer.IdUsuario) {
            message.body = `Por favor, confirme o nome da pessoa que precisa do atendimento \n\n ${customer.Nome}? \n\n 1. Sim, o nome está correto. \n 2. Não, o nome não está correto.`
            conversation.name = customer.Nome
            conversation.userId = simpleCustomer.IdUsuario
            conversation.personId = customer.Id
            conversation.state = 'check_customer'
          } else {
            message.body =
              'Não encontramos o seu CPF. \n ' +
              'Lamentamos pelo inconveniente. Por favor, entre em contato com nossa central pelo número 54 9 9626-3952 para atualizar seu cadastro. Agradecemos sua compreensão. \n' +
              '1 - Voltar ao menu inicial \n\n' +
              '9 - Finalizar seu atendimento.'
            conversation.state = 'initial_finished'
          }

          break
        case 'check_customer':
          if (body === '1') {
            message.body = [
              'Estamos prontos para ajudar você 💙\n\n ' +
                'Por favor, não envie arquivo de áudio ou vídeo.',
              `Ei ${conversation.name}, \nPor favor, digite o número de uma das opções:\n` +
                '1 - Teletriagem por vídeo chamada\n' +
                '2 - Teletriagem Inteligente (IA)\n' +
                '3 - Entrar em contato por ligação\n' +
                '4 - Adicionar Dependentes\n\n ' +
                '9 - Encerrar Atendimento',
            ]
            conversation.state = 'select_service'
          } else if (body === '2') {
            message.body =
              'Lamentamos pelo inconveniente. Por favor, entre em contato com nossa central pelo número 54 9 9626-3972 para atualizar seu cadastro. Agradecemos sua compreensão. \n\n' +
              '1 - Voltar ao menu inicial \n\n' +
              '9 - Finalizar seu atendimento.'
            conversation.state = 'initial_finished'
          } else {
            message.body =
              'Essa opção não existe, por favor selecionar a opção desejada.'
            conversation.state = 'check_customer'
          }

          break
        case 'select_service':
          if (body === '1') {
            const linkVideo = await this.customerService.getLinkVideo(
              conversation.userId,
              conversation.phone,
            )
            message.body = [
              'Clique no link abaixo para acessar a sala de espera da teletriagem por videochamada 👇\n' +
                'Por favor, certifique-se de usar o navegador Chrome ou Safari para uma melhor experiência.\n' +
                `${linkVideo.Url}\n\n\n` +
                'Para voltar ao menu anterior digite 1',
            ]
            conversation.type = 'videochamada'
            conversation.state = 'finished_tele_ia'
          } else if (body === '2') {
            const linkVideo = await this.customerService.getLinkVideoIA(
              conversation.personId,
            )
            message.body = [
              'Nossa Teletriagem inteligente combina tecnologias de inteligência artificial e linguagem natural para te ajudar no início dos sintomas e orientar para o melhor desfecho de acordo com seu nível de urgência. O desfecho da sua Teletriagem pode ser o encaminhamento para uma Teleconsulta por vídeo, orientações de saúde ou necessidade de atendimento presencial. Para seguir com seu atendimento de Teletriagem inteligente, clique no link abaixo 👇\n' +
                `${linkVideo.urlChat}\n\n` +
                'Para volta ao menu anterior, digite 9',
            ]
            conversation.type = 'tele_ia'
            conversation.state = 'finished_tele_ia'
          } else if (body === '3') {
            message.body = [
              'Entre em contato pelo 0800 333 4426',
              'Para volta ao menu anterior, digite 9',
            ]

            conversation.state = 'finished'
          } else if (body === '4') {
            message.body = [
              'Para adicionar dependentes ao seu plano é preciso acessar o aplicativo. Saúde 24horas \n 1 - Play Store / Android \n 2 - iOS / Iphone',
            ]

            conversation.state = 'select_app'
          } else if (body === '9') {
            message.body = ['Atendimento finalizado!']

            conversation.state = 'finished'
          } else {
            message.body =
              'Essa opção não existe, por favor selecionar a opção desejada.'
            conversation.state = 'select_service'
          }

          break
        case 'select_app':
          if (body === '1') {
            message.body = [
              'Acesse o Link para baixar o App e siga as instruções: \n' +
                '1 - Se você está realizando o primeiro acesso, informe apenas o número do seu CPF.\n' +
                '2 - Após solicite o código de verificação por SMS, Whatsapp ou e-mail.\n' +
                '3 - Confirme o número ou e-mail.\n' +
                '4 - Crie a sua senha de acesso, lembre-se a senha deve ter no mínimo 8 caracteres, incluindo números, caracteres especiais (*@#), letras maiúsculas e minúsculas (exemplo: Jose@2024).\n\n\n' +
                'Para voltar ao menu anterior digite 1',
              'Link: https://play.google.com/store/apps/details?id=br.com.ambienteprd.saude&hl=pt_BR',
            ]
            conversation.state = 'finished'
          } else if (body === '2') {
            message.body = [
              'Acesse o Link para baixar o App e siga as instruções: \n' +
                '1 - Se você está realizando o primeiro acesso, informe apenas o número do seu CPF.\n' +
                '2 - Após solicite o código de verificação por SMS, Whatsapp ou e-mail.\n' +
                '3 - Confirme o número ou e-mail.\n' +
                '4 - Crie a sua senha de acesso, lembre-se a senha deve ter no mínimo 8 caracteres, incluindo números, caracteres especiais (*@#), letras maiúsculas e minúsculas (exemplo: Jose@2024).\n\n\n' +
                'Para voltar ao menu anterior digite 1',
              'Link: https://apps.apple.com/br/app/sa%C3%BAde24h/id1101572255',
            ]

            conversation.state = 'finished'
          } else {
            message.body = 'Essa opção não existe, por favor uma opção válida.'
            conversation.state = 'select_app'
          }

          break
        case 'initial_finished':
          if (body === '1') {
            message.body = [
              'Olá, bem vindo(a) a Tele Clínica Brasil 💙\n' +
                '1 - Sou cliente e quero atendimento \n' +
                '2 - Não sou cliente',
            ]
            conversation.state = 'first_option'
          } else if (body === '9') {
            message.body = ['Atendimento finalizado!']

            conversation.state = 'finished'
          } else {
            message.body = [
              'Olá, bem vindo(a) a Tele Clínica Brasil 💙\n' +
                '1 - Sou cliente e quero atendimento \n' +
                '2 - Não sou cliente',
            ]
            conversation.state = 'first_option'
          }

          break

        case 'finished':
          if (body === '1') {
            message.body = [
              'Estou muito feliz em poder ajudar você \n\n ' +
                'Por favor, não envie arquivo de áudio ou vídeo.',

              `Ei ${conversation.name}, \nPor favor, digite o número de uma das opções:\n` +
                '1 - Teletriagem por vídeo chamada\n' +
                '2 - Teletriagem Inteligente (IA)\n' +
                '3 - Entrar em contato por ligação\n ' +
                '4 - Adicionar Dependentes\n\n ' +
                '9 - Encerrar Atendimento',
            ]
            conversation.state = 'select_service'
          } else if (body === '9') {
            message.body = ['Atendimento finalizado!']

            conversation.state = 'finished'
          } else {
            message.body = [
              'Olá, bem vindo(a) a Tele Clínica Brasil 💙\n' +
                '1 - Sou cliente e quero atendimento \n' +
                '2 - Não sou cliente',
            ]
            conversation.state = 'first_option'
          }
          break
        case 'finished_tele_ia':
          if (body === '9') {
            message.body = [
              'Estou muito feliz em poder ajudar você \n\n ' +
                'Por favor, não envie arquivo de áudio ou vídeo.',

              `Ei ${conversation.name}, \nPor favor, digite o número de uma das opções:\n` +
                '1 - Teletriagem por vídeo chamada\n' +
                '2 - Teletriagem Inteligente (IA)\n' +
                '3 - Entrar em contato por ligação\n' +
                '4 - Adicionar Dependentes\n\n' +
                '9 - Encerrar Atendimento',
            ]
            conversation.state = 'select_service'
          } else {
            message.body = [
              'Já finalizou seu atendimento? Queremos a sua opinião! \n ' +
                'Este atendimento te ajudou.\n' +
                '1 - Sim, estou satisfeito \n' +
                '2 - Não, estou insatisfeito',
            ]
            conversation.state = 'satisfaction_survey'
          }
          break
        case 'satisfaction_survey':
          if (body === '1') {
            message.body = [
              'A sua triagem foi finalizada 💙\n ' +
                'Obrigado por escolher nossos serviços! Se precisar de mais alguma coisa, não hesite em nos contatar.',
            ]

            conversation.state = 'finished'
          } else if (body === '2') {
            if (conversation.type == 'videochamada') {
              message.body = [
                'Que pena, gostaria de iniciar um novo atendimento pela Teletriagem Inteligente(IA)? \n\n' +
                  '1 - Sim\n' +
                  '2 - Não',
              ]
              conversation.state = 'talk_to_ia'
            } else {
              message.body = [
                'Que pena, gostaria de iniciar um novo atendimento de teletriagem por vídeochamada com um de nossos enfermeiros(as)? \n\n' +
                  '1 - Sim\n' +
                  '2 - Não',
              ]
              conversation.state = 'talk_to_nurse'
            }
          } else {
            message.body = 'Essa opção não existe, por favor uma opção válida.'
            conversation.state = 'satisfaction_survey'
          }
          break
        case 'talk_to_nurse':
          if (body === '1') {
            const linkVideo = await this.customerService.getLinkVideo(
              conversation.userId,
              conversation.phone,
            )
            message.body = [
              'Clique no link abaixo para acessar a sala de espera da teletriagem por videochamada 👇\n' +
                'Por favor, certifique-se de usar o navegador Chrome ou Safari para uma melhor experiência.\n' +
                `${linkVideo.Url}\n\n\n` +
                'Para voltar ao menu anterior digite 1',
            ]
            conversation.state = 'finished'
          } else if (body === '2') {
            message.body = [
              'Estou muito feliz em poder ajudar você \n\n ' +
                'Por favor, não envie arquivo de áudio ou vídeo.',

              `Ei ${conversation.name}, \nPor favor, digite o número de uma das opções:\n` +
                '1 - Teletriagem por vídeo chamada\n' +
                '2 - Teletriagem Inteligente (IA)\n' +
                '3 - Entrar em contato por ligação\n' +
                '4 - Adicionar Dependentes\n\n' +
                '9 - Encerrar Atendimento',
            ]
            conversation.state = 'select_service'
          } else {
            message.body = 'Essa opção não existe, por favor uma opção válida.'
            conversation.state = 'talk_to_nurse'
          }
          break
        case 'talk_to_ia':
          if (body === '1') {
            const linkVideo = await this.customerService.getLinkVideoIA(
              conversation.personId,
            )
            message.body = [
              'Nossa Teletriagem inteligente combina tecnologias de inteligência artificial e linguagem natural para te ajudar no início dos sintomas e orientar para o melhor desfecho de acordo com seu nível de urgência. O desfecho da sua Teletriagem pode ser o encaminhamento para uma Teleconsulta por vídeo, orientações de saúde ou necessidade de atendimento presencial. Para seguir com seu atendimento de Teletriagem inteligente, clique no link abaixo 👇\n' +
                `${linkVideo.urlChat}\n\n` +
                'Para volta ao menu anterior, digite 9',
            ]
            conversation.state = 'finished_tele_ia'
          } else if (body === '2') {
            message.body = [
              'Estou muito feliz em poder ajudar você \n\n ' +
                'Por favor, não envie arquivo de áudio ou vídeo.',

              `Ei ${conversation.name}, \nPor favor, digite o número de uma das opções:\n` +
                '1 - Teletriagem por vídeo chamada\n' +
                '2 - Teletriagem Inteligente (IA)\n' +
                '3 - Entrar em contato por ligação\n' +
                '4 - Adicionar Dependentes\n\n' +
                '9 - Encerrar Atendimento',
            ]
            conversation.state = 'select_service'
          } else {
            message.body = 'Essa opção não existe, por favor uma opção válida.'
            conversation.state = 'talk_to_nurse'
          }
          break
      }
      conversations.set(from, conversation)
    }

    return message
  }
}
