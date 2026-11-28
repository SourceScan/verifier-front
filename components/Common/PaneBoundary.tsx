import StatePanel from '@/components/Common/StatePanel'
import { Button } from '@chakra-ui/react'
import { Component, ErrorInfo, ReactNode } from 'react'

/**
 * Contains a render error to one workspace pane, so the verdict, tabs and
 * header stay usable. Give it a `key` that changes with the pane's input to
 * start over when the reader moves on.
 */
export default class PaneBoundary extends Component<{ label: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`${this.props.label} failed to render`, error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <StatePanel
        tone="error"
        title={`Couldn’t display ${this.props.label}`}
        action={
          <Button variant="quiet" onClick={() => this.setState({ failed: false })}>
            Try again
          </Button>
        }
      >
        Something in this section failed to render. The verdict and the other sections are unaffected.
      </StatePanel>
    )
  }
}
