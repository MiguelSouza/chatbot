require('dotenv').config()

import axios from 'axios'
import NodeCache from 'node-cache'

const tokenCache = new NodeCache()

export class CustomerService {
  baseURL = process.env.URL_BASE
  userName = process.env.USER_NAME || ''
  password = process.env.PASSWORD || ''

  async getToken() {
    const authToken = tokenCache.get('authToken')
    if (!authToken) {
      return await this.fetchNewToken()
    }

    const tokenExpiration = tokenCache.get('tokenExpiration') as number
    if (!tokenExpiration || tokenExpiration < Date.now()) {
      return await this.fetchNewToken()
    }

    return authToken
  }

  async fetchNewToken() {
    const data = new URLSearchParams()

    data.append('username', this.userName)
    data.append('password', this.password)
    data.append('grant_type', 'password')

    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }

    const res: any = await axios
      .post(`${this.baseURL}V1/api/token`, data.toString(), config)
      .catch((error) => {
        console.error('Erro ao obter token:', error)
      })
    if (res && res.data && res.data.access_token) {
      const tokenExpiration = Date.now() + 24 * 60 * 60 * 1000
      tokenCache.set('authToken', res.data.access_token)
      tokenCache.set('tokenExpiration', tokenExpiration)
      return res.data.access_token
    }
    return null
  }

  async getSimpleCustomer(cpf: string): Promise<any> {
    try {
      const token = await this.getToken()
      const data = {
        usuario: cpf,
        Empresa: process.env.EMPRESA,
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }

      const res: any = await axios
        .post(`${this.baseURL}api/login/acessosimplificado`, data, config)
        .then((response) => {
          return response.data
        })
        .catch((error) => {
          console.error('Erro ao enviar dados:', error)
        })

      return res
    } catch (error) {
      throw new Error('Erro ao obter os dados do cliente')
    }
  }

  async getCustomerData(cpf: string): Promise<any> {
    try {
      const token = await this.getToken()
      const data = {
        CPF: cpf,
        Idempresa: process.env.EMPRESA,
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }

      const res: any = await axios
        .post(`${this.baseURL}api/pessoa/buscar`, data, config)
        .then((response) => {
          return response.data
        })
        .catch((error) => {
          console.error('Erro ao enviar dados:', error)
        })

      return res
    } catch (error) {
      return null
    }
  }

  async getLinkVideoIA(userId: string): Promise<any> {
    try {
      const token = await this.getToken()

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
      console.log(`${this.baseURL}api/autoatendimento/link/${userId}`)
      console.log(JSON.stringify(config))

      const res: any = await axios
        .get(`${this.baseURL}api/autoatendimento/link/${userId}`, config)
        .then((response) => {
          return response.data
        })
        .catch((error) => {
          console.error('Erro ao ler dados:', error)
        })
      console.log(res)
      return res
    } catch (error) {
      throw new Error('Erro ao obter a url do chat IA')
    }
  }

  async getLinkVideo(userId: string, phone: string): Promise<any> {
    try {
      const token = await this.getToken()
      const data = {
        IdUsuario: userId,
        DataSolicitacao: new Date(),
        Telefone: phone,
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }

      const res: any = await axios
        .post(`${this.baseURL}api/videochamada`, data, config)
        .then((response) => {
          return response.data
        })
        .catch((error) => {
          console.error('Erro ao enviar dados:', error)
        })

      return res
    } catch (error) {
      throw new Error('Erro ao obter os dados do cliente')
    }
  }
}
