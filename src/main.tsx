import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

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
}

createRoot(document.getElementById("root")!).render(<App />);
