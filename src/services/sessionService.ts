export interface SessionConfig {
  timeoutMinutes: number;
  rememberMe: boolean;
  warningMinutes: number;
}

class SessionService {
  private sessionConfig: SessionConfig = {
    timeoutMinutes: 30,
    rememberMe: false,
    warningMinutes: 1
  };
  
  private warningTimeout: NodeJS.Timeout | null = null;
  private sessionTimeout: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();

  initialize(config: SessionConfig): void {
    this.sessionConfig = config;
    this.resetTimers();
    this.bindActivityListeners();
  }

  private bindActivityListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, this.handleActivity.bind(this), true);
    });
  }

  private handleActivity(): void {
    this.lastActivity = Date.now();
    this.resetTimers();
  }

  private resetTimers(): void {
    // Clear existing timers
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    // Don't set timers if remember me is enabled
    if (this.sessionConfig.rememberMe) {
      return;
    }

    const warningTime = (this.sessionConfig.timeoutMinutes - this.sessionConfig.warningMinutes) * 60 * 1000;
    const sessionTime = this.sessionConfig.timeoutMinutes * 60 * 1000;

    // Set warning timer
    this.warningTimeout = setTimeout(() => {
      this.showWarning();
    }, warningTime);

    // Set logout timer
    this.sessionTimeout = setTimeout(() => {
      this.logout();
    }, sessionTime);
  }

  private showWarning(): void {
    const remaining = this.sessionConfig.warningMinutes;
    const proceed = confirm(
      `Your session will expire in ${remaining} minute(s). Click OK to continue your session.`
    );
    
    if (proceed) {
      this.resetTimers();
    }
  }

  private logout(): void {
    // Clear all timers
    if (this.warningTimeout) clearTimeout(this.warningTimeout);
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    
    // In real app, this would clear auth tokens and redirect to login
    alert('Session expired. You will be redirected to login page.');
    
    // Simulate redirect
    window.location.href = '/login';
  }

  updateConfig(config: Partial<SessionConfig>): void {
    this.sessionConfig = { ...this.sessionConfig, ...config };
    this.resetTimers();
  }

  getConfig(): SessionConfig {
    return { ...this.sessionConfig };
  }

  getRemainingTime(): number {
    const elapsed = Date.now() - this.lastActivity;
    const remaining = (this.sessionConfig.timeoutMinutes * 60 * 1000) - elapsed;
    return Math.max(0, remaining);
  }

  // DEV only - simulate 1 minute timeout for testing
  enableTestMode(): void {
    if (process.env.NODE_ENV === 'development') {
      this.updateConfig({ timeoutMinutes: 1, warningMinutes: 0.5 });
      console.log('Session timeout test mode enabled: 1 minute timeout');
    }
  }

  destroy(): void {
    if (this.warningTimeout) clearTimeout(this.warningTimeout);
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.removeEventListener(event, this.handleActivity.bind(this), true);
    });
  }
}

export const sessionService = new SessionService();