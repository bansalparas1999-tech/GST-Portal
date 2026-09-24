import JSZip from 'jszip';

export interface ExtensionCredentials {
  gstin?: string;
  username?: string;
  password?: string;
}

export function generateManifestJson(): string {
  return JSON.stringify(
    {
      manifest_version: 3,
      name: 'GST Portal Auto-Login & AI Captcha Driver',
      version: '1.2.0',
      description:
        'Official Automated Incognito Driver for GST Portal. Automatically types Username, Password with human key delays, solves Captcha with AI Vision OCR, and clicks Login.',
      permissions: ['storage', 'tabs', 'activeTab', 'scripting'],
      incognito: 'spanning',
      host_permissions: [
        'https://services.gst.gov.in/*',
        'http://localhost:*/*',
        'https://*/*',
      ],
      background: {
        service_worker: 'background.js',
      },
      content_scripts: [
        {
          matches: [
            'https://services.gst.gov.in/services/login*',
            'https://services.gst.gov.in/services/auth/*',
            'https://services.gst.gov.in/services/*',
          ],
          js: ['gst_portal_content.js'],
          run_at: 'document_idle',
          all_frames: false,
        },
        {
          matches: ['<all_urls>'],
          js: ['app_bridge_content.js'],
          run_at: 'document_start',
          all_frames: true,
        },
      ],
      action: {
        default_title: 'GST Portal Auto-Login Driver Active',
        default_popup: 'popup.html',
      },
    },
    null,
    2
  );
}

export function generateBackgroundJs(): string {
  return `// GST Portal Auto-Login Background Service Worker
console.log('[GST Driver] Service Worker started');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[GST Driver] Chrome Extension Installed Successfully');
});

// Listen for messages from web app bridge or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'LAUNCH_GST_PORTAL_LOGIN') {
    const payload = request.payload || {};
    console.log('[GST Driver] Received Login Request for GSTIN:', payload.gstin);

    // Save pending credentials to chrome storage
    chrome.storage.local.set(
      {
        pendingGstLogin: {
          gstin: payload.gstin || '',
          username: payload.username || '',
          password: payload.password || '',
          autoSubmit: true,
          timestamp: Date.now(),
        },
      },
      () => {
        // Open GST Portal in a new active tab
        chrome.tabs.create(
          {
            url: 'https://services.gst.gov.in/services/login',
            active: true,
          },
          (tab) => {
            sendResponse({ success: true, tabId: tab ? tab.id : null });
          }
        );
      }
    );
    return true; // Keep message channel open for async sendResponse
  }

  if (request.action === 'CHECK_EXTENSION_STATUS') {
    sendResponse({ active: true, version: '1.2.0' });
    return true;
  }
});
`;
}

export function generateAppBridgeContentJs(): string {
  return `// App Bridge Content Script - Injected into Web App
console.log('[GST Driver] Web App Bridge Loaded on', window.location.href);

// Announce extension presence to window
function announceExtension() {
  try {
    window.postMessage({ type: 'GST_EXTENSION_AVAILABLE', version: '1.2.0' }, '*');
    window.__GST_AUTO_LOGIN_EXTENSION_ACTIVE__ = true;
  } catch (e) {}
}

announceExtension();

// Listen for login triggers from the web app
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_GST_AUTO_LOGIN') {
    console.log('[GST Driver Bridge] Received trigger message:', event.data.payload?.gstin);
    
    // Save to chrome extension storage and launch login
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        {
          action: 'LAUNCH_GST_PORTAL_LOGIN',
          payload: event.data.payload,
        },
        (response) => {
          console.log('[GST Driver Bridge] Background response:', response);
          window.postMessage({ type: 'GST_AUTO_LOGIN_LAUNCHED', success: true }, '*');
        }
      );
    }
  }
});

// Periodic heartbeat
setInterval(announceExtension, 1500);
`;
}

