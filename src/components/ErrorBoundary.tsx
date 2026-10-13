import { Component, type ReactNode } from 'react';

interface Props {
  /** What to show instead of the broken screen. */
  fallback: (error: Error, reset: () => void) => ReactNode;
  /** Changing this clears the error, so moving to another screen tries again. */
  resetKey?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  key?: string;
}

/** Shows `fallback` when a screen crashes, instead of leaving a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: unknown) {
    // Shows up in the phone's log next to the screen that broke.
    console.error('igo screen crashed', error);
  }

  render() {
    const { error } = this.state;
    return error ? this.props.fallback(error, () => this.setState({ error: null })) : this.props.children;
  }
}
