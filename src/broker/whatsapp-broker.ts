require('dotenv').config()

const accountSid = process.env.ACCOUNT_SID
const authToken = process.env.AUTH_TOKEN

const client = require('twilio')(accountSid, authToken)

export class WhatsAppBrokerService {
  async sendMessage(message: any): Promise<void> {
    try {
      let messageData = ''
      if (Array.isArray(message.body)) {
        for (let i = 0; i < message.body.length; i++) {
          messageData = {
            ...message,
            shortenUrls: true,
            body: message.body[i],
          }
          await new Promise((resolve) => {
            setTimeout(resolve, 1000)
          })
          client.messages.create(messageData).then((message: any) => message.sid)
        }
      } else {
        client.messages.create(message).then((message: any) => message.sid)
      }
    } catch (error) {
      console.error('Erro ao obter os dados do cliente:', error)
      throw new Error('Erro ao obter os dados do cliente')
    }
  }
}
