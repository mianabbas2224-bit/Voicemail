import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle MetaMask and Web3 connection errors/stubs inside the sandboxed preview iframe
if (typeof window !== 'undefined') {
  // Prevent unhandled error popups or logs from MetaMask/Web3/Ethereum
  const isWeb3Error = (msg: string) => {
    if (!msg || typeof msg !== 'string') return false;
    const lower = msg.toLowerCase();
    return (
      lower.includes('metamask') ||
      lower.includes('ethereum') ||
      lower.includes('provider') ||
      lower.includes('web3') ||
      lower.includes('rpc error')
    );
  };

  window.addEventListener('error', (event) => {
    const msg = event.message || (event.error && event.error.message) || '';
    if (isWeb3Error(msg)) {
      console.warn('Interceded and resolved MetaMask exception in sandbox:', msg);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    let msg = '';
    if (reason) {
      if (typeof reason === 'string') {
        msg = reason;
      } else if (reason.message && typeof reason.message === 'string') {
        msg = reason.message;
      }
    }
    if (isWeb3Error(msg)) {
      console.warn('Interceded and resolved MetaMask promise rejection in sandbox:', msg);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // Fallback direct window.onerror handler
  const prevOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = String(message || (error && error.message) || '');
    if (isWeb3Error(msg)) {
      console.warn('Interceded and resolved MetaMask window.onerror in sandbox:', msg);
      return true; // prevent default firing of error
    }
    if (prevOnError) {
      return prevOnError.apply(window, [message, source, lineno, colno, error]);
    }
    return false;
  };

  // Intercept console.error to silence injected wallet-extension errors in sandbox
  const originalConsoleError = console.error;
  console.error = function (...args) {
    const isMetaMaskError = args.some(arg => {
      if (!arg) return false;
      const str = typeof arg === 'string' ? arg : (arg.message || String(arg));
      return isWeb3Error(str);
    });

    if (isMetaMaskError) {
      console.warn('Silenced MetaMask/Web3 console.error in sandbox:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

