"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Shown instead of `children` once a descendant throws while rendering. */
  fallback: ReactNode;
  /** Optional hook for logging/observability. */
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Minimal client-side error boundary for *containing the blast radius* of a
 * single widget. Wrap a risky subtree (e.g. a third-party payment form) so a
 * render-time throw degrades to a local fallback instead of bubbling up to the
 * route-level error boundary and taking down the whole page.
 *
 * To reset it, change the React `key` of this element (or unmount it) — e.g.
 * the parent flips the state that rendered the subtree in the first place.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
