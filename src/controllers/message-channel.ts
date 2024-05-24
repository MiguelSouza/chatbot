import NodeCache from 'node-cache'
import { MessageChannel } from '../usecases/'

export class MessageChannelController {
  private readonly messageChannel: MessageChannel

  constructor(messageChannel: MessageChannel) {
    this.messageChannel = messageChannel
  }

  async waitingMessage(request: any, response: any, conversations: NodeCache) {
    console.log('oi')
    await this.messageChannel.execute(request.body, conversations)
  }
}
