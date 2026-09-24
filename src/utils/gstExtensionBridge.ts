// Bridge between the Web Application and the GST Auto-Login Chrome Extension

let isExtensionAvailable = false;
let extensionVersion = '';

export function initExtensionListener(onStatusChange?: (available: boolean, version: string) => void) {
  if (typeof window === 'undefined') return;

  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'GST_EXTENSION_AVAILABLE') {
      isExtensionAvailable = true;
      extensionVersion = event.data.version || '1.2.0';
      if (onStatusChange) {
        onStatusChange(true, extensionVersion);
      }
    }
  };

  window.addEventListener('message', handleMessage);

  // Ping if extension is already injected
  if ((window as any).__GST_AUTO_LOGIN_EXTENSION_ACTIVE__) {
    isExtensionAvailable = true;
    if (onStatusChange) {
      onStatusChange(true, '1.2.0');
    }
  }

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}

export function checkExtensionActive(): boolean {
  if (typeof window === 'undefined') return false;
  return isExtensionAvailable || !!(window as any).__GST_AUTO_LOGIN_EXTENSION_ACTIVE__;
}

export function triggerExtensionLogin(gstin: string, username?: string, password?: string): boolean {
  if (typeof window === 'undefined') return false;

  console.log('[GST Bridge] Triggering Extension Auto-Login for GSTIN:', gstin);

  window.postMessage(
    {
      type: 'TRIGGER_GST_AUTO_LOGIN',
      payload: {
        gstin,
        username: username || '',
        password: password || '',
        autoSubmit: true,
      },
    },
    '*'
  );

  return true;
}
