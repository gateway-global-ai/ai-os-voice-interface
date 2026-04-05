/** Google Identity Services (`https://accounts.google.com/gsi/client`) — minimal types for Token Client. */
export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              error_description?: string;
            }) => void;
          }) => {
            requestAccessToken: (override?: { prompt?: '' | 'none' | 'consent' | 'select_account' }) => void;
          };
        };
      };
    };
  }
}
