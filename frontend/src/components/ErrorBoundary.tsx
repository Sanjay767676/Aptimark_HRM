import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    console.log("ErrorBoundary getDerivedStateFromError caught error:", error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  public render() {
    console.log("ErrorBoundary rendering. hasError:", this.state.hasError);
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", fontFamily: "monospace", color: "#721c24", backgroundColor: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: "4px", margin: "20px" }}>
          <h1 style={{ fontSize: "24px", margin: "0 0 10px 0" }}>Something went wrong (ErrorBoundary)</h1>
          <p style={{ margin: "0 0 20px 0" }}>An unexpected error occurred during rendering:</p>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", background: "#fff", padding: "15px", border: "1px solid #ddd", borderRadius: "4px" }}>
            {this.state.error?.toString()}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", cursor: "pointer", marginRight: "10px" }}>
            Reload Page
          </button>
          <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.href = "/login"; }} style={{ padding: "8px 16px", cursor: "pointer" }}>
            Clear Cache & Go to Login
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
