import axios from 'axios'
import https from 'https'

const github = axios.create({
  baseURL: 'https://api.github.com',
  httpsAgent: new https.Agent({ keepAlive: true }),
})

export default github
