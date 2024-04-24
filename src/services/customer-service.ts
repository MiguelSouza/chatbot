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
      tokenCache.set('authToken', res.data.access_token)
      return res.data.access_token
    } else {
      return authToken
    }
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
        cpf: cpf,
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
      throw new Error('Erro ao obter os dados do cliente')
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

      const res: any = await axios
        .get(`${this.baseURL}api/autoatendimento/link/${userId}`, config)
        .then((response) => {
          return response.data
        })
        .catch((error) => {
          console.error('Erro ao ler dados:', error)
        })

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
