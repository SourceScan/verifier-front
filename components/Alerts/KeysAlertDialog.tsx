import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  HStack,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { FocusableElement } from '@chakra-ui/utils'
import { LegacyRef, useEffect, useRef } from 'react'
import DefaultButton from '../Inputs/DefaultButton'

export default function KeysAlertDialog(props: {
  open: boolean
  action: string
  publicKey: string
  dialogResult: (result: boolean) => void
}) {
  useEffect(() => {
    props.open && onOpen()
    !props.open && onClose()
  }, [props.open])

  const { isOpen, onOpen, onClose } = useDisclosure()

  const cancelRef = useRef<FocusableElement>(null)

  const closeDialog = (result: boolean) => {
    props.dialogResult(result)
    onClose()
  }

  return (
    <>
      <AlertDialog
        leastDestructiveRef={cancelRef}
        motionPreset="slideInBottom"
        onClose={() => closeDialog(false)}
        isOpen={isOpen}
        isCentered
      >
        <AlertDialogOverlay />
        <AlertDialogContent>
          <AlertDialogHeader>
            {props.action === 'delete' ? 'Delete Key' : 'Add Key'}
          </AlertDialogHeader>
          <AlertDialogCloseButton />
          <AlertDialogBody>
            <Stack spacing={4}>
              <Text>{`Are you sure you want to ${props.action} key`}</Text>
              <Text fontWeight={'bold'}>{`${props.publicKey}`}</Text>
            </Stack>
          </AlertDialogBody>
          <AlertDialogFooter>
            <HStack spacing={3}>
              <DefaultButton
                ref={cancelRef as LegacyRef<HTMLButtonElement>}
                onClick={() => closeDialog(false)}
              >
                No
              </DefaultButton>
              <DefaultButton
                colorScheme={props.action === 'delete' ? 'red' : 'green'}
                onClick={() => closeDialog(true)}
              >
                Yes
              </DefaultButton>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
