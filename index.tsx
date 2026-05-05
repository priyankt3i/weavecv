
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import App from './App';
import '@neondatabase/neon-js/ui/css';

const enableMocks = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true';
const ClerkProviderWithEnv = ClerkProvider as React.ComponentType<
  React.PropsWithChildren<{ afterSignOutUrl?: string }>
>;

const prepare = async () => {
  if (!enableMocks) return;
  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  } catch (error) {
    console.warn('MSW failed to start. Falling back to live APIs.', error);
  }
};

prepare().then(() => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ClerkProviderWithEnv afterSignOutUrl="/">
        <App />
      </ClerkProviderWithEnv>
    </React.StrictMode>
  );
});