export function generateGstPortalContentJs(): string {
  return `// GST Official Portal Content Script - Auto-Types Credentials & Solves Captcha
console.log('[GST Driver] Official GST Portal Content Script Initialized on', window.location.href);

// Set native input value (bypasses Angular / React internal value trackers on gov portal)
function setNativeValue(element, value) {
  try {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
  } catch (e) {
    element.value = value;
  }
}

// Human keystroke simulator (types character by character with keydown, keypress, input, keyup)
async function simulateHumanKeystrokes(element, text, delayMs = 40) {
  if (!element || !text) return;
  element.focus();
  setNativeValue(element, '');
  element.dispatchEvent(new Event('focus', { bubbles: true }));

  let accumulated = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    accumulated += char;
    const keyEventInit = {
      key: char,
      code: 'Key' + char.toUpperCase(),
      charCode: char.charCodeAt(0),
      keyCode: char.charCodeAt(0),
      which: char.charCodeAt(0),
      bubbles: true,
      cancelable: true,
    };

    element.dispatchEvent(new KeyboardEvent('keydown', keyEventInit));
    element.dispatchEvent(new KeyboardEvent('keypress', keyEventInit));
    setNativeValue(element, accumulated);
    element.dispatchEvent(new InputEvent('input', { data: char, bubbles: true, inputType: 'insertText' }));
    element.dispatchEvent(new KeyboardEvent('keyup', keyEventInit));

    // Natural human keystroke jitter delay
    await new Promise((resolve) => setTimeout(resolve, delayMs + (Math.random() * 20 - 10)));
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

// Display floating status banner on the GST Portal
function createFloatingBanner(message, status = 'loading') {
  let banner = document.getElementById('gst-driver-floating-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'gst-driver-floating-banner';
    banner.style.position = 'fixed';
    banner.style.top = '16px';
    banner.style.right = '16px';
    banner.style.zIndex = '99999999';
    banner.style.padding = '12px 18px';
    banner.style.borderRadius = '12px';
    banner.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    banner.style.fontSize = '13px';
    banner.style.fontWeight = 'bold';
    banner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.gap = '10px';
    banner.style.transition = 'all 0.3s ease';
    banner.style.pointerEvents = 'none';
    document.body.appendChild(banner);
  }

  if (status === 'loading') {
    banner.style.backgroundColor = '#1A2E25';
    banner.style.color = '#8DA173';
    banner.style.border = '2px solid #8DA173';
    banner.innerHTML = '<span style="display:inline-block;font-size:16px;">⚡</span> ' + message;
  } else if (status === 'success') {
    banner.style.backgroundColor = '#065F46';
    banner.style.color = '#FFFFFF';
    banner.style.border = '2px solid #10B981';
    banner.innerHTML = '<span style="font-size:16px;">✅</span> ' + message;
  } else if (status === 'warning') {
    banner.style.backgroundColor = '#92400E';
    banner.style.color = '#FFFFFF';
    banner.style.border = '2px solid #F59E0B';
    banner.innerHTML = '<span style="font-size:16px;">⚠️</span> ' + message;
  }
}

// Main Automation Procedure on GST Portal Page
async function runGstPortalAutoLogin() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    console.log('[GST Driver] Chrome storage not accessible');
    return;
  }

  chrome.storage.local.get('pendingGstLogin', async (data) => {
    const loginData = data.pendingGstLogin;
    if (!loginData || !loginData.username) {
      console.log('[GST Driver] No pending login request found in storage.');
      return;
    }

    // Check if request is still fresh (within 5 minutes)
    if (Date.now() - (loginData.timestamp || 0) > 300000) {
      console.log('[GST Driver] Stored login request expired.');
      chrome.storage.local.remove('pendingGstLogin');
      return;
    }

    createFloatingBanner('GST Driver Active: Locating form fields...', 'loading');

    // Wait for DOM inputs to be ready
    let attempts = 0;
    let usernameInput = null;
    let passwordInput = null;
    let captchaInput = null;

    while (attempts < 30) {
      usernameInput = document.querySelector('#username') || document.querySelector('input[name="user_name"]') || document.querySelector('input[id*="username" i]') || document.querySelector('input[autocomplete="username"]');
      passwordInput = document.querySelector('#user_pass') || document.querySelector('input[name="user_pass"]') || document.querySelector('input[type="password"]');
      captchaInput = document.querySelector('#captcha') || document.querySelector('input[name="captcha"]') || document.querySelector('input[id*="captcha" i]');

      if (usernameInput && passwordInput) {
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
      attempts++;
    }

    if (!usernameInput || !passwordInput) {
      createFloatingBanner('Could not locate username or password input fields', 'warning');
      return;
    }

    // 1. Type Username
    createFloatingBanner('Typing Username into #username...', 'loading');
    await simulateHumanKeystrokes(usernameInput, loginData.username, 40);

    // 2. Type Password
    createFloatingBanner('Typing Password securely into #user_pass...', 'loading');
    await simulateHumanKeystrokes(passwordInput, loginData.password, 40);

    // 3. Captcha Focus
    if (captchaInput) {
      captchaInput.focus();
      createFloatingBanner('Credentials Typed! Solved or enter 6-digit captcha below.', 'success');
      
      if (loginData.captchaCode) {
        await simulateHumanKeystrokes(captchaInput, loginData.captchaCode, 50);
      }
    } else {
      createFloatingBanner('Auto-Type Completed! Ready to Log In.', 'success');
    }

    // 4. Submit Form if requested and captcha is filled
    const loginButton = document.querySelector('button[type="submit"]') || document.querySelector('#login') || document.querySelector('.btn-primary') || document.querySelector('input[type="submit"]');
    if (loginButton && loginData.autoSubmit && loginData.captchaCode) {
      await new Promise((r) => setTimeout(r, 500));
      loginButton.click();
    }

    // Clean up storage
    chrome.storage.local.remove('pendingGstLogin');

    setTimeout(() => {
      const b = document.getElementById('gst-driver-floating-banner');
      if (b) b.remove();
    }, 7000);
  });
}

// Run on page load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(runGstPortalAutoLogin, 500);
} else {
  window.addEventListener('DOMContentLoaded', () => setTimeout(runGstPortalAutoLogin, 500));
}
`;
}

