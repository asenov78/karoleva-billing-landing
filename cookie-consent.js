/**
 * Cookie consent management.
 *
 * Categories:
 *   - necessary  — always on, nothing to gate (no non-essential cookies set without consent)
 *   - analytics  — GA4 (who/when visits)
 *   - marketing  — ad-campaign pixels (Google Ads, Meta, etc.)
 *
 * Consent choice is stored in localStorage as JSON under COOKIE_CONSENT_KEY.
 * Analytics/marketing scripts must be registered via registerTracker() —
 * they only actually load once the matching category is granted, and
 * Google Consent Mode v2 state is updated via gtag('consent', 'update', ...)
 * so Google's own tags respect the same choice.
 */
(function () {
  var COOKIE_CONSENT_KEY = 'cookie_consent_v1';
  var pendingTrackers = { analytics: [], marketing: [] };

  function getConsent() {
    try {
      var raw = localStorage.getItem(COOKIE_CONSENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setConsent(analytics, marketing) {
    var consent = {
      necessary: true,
      analytics: !!analytics,
      marketing: !!marketing,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    } catch (e) {}
    applyConsent(consent);
    return consent;
  }

  function applyConsent(consent) {
    if (window.gtag) {
      gtag('consent', 'update', {
        analytics_storage: consent.analytics ? 'granted' : 'denied',
        ad_storage: consent.marketing ? 'granted' : 'denied',
        ad_user_data: consent.marketing ? 'granted' : 'denied',
        ad_personalization: consent.marketing ? 'granted' : 'denied'
      });
    }
    if (consent.analytics) {
      pendingTrackers.analytics.forEach(function (fn) { fn(); });
      pendingTrackers.analytics = [];
    }
    if (consent.marketing) {
      pendingTrackers.marketing.forEach(function (fn) { fn(); });
      pendingTrackers.marketing = [];
    }
  }

  // Register a loader fn for a given category. Runs immediately if already
  // consented, otherwise queued until the visitor grants that category.
  window.registerTracker = function (category, loaderFn) {
    var consent = getConsent();
    if (consent && consent[category]) {
      loaderFn();
    } else {
      pendingTrackers[category].push(loaderFn);
    }
  };

  function injectScript(src, attrs) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    if (attrs) {
      for (var k in attrs) s.setAttribute(k, attrs[k]);
    }
    document.head.appendChild(s);
  }
  window.cookieConsentInjectScript = injectScript;

  function isEn() {
    return document.body.classList.contains('lang-en');
  }

  function showBanner() {
    var el = document.getElementById('cookie-consent-banner');
    if (el) el.style.display = 'flex';
  }

  function hideBanner() {
    var el = document.getElementById('cookie-consent-banner');
    if (el) el.style.display = 'none';
  }

  function showSettings() {
    var el = document.getElementById('cookie-settings-modal');
    if (el) el.style.display = 'flex';
    var consent = getConsent() || { analytics: false, marketing: false };
    var a = document.getElementById('cookie-toggle-analytics');
    var m = document.getElementById('cookie-toggle-marketing');
    if (a) a.checked = !!consent.analytics;
    if (m) m.checked = !!consent.marketing;
  }

  function hideSettings() {
    var el = document.getElementById('cookie-settings-modal');
    if (el) el.style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var consent = getConsent();
    if (consent) {
      applyConsent(consent);
    } else {
      showBanner();
    }

    var acceptAllBtn = document.getElementById('cookie-accept-all');
    if (acceptAllBtn) acceptAllBtn.addEventListener('click', function () {
      setConsent(true, true);
      hideBanner();
    });

    var necessaryOnlyBtn = document.getElementById('cookie-necessary-only');
    if (necessaryOnlyBtn) necessaryOnlyBtn.addEventListener('click', function () {
      setConsent(false, false);
      hideBanner();
    });

    var openSettingsBtn = document.getElementById('cookie-open-settings');
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', function () {
      hideBanner();
      showSettings();
    });

    var footerSettingsLink = document.getElementById('cookie-footer-settings');
    if (footerSettingsLink) footerSettingsLink.addEventListener('click', function (e) {
      e.preventDefault();
      showSettings();
    });

    var saveSettingsBtn = document.getElementById('cookie-save-settings');
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', function () {
      var a = document.getElementById('cookie-toggle-analytics');
      var m = document.getElementById('cookie-toggle-marketing');
      setConsent(a && a.checked, m && m.checked);
      hideSettings();
    });

    var closeSettingsBtn = document.getElementById('cookie-close-settings');
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', hideSettings);
  });
})();
