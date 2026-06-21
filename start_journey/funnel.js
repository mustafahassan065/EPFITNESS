/* ============================================
   EP FITNESS — FUNNEL JS
   Used by: index.html, apply.html
   ============================================ */

// ── CONFIG — replace these values ──────────
const EPF = {
  fbPixelId:   'YOUR_PIXEL_ID',
  gaId:        'G-YOUR_GA_ID',
  webhookUrl:  'https://YOUR_WEBHOOK_URL',   // Make / n8n / Zapier
  calendlyUrl: 'https://calendly.com/ep_fitness/fitness-assessment-consultation',
  emailCoach:  'epfitness24@gmail.com',
  emailEJ:     'ejukulele@gmail.com',
};

// ── TRACK PAGE VIEW ─────────────────────────
function trackPageView() {
  try { if (typeof fbq  !== 'undefined') fbq('track', 'PageView'); } catch(e) {}
  try { if (typeof gtag !== 'undefined') gtag('event', 'page_view'); } catch(e) {}
}

// ── TRACK CUSTOM EVENT ──────────────────────
function trackEvent(name, params = {}) {
  try { if (typeof gtag !== 'undefined') gtag('event', name, params); } catch(e) {}
  try { if (typeof fbq  !== 'undefined') fbq('track', 'Lead', params); } catch(e) {}
}

// ── SAVE LEAD LOCALLY ───────────────────────
function saveLeadLocally(data) {
  try {
    let leads = JSON.parse(localStorage.getItem('epf_leads') || '[]');
    leads.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem('epf_leads', JSON.stringify(leads));
  } catch(e) {}
}

// ── SEND LEAD TO WEBHOOK ────────────────────
async function sendToWebhook(data) {
  try {
    await fetch(EPF.webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
  } catch(e) {
    console.log('[EP Fitness] Webhook offline — lead saved locally only.');
  }
}

// ── SUBMIT LEAD (call this from any form) ───
async function submitLead(data, source = 'funnel') {
  const payload = {
    ...data,
    source,
    timestamp: new Date().toISOString(),
  };
  saveLeadLocally(payload);
  await sendToWebhook(payload);
  trackEvent('generate_lead', { method: source });
  return payload;
}

// ── NAV SCROLL EFFECT ───────────────────────
function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ── AUTO INIT ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  trackPageView();
  initNavScroll();
});
