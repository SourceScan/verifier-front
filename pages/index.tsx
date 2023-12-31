import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push(process.env.NEXT_PUBLIC_BOS_APP || 'https://near.social')
  })

  return <></>
}