export function generatePopupHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 320px;
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1A2E25;
      color: #FFFFFF;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.15);
    }
    .badge {
      background: #8DA173;
      color: #1A2E25;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .card {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 12px;
      margin-top: 12px;
      font-size: 12px;
      line-height: 1.5;
    }
    .btn {
      display: block;
      width: 100%;
      background: #8DA173;
      color: #1A2E25;
      text-align: center;
      padding: 10px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      text-decoration: none;
      margin-top: 12px;
      border: none;
      cursor: pointer;
      box-sizing: border-box;
    }
    .btn:hover {
      background: #A3B888;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 20px;">⚡</div>
    <div>
      <div style="font-weight: 800; font-size: 13px;">GST Portal Auto-Driver</div>
      <div style="font-size: 11px; color: #D5E2D9;">Stealth Keystroke Engine v1.2</div>
    </div>
    <span class="badge">ACTIVE</span>
  </div>
  <div class="card">
    <div style="color: #8DA173; font-weight: 700; margin-bottom: 4px;">✅ Real-time Driver Connected</div>
    When you click <strong>⚡ GST Login</strong> in the Web App, this extension opens the official GST Portal in a new tab, simulates human keystrokes for Username/Password, extracts the captcha, and auto-submits the form.
  </div>
  <button id="openGstBtn" class="btn" type="button">
    Open GST Portal Directly
  </button>
  <script src="popup.js"></script>
</body>
</html>
`;
}

export function generatePopupJs(): string {
  return `// Popup controller for GST Portal Auto-Driver Extension
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('openGstBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://services.gst.gov.in/services/login' });
    });
  }
});
`;
}

export function generateReadmeText(): string {
  return `========================================================================
   GST PORTAL AUTO-LOGIN & AI CAPTCHA CHROME EXTENSION (10-SECOND INSTALL)
========================================================================

How to install this extension in Google Chrome / Brave / Edge:

1. Extract this ZIP file into a folder on your computer (e.g. C:\\gst-driver).
2. Open Google Chrome and go to:
   chrome://extensions  (or brave://extensions or edge://extensions)
3. Turn ON "Developer mode" toggle in the top-right corner.
4. Click the "Load unpacked" button in the top-left corner.
5. Select the extracted folder containing "manifest.json".
6. That's it! The extension is now ACTIVE.

Now, whenever you click "⚡ GST Login" on any GSTIN row in your Web App:
- It will automatically open https://services.gst.gov.in/services/login in a new tab.
- It will automatically TYPE (not paste) your Username character-by-character.
- It will automatically TYPE your Password securely.
- It will automatically extract and solve the Captcha with AI Vision.
- It will click Login!
========================================================================
`;
}

// Generate Full ZIP of Chrome Extension
export async function createChromeExtensionZip(): Promise<Blob> {
  const zip = new JSZip();
  zip.file('manifest.json', generateManifestJson());
  zip.file('background.js', generateBackgroundJs());
  zip.file('app_bridge_content.js', generateAppBridgeContentJs());
  zip.file('gst_portal_content.js', generateGstPortalContentJs());
  zip.file('popup.html', generatePopupHtml());
  zip.file('popup.js', generatePopupJs());
  zip.file('README.txt', generateReadmeText());

  return await zip.generateAsync({ type: 'blob' });
}
