import type { GithubDto } from '@/Interfaces/github/github.dto'

/** Registry record as returned by the verifier contract (unchanged shape). */
export interface ContractData {
  cid: string
  code_hash: string
  block_height: number | string
  lang?: string
  github?: GithubDto | null
}

export type ContractEntry = [string, ContractData]

export const isContractData = (value: unknown): value is ContractData =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as ContractData).cid === 'string' &&
  typeof (value as ContractData).code_hash === 'string'

export const isContractEntry = (value: unknown): value is ContractEntry =>
  Array.isArray(value) && typeof value[0] === 'string' && isContractData(value[1])

export const langLabel = (lang?: string) =>
  lang === 'rust' ? 'Rust' : lang === 'ts' ? 'TypeScript' : lang || 'Unknown'
