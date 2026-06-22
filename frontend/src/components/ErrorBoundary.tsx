import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-lg shadow-lg border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-8 w-8 text-red-500 shrink-0" />
                <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                An unexpected error occurred while rendering the page. Below is the error detail:
              </p>
              <div className="bg-red-50 text-red-800 p-3 rounded text-xs font-mono overflow-auto max-h-60 mb-4 border border-red-100">
                {this.state.error?.toString()}
                <br />
                {this.state.error?.stack}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()} variant="outline">
                  Reload Page
                </Button>
                <Button onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = "/login";
                }}>
                  Clear Cache & Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.state.children;
  }
}
