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
    // Store reference to original fetch with proper binding
    const originalFetch = this.originalFetch.bind(window);
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      // Skip interception for help content files
      if (this.isHelpContentPath(url)) {
        console.log(`[NetworkInterceptor] Bypassing help content:`, url);
        return originalFetch(input, init);
      }
      
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
      
      // Allow the call to proceed with proper binding
      try {
        const response = await originalFetch(input, init);
        console.log(`[NetworkInterceptor] Allowed call:`, { url, method, status: response.status });
        return response;
      } catch (error) {
        console.error(`[NetworkInterceptor] Call failed:`, { url, method, error });
        throw error;
      }
    };
  }

  private isHelpContentPath(url: string): boolean {
    // Bypass interception for all help content paths
    const helpPaths = [
      '/help/',
      '/public/help/',
      'help.json',
      'contextual.json',
      '-tab.json',
      'tours.json',
      'glossary.json'
    ];
    
    return helpPaths.some(path => url.includes(path));
  }

  private shouldBlockCall(url: string): boolean {
    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      envConfig.API?.replace(/^https?:\/\//, '').split('/')[0],
      // Allow Supabase domain for all database/storage operations
      envConfig.SUPABASE_URL?.replace(/^https?:\/\//, '').split('/')[0],
      // Allow blob URLs for file operations
      'blob:',
      // Allow OpenAI API for notice extraction
      'api.openai.com'
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