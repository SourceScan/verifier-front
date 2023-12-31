import Head from 'next/head'

interface PageHeadProps {
  title: string
}

export default function PageHead(props: PageHeadProps) {
  return (
    <Head>
      <title>{props.title}</title>
      <meta
        property="og:title"
        content="Near smart contract verification"
        key="title"
      />
      <meta
        name={'description'}
        content={'SourceScan - Near source code verificator'}
      />
    </Head>
  )
}
