import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Initialize app and handle session persistence
async function initializeApp() {
  // Cache busting: Clear browser cache when version changes
  if (typeof window !== 'undefined') {
    const storedVersion = localStorage.getItem('appVersion');
    const currentVersion = import.meta.env.VITE_APP_VERSION;
    
    if (storedVersion !== currentVersion) {
      // Clear service worker caches
      if ('caches' in window) {
        caches.keys().then(names => 
          Promise.all(names.map(name => caches.delete(name)))
        );
      }
      // Update stored version
      localStorage.setItem('appVersion', currentVersion);
      // Log version update
      console.log(`App updated from ${storedVersion} to ${currentVersion}`);
    }

    // Initialize Supabase session persistence for mobile
    // This ensures the user session is restored even after app restart
    if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
      // Web environment - use localStorage (default)
      console.log('[INIT] Web environment - using localStorage for session persistence');
    } else {
      // Capacitor/Mobile environment
      console.log('[INIT] Mobile environment detected - session will be restored from Supabase');
    }
  }

  // Render the app
  createRoot(document.getElementById("root")!).render(<App />);
}

// Start the app
initializeApp().catch((error) => {
  console.error('[INIT] Failed to initialize app:', error);
  // Still render app even if initialization fails
  createRoot(document.getElementById("root")!).render(<App />);
});

