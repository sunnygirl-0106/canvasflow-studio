import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div
            className="flex flex-col items-center justify-center gap-2 text-sm"
            style={{ padding: 24, color: "#94A3B8" }}
          >
            <span style={{ color: "#F04438", fontWeight: 600 }}>渲染出错</span>
            <code style={{ fontSize: 11, color: "#64748B" }}>
              {this.state.error.message}
            </code>
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                marginTop: 8,
                padding: "4px 12px",
                background: "#1E293B",
                border: "1px solid #334155",
                borderRadius: 6,
                color: "#E2E8F0",
                cursor: "pointer",
              }}
            >
              重试
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
