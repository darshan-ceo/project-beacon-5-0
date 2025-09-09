import { envConfig } from './envConfig';

interface NetworkCall {
  url: string;
  method: string;
  timestamp: Date;
  blocked: boolean;
  source: string;
}

class NetworkInterceptor {
  private calls: NetworkCall[] = [];
  private isDevMode: boolean;
  private originalFetch: typeof fetch;

  constructor() {
    this.isDevMode = process.env.NODE_ENV === 'development' || envConfig.QA_ON;
    this.originalFetch = window.fetch;
    this.setupInterceptor();
  }

  private setupInterceptor() {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      const call: NetworkCall = {
        url,
        method,
        timestamp: new Date(),
        blocked: false,
        source: this.getCallSource()
      };

      // Block external calls in Dev Mode
      if (this.isDevMode && this.shouldBlockCall(url)) {
        call.blocked = true;
        this.calls.push(call);
        
        console.warn(`[NetworkInterceptor] Blocked external call in Dev Mode:`, {
          url,
          method,
          source: call.source
        });
        
        // Show toast warning
        this.showBlockedCallWarning(url);
        
        // Return mock response
        return new Response(
          JSON.stringify({ 
            error: 'External calls blocked in Dev Mode',
            url,
            suggestion: 'Use MockDataProvider or check envConfig.MODE'
          }),
          { 
            status: 503,
            statusText: 'Service Unavailable (Dev Mode)',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      this.calls.push(call);
      
      // Allow the call to proceed
      try {
        const response = await this.originalFetch(input, init);
        console.log(`[NetworkInterceptor] Allowed call:`, { url, method, status: response.status });
        return response;
      } catch (error) {
        console.error(`[NetworkInterceptor] Call failed:`, { url, method, error });
        throw error;
      }
    };
  }

  private shouldBlockCall(url: string): boolean {
    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      envConfig.API?.replace(/^https?:\/\//, '').split('/')[0],
      // Allow blob URLs for file operations
      'blob:'
    ].filter(Boolean);

    // Allow relative URLs (same origin)
    if (!url.startsWith('http')) {
      return false;
    }

    // Allow blob URLs
    if (url.startsWith('blob:')) {
      return false;
    }

    // Check if URL is in allowed domains
    const domain = new URL(url).hostname;
    return !allowedDomains.some(allowed => domain.includes(allowed || ''));
  }

  private getCallSource(): string {
    const stack = new Error().stack || '';
    const lines = stack.split('\n');
    
    // Find the first line that's not from this interceptor
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('.tsx') || line.includes('.ts')) {
        const match = line.match(/at\s+([^(]+)\s+\(([^)]+)\)/);
        if (match) {
          return `${match[1]} (${match[2]})`;
        }
      }
    }
    
    return 'Unknown source';
  }

  private showBlockedCallWarning(url: string) {
    // Try to show toast if available
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({
        title: 'External Call Blocked',
        description: `Blocked ${url} in Dev Mode`,
        variant: 'destructive'
      });
    }
  }

  // Public API
  getCalls(): NetworkCall[] {
    return [...this.calls];
  }

  getBlockedCalls(): NetworkCall[] {
    return this.calls.filter(call => call.blocked);
  }

  getExternalCalls(): NetworkCall[] {
    return this.calls.filter(call => !call.blocked && call.url.startsWith('http'));
  }

  getCallStats() {
    const total = this.calls.length;
    const blocked = this.getBlockedCalls().length;
    const external = this.getExternalCalls().length;
    const internal = total - blocked - external;

    return {
      total,
      blocked,
      external,
      internal,
      isDevMode: this.isDevMode
    };
  }

  clearHistory() {
    this.calls = [];
    console.log('[NetworkInterceptor] Call history cleared');
  }

  setDevMode(enabled: boolean) {
    this.isDevMode = enabled;
    console.log(`[NetworkInterceptor] Dev Mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  restore() {
    window.fetch = this.originalFetch;
    console.log('[NetworkInterceptor] Restored original fetch');
  }
}

// Global instance
export const networkInterceptor = new NetworkInterceptor();

// Utility to check if a call should be mocked
export const shouldUseMockData = (): boolean => {
  return process.env.NODE_ENV === 'development' || envConfig.QA_ON;
};

// Register global toast function for warnings
if (typeof window !== 'undefined') {
  (window as any).networkInterceptor = networkInterceptor;
}