import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  CloseButton,
  Stack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface DefaultAlertProps {
  isOpen: boolean
  status: 'success' | 'error' | 'warning' | 'info'
  title: string
  description: string
}

export default function DefaultAlert(props: DefaultAlertProps) {
  const [open, setOpen] = useState(props.isOpen)
  useEffect(() => {
    setOpen(props.isOpen)
  }, [props.isOpen])

  return open ? (
    <Alert
      status={props.status}
      variant="subtle"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      height="200px"
      width="500px"
      rounded="lg"
    >
      <Stack justify={'center'} align={'center'} spacing={2}>
        <AlertIcon boxSize="40px" mr={0} />
        <AlertTitle mt={4} mb={1} fontSize="lg">
          {props.title}
        </AlertTitle>
        <AlertDescription maxWidth="sm">{props.description}</AlertDescription>
        <CloseButton mt={4} onClick={() => setOpen((prev) => !prev)} />
      </Stack>
    </Alert>
  ) : (
    <></>
  )
}
