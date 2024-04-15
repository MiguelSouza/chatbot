import NodeCache from 'node-cache'
import { WhatsAppBrokerService } from './broker/whatsapp-broker'
import { MessageChannelController } from './controllers'
import { CustomerService } from './services/customer-service'
import { MessageChannel } from './usecases'
require('dotenv').config()
import express from 'express';
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')

const server = require('http').createServer(app)

app.use(bodyParser.json({ limit: '50mb', type: 'application/json' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))


app.use(cors())

const port = 3010

const customerService = new CustomerService()
const whatsAppBrokerService = new WhatsAppBrokerService()
const messageChannel = new MessageChannel(
  whatsAppBrokerService,
  customerService,
)

const messageChannelController = new MessageChannelController(messageChannel)
app.use(express.json())

const conversations = new NodeCache()

app.post('/api/receive-message', async (req: express.Request, res: express.Response) => {
  messageChannelController.waitingMessage(req, res, conversations)
})

app.get('/api/test', async (req: express.Request, res: express.Response) => {
  res.send('Server no ar')
})

server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`)
})
