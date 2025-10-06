import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OAuthManager, PKCEUtils } from '@/utils/oauthUtils';
import { integrationsService } from '@/services/integrationsService';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Extract provider from state parameter using JWT-like decoding
        const state = searchParams.get('state');
        if (!state) {
          throw new Error('Missing OAuth state parameter');
        }

        const decodedState = PKCEUtils.decodeState(state);
        if (!decodedState) {
          throw new Error('Invalid OAuth state format');
        }

        const provider = decodedState.provider;

        // Load settings to get client credentials
        const settings = integrationsService.loadCalendarSettings('default');
        if (!settings) {
          throw new Error('Calendar settings not found');
        }

        // Get OAuth config
        const providerType = provider === 'google' ? 'google' : 'microsoft';
        const config = providerType === 'google' 
          ? OAuthManager.getGoogleConfig(
              settings.googleClientId!,
              settings.googleClientSecret!
            )
          : OAuthManager.getMicrosoftConfig(
              settings.microsoftClientId!,
              settings.microsoftTenant || 'common',
              settings.microsoftClientSecret!
            );

        // Handle the OAuth callback
        const result = await OAuthManager.handleCallback(providerType, config);

        // Check for error
        if ('error' in result) {
          throw new Error(result.error_description || result.error);
        }

        // Save tokens (map microsoft to outlook for storage)
        const storageProvider = provider === 'microsoft' ? 'outlook' : 'google';
        integrationsService.saveTokens('default', storageProvider, {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_at: result.expires_at,
          user_email: result.user_email,
        });

        setStatus('success');
        
        toast({
          title: "Connection Successful",
          description: `Connected to ${provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'} as ${result.user_email}`,
        });

        // Redirect back to settings after 2 seconds
        setTimeout(() => {
          navigate('/settings?tab=integrations&success=true');
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        toast({
          title: "Connection Failed",
          description: error instanceof Error ? error.message : 'Authentication failed',
          variant: "destructive",
        });

        // Redirect back to settings after 3 seconds
        setTimeout(() => {
          navigate('/settings?tab=integrations&error=true');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Connecting to Calendar...</h2>
            <p className="text-muted-foreground">Please wait while we complete the setup</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-600">Connected Successfully!</h2>
            <p className="text-muted-foreground">Redirecting you back to settings...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-600">Connection Failed</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </>
        )}
      </div>
    </div>
  );
};
