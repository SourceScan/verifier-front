import axios from 'axios'
import https from 'https'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_HOST,
  httpsAgent: new https.Agent({ keepAlive: true }),
})

export default api
