import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './auth/msalConfig';
import { Toaster } from 'sonner';
import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root')!);

async function bootstrap() {
  await msalInstance.initialize();

  try {
    const redirectResponse = await msalInstance.handleRedirectPromise();
    if (redirectResponse?.account) {
      msalInstance.setActiveAccount(redirectResponse.account);
    } else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
      }
    }
  } catch (err) {
    console.error('MSAL redirect handling failed:', err);
  }

  root.render(
    <StrictMode>
      <BrowserRouter>
        <MsalProvider instance={msalInstance}>
          <App />
          <Toaster richColors closeButton position="top-right" />
        </MsalProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}

bootstrap();
