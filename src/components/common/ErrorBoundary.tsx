import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FBF8F1] flex items-center justify-center p-4 font-sans text-[#10241A]">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#E4D9BE] p-6 sm:p-8 shadow-md text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-[#C89B3C] border border-[#E4D9BE] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0A2F1C]">
                Something went wrong
              </h2>
              <p className="text-xs sm:text-sm text-[#10241A]/70">
                An unexpected interface state occurred. You can reload the page or return to the main dashboard.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-[#FAF7EE] rounded-xl border border-[#E4D9BE] text-left">
                <p className="text-[11px] font-mono text-[#10241A]/70 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0F472A] hover:bg-[#0A2F1C] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#FAF7EE] hover:bg-[#F2EAD9] text-[#10241A] text-xs font-semibold border border-[#E4D9BE] transition-all flex items-center justify-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
