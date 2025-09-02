// OAuth utilities for PKCE flow (frontend-only secure OAuth)
import { toast } from '@/hooks/use-toast';

// PKCE (Proof Key for Code Exchange) utilities
export class PKCEUtils {
  // Generate random code verifier
  static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Generate code challenge from verifier
  static async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Generate random state parameter
  static generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

// OAuth configuration interfaces
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  authUrl: string;
  tokenUrl: string;
}

export interface GoogleOAuthConfig extends OAuthConfig {
  clientSecret?: string;
}

export interface MicrosoftOAuthConfig extends OAuthConfig {
  clientSecret?: string;
  tenant: string;
}

// OAuth result interfaces
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  user_email?: string;
}

export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

// OAuth flow manager
export class OAuthManager {
  private static readonly STORAGE_PREFIX = 'oauth_';

  // Google OAuth configuration
  static getGoogleConfig(clientId: string, clientSecret?: string): GoogleOAuthConfig {
    return {
      clientId,
      clientSecret,
      redirectUri: `${window.location.origin}/oauth/callback`,
      scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token'
    };
  }

  // Microsoft OAuth configuration
  static getMicrosoftConfig(clientId: string, tenant: string = 'common', clientSecret?: string): MicrosoftOAuthConfig {
    return {
      clientId,
      clientSecret,
      tenant,
      redirectUri: `${window.location.origin}/oauth/callback`,
      scope: 'openid email Calendars.ReadWrite',
      authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`
    };
  }

  // Start OAuth flow (redirect to provider)
  static async startOAuth(provider: 'google' | 'microsoft', config: OAuthConfig): Promise<void> {
    try {
      const codeVerifier = PKCEUtils.generateCodeVerifier();
      const codeChallenge = await PKCEUtils.generateCodeChallenge(codeVerifier);
      const state = PKCEUtils.generateState();

      // Store PKCE parameters for later verification
      sessionStorage.setItem(`${this.STORAGE_PREFIX}${provider}_verifier`, codeVerifier);
      sessionStorage.setItem(`${this.STORAGE_PREFIX}${provider}_state`, state);

      // Build authorization URL
      const authParams = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scope,
        response_type: 'code',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'consent'
      });

      const authUrl = `${config.authUrl}?${authParams.toString()}`;
      
      // Redirect to provider
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to start OAuth flow:', error);
      toast({
        title: "OAuth Error",
        description: "Failed to start authentication. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Handle OAuth callback (extract tokens from URL)
  static async handleCallback(provider: 'google' | 'microsoft', config: OAuthConfig): Promise<OAuthTokens | OAuthError> {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // Check for OAuth errors
      if (error) {
        return {
          error: error,
          error_description: urlParams.get('error_description') || undefined,
          error_uri: urlParams.get('error_uri') || undefined,
        };
      }

      if (!code || !state) {
        return { error: 'missing_code_or_state' };
      }

      // Verify state parameter
      const storedState = sessionStorage.getItem(`${this.STORAGE_PREFIX}${provider}_state`);
      if (state !== storedState) {
        return { error: 'state_mismatch' };
      }

      // Get PKCE verifier
      const codeVerifier = sessionStorage.getItem(`${this.STORAGE_PREFIX}${provider}_verifier`);
      if (!codeVerifier) {
        return { error: 'missing_verifier' };
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code, codeVerifier, config);
      
      // Clean up session storage
      sessionStorage.removeItem(`${this.STORAGE_PREFIX}${provider}_verifier`);
      sessionStorage.removeItem(`${this.STORAGE_PREFIX}${provider}_state`);

      // Get user info for email
      if (tokens.access_token) {
        const userInfo = await this.getUserInfo(provider, tokens.access_token);
        tokens.user_email = userInfo.email;
      }

      return tokens;
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { error: 'callback_failed', error_description: String(error) };
    }
  }

  // Exchange authorization code for tokens
  private static async exchangeCodeForTokens(code: string, codeVerifier: string, config: OAuthConfig): Promise<OAuthTokens> {
    const tokenParams = new URLSearchParams({
      client_id: config.clientId,
      client_secret: (config as any).clientSecret || '',
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const tokens = await response.json();
    
    // Calculate expires_at timestamp
    if (tokens.expires_in) {
      tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
    }

    return tokens;
  }

  // Refresh access token using refresh token
  static async refreshToken(provider: 'google' | 'microsoft', refreshToken: string, config: OAuthConfig): Promise<OAuthTokens> {
    const refreshParams = new URLSearchParams({
      client_id: config.clientId,
      client_secret: (config as any).clientSecret || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: refreshParams.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const tokens = await response.json();
    
    // Calculate expires_at timestamp
    if (tokens.expires_in) {
      tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
    }

    return tokens;
  }

  // Get user information from the provider
  private static async getUserInfo(provider: 'google' | 'microsoft', accessToken: string): Promise<{ email: string }> {
    let userInfoUrl: string;
    
    if (provider === 'google') {
      userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
    } else {
      userInfoUrl = 'https://graph.microsoft.com/v1.0/me';
    }

    const response = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    const userInfo = await response.json();
    
    // Different providers have different email field names
    const email = userInfo.email || userInfo.mail || userInfo.userPrincipalName;
    
    return { email };
  }

  // Check if token is expired or about to expire (within 5 minutes)
  static isTokenExpired(expiresAt?: number): boolean {
    if (!expiresAt) return false;
    return Date.now() >= (expiresAt - 300000); // 5 minutes buffer
  }
}