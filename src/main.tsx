import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle MetaMask and Web3 connection errors/stubs inside the sandboxed preview iframe
if (typeof window !== 'undefined') {
  // Prevent unhandled error popups or logs from MetaMask/Web3/Ethereum
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('MetaMask') || 
      event.message.includes('ethereum') || 
      event.message.includes('provider') ||
      event.message.includes('web3')
    )) {
      console.warn('Interceded and resolved MetaMask exception in sandbox:', event.message);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && (
      (typeof reason === 'string' && (reason.includes('MetaMask') || reason.includes('ethereum') || reason.includes('web3'))) ||
      (reason.message && typeof reason.message === 'string' && (
        reason.message.includes('MetaMask') || 
        reason.message.includes('ethereum') || 
        reason.message.includes('provider') ||
        reason.message.includes('web3')
      ))
    )) {
      console.warn('Interceded and resolved MetaMask promise rejection in sandbox:', reason);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // Intercept console.error to silence injected wallet-extension errors in sandbox
  const originalConsoleError = console.error;
  console.error = function (...args) {
    const isMetaMaskError = args.some(arg => {
      if (!arg) return false;
      const str = typeof arg === 'string' ? arg : (arg.message || String(arg));
      return (
        str.includes('MetaMask') ||
        str.includes('ethereum') ||
        str.includes('web3') ||
        str.includes('RPC error') ||
        str.includes('provider')
      );
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

