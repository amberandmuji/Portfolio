/**
 * Daily job-hunt summary of amberliang.works, emailed from your own Google account. Free.
 *
 * Setup (about 5 minutes):
 *  1. Go to https://script.google.com → New project. Paste this whole file into Code.gs.
 *  2. Left sidebar → Services (+) → "Google Analytics Data API" → Add (keep the identifier AnalyticsData).
 *  3. Fill in PROPERTY_ID and TO below. PROPERTY_ID is the number in GA4 → Admin → Property details
 *     (digits only, not the G-… measurement ID).
 *  4. Choose sendDailyReport in the toolbar → Run. Approve the permissions (it's your own script).
 *     You should get a test email straight away.
 *  5. Choose createDailyTrigger → Run once. From then on the email arrives every morning.
 *     (To stop it: left sidebar → Triggers → delete the trigger.)
 *
 * Event details (case study names, contact method, etc.) appear once you register these as
 * custom dimensions in GA4 → Admin → Custom definitions (event-scoped):
 *  case_study, location, method, percent, project. Until then those sections are skipped.
 */

const PROPERTY_ID = '000000000';                 // ← your GA4 property ID (digits)
const TO = 'amberliangdesign@gmail.com';          // ← where the summary goes
const SEND_HOUR = 8;                              // ← local hour to send (Chicago time)
const TIMEZONE = 'America/Chicago';
const SEND_WHEN_NO_VISITS = true;                 // set false to skip quiet days

const KEY_EVENTS = ['resume_click', 'contact_click', 'case_study_click', 'case_study_progress',
  'toc_click', 'playground_click', 'drink_served', 'drink_shared', 'old_new_toggle'];

/* ---------------- report ---------------- */

function sendDailyReport() {
  const y = 'yesterday', week = { startDate: '8daysAgo', endDate: '2daysAgo' };
  const day = { startDate: y, endDate: y };

  const overview = run_({ dateRanges: [day, week], metrics: m_('activeUsers', 'newUsers', 'sessions', 'averageSessionDuration') });
  const cur = row_(overview, 0), prev = row_(overview, 1);
  const visitors = num_(cur[0]);
  if (!visitors && !SEND_WHEN_NO_VISITS) return;

  const sources = run_({ dateRanges: [day], dimensions: d_('sessionSource', 'sessionMedium', 'sessionCampaignName'),
    metrics: m_('sessions'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 });
  const cities = run_({ dateRanges: [day], dimensions: d_('city', 'country'), metrics: m_('activeUsers'),
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 10 });
  const returning = run_({ dateRanges: [day], dimensions: d_('newVsReturning'), metrics: m_('activeUsers') });
  const pages = run_({ dateRanges: [day], dimensions: d_('pagePath'), metrics: m_('screenPageViews', 'userEngagementDuration', 'activeUsers'),
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 12 });
  const events = run_({ dateRanges: [day], dimensions: d_('eventName'), metrics: m_('eventCount'),
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: KEY_EVENTS } } } });
  const devices = run_({ dateRanges: [day], dimensions: d_('deviceCategory'), metrics: m_('activeUsers') });

  // detail breakdowns (need custom dimensions; skipped quietly if not registered yet)
  const contacts = tryRun_({ dateRanges: [day], dimensions: d_('eventName', 'customEvent:method', 'customEvent:location'), metrics: m_('eventCount'),
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['resume_click', 'contact_click'] } } } });
  const reading = tryRun_({ dateRanges: [day], dimensions: d_('customEvent:case_study', 'customEvent:percent'), metrics: m_('eventCount'),
    dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'case_study_progress' } } } });
  const tries = tryRun_({ dateRanges: [day], dimensions: d_('customEvent:project'), metrics: m_('eventCount'),
    dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'playground_click' } } } });

  const ev = {}; rows_(events).forEach((r) => (ev[r[0]] = num_(r[1])));
  const ret = {}; rows_(returning).forEach((r) => (ret[r[0]] = num_(r[1])));
  const avgPrev = num_(prev[0]) / 7;

  // ---- highlights (the lines worth reading first)
  const hi = [];
  if (ev.resume_click) hi.push(`📄 Resume opened <b>${ev.resume_click}×</b>`);
  if (ev.contact_click) hi.push(`✉️ Contact clicks: <b>${ev.contact_click}</b>`);
  if (ret.returning) hi.push(`🔁 <b>${ret.returning}</b> returning visitor${ret.returning > 1 ? 's' : ''} (someone came back)`);
  rows_(sources).forEach((r) => { if (r[2] && r[2] !== '(not set)' && r[2] !== '(direct)' && r[2] !== '(organic)' && r[2] !== '(referral)') hi.push(`🎯 Visit from campaign <b>${esc_(r[2])}</b> (${esc_(r[0])})`); });
  if (avgPrev && visitors >= Math.max(3, avgPrev * 2)) hi.push(`📈 Traffic spike: ${visitors} visitors vs ~${avgPrev.toFixed(1)}/day last week`);
  if (!hi.length) hi.push(visitors ? 'No resume or contact clicks yesterday.' : 'No visitors yesterday.');

  // ---- email
  const date = Utilities.formatDate(new Date(Date.now() - 864e5), TIMEZONE, 'EEE, MMM d');
  const html = `
  <div style="font:15px/1.5 -apple-system,Segoe UI,Inter,Arial,sans-serif;color:#1b1b1f;max-width:620px">
    <h2 style="margin:0 0 4px;font-weight:600">Portfolio daily · ${date}</h2>
    <p style="margin:0 0 16px;color:#6b6b73">amberliang.works</p>
    ${box_('Highlights', '<ul style="margin:0;padding-left:18px">' + hi.map((h) => `<li>${h}</li>`).join('') + '</ul>')}
    ${box_('Visitors', `<b style="font-size:22px">${visitors}</b> visitors · ${num_(cur[1])} new · ${num_(cur[2])} sessions · avg ${secs_(cur[3])} per session
      <br><span style="color:#6b6b73">Last 7 days: ~${avgPrev.toFixed(1)} visitors/day · Devices: ${rows_(devices).map((r) => `${r[0]} ${r[1]}`).join(', ') || '—'}</span>`)}
    ${box_('Where they came from', table_(['Source', 'Medium', 'Campaign', 'Sessions'], rows_(sources)))}
    ${box_('Where they are', table_(['City', 'Country', 'Visitors'], rows_(cities)))}
    ${box_('What they looked at', table_(['Page', 'Views', 'Avg time'], rows_(pages).map((r) => [r[0], r[1], secs_(num_(r[3]) ? num_(r[2]) / num_(r[3]) : 0)])))}
    ${box_('Actions', table_(['Event', 'Count'], KEY_EVENTS.filter((k) => ev[k]).map((k) => [k, ev[k]])))}
    ${contacts ? box_('Resume & contact details', table_(['Event', 'Method', 'Where on the page', 'Count'], rows_(contacts))) : ''}
    ${reading ? box_('How far they read', table_(['Case study', '% reached', 'Readers'], rows_(reading).sort((a, b) => a[0].localeCompare(b[0]) || num_(a[1]) - num_(b[1])))) : ''}
    ${tries ? box_('Playground projects tried', table_(['Project', 'Clicks'], rows_(tries))) : ''}
    <p style="color:#9a9aa3;font-size:12px">Sent by your Apps Script (tools/ga4-daily-email.gs). GA4 can take up to a day to finish processing, so very recent numbers may still rise.</p>
  </div>`;

  const subject = `Portfolio · ${date}: ${visitors} visitor${visitors === 1 ? '' : 's'}` +
    (ev.resume_click ? ` · ${ev.resume_click} resume` : '') + (ev.contact_click ? ` · ${ev.contact_click} contact` : '');
  MailApp.sendEmail({ to: TO, subject, htmlBody: html });
}

function createDailyTrigger() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'sendDailyReport').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendDailyReport').timeBased().everyDays(1).atHour(SEND_HOUR).inTimezone(TIMEZONE).create();
}

/* ---------------- helpers ---------------- */
function run_(req) { return AnalyticsData.Properties.runReport(req, 'properties/' + PROPERTY_ID); }
function tryRun_(req) { try { const r = run_(req); return r.rows && r.rows.length ? r : null; } catch (e) { return null; } }
function m_() { return [...arguments].map((name) => ({ name })); }
function d_() { return [...arguments].map((name) => ({ name })); }
function rows_(res) { return (res && res.rows || []).map((r) => [...(r.dimensionValues || []).map((v) => v.value), ...(r.metricValues || []).map((v) => v.value)]); }
function row_(res, i) {
  // with two date ranges GA adds a dateRange dimension; pick the row for range i
  const rows = (res.rows || []).filter((r) => !r.dimensionValues || r.dimensionValues.some((v) => v.value === 'date_range_' + i));
  return rows.length ? rows[0].metricValues.map((v) => v.value) : [0, 0, 0, 0];
}
function num_(v) { return Number(v) || 0; }
function secs_(v) { const s = Math.round(num_(v)); return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`; }
function esc_(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function box_(title, inner) { return `<div style="margin:0 0 14px;padding:14px 16px;border:1px solid #ececf0;border-radius:12px"><div style="font-weight:600;margin-bottom:6px">${title}</div>${inner}</div>`; }
function table_(head, rows) {
  if (!rows.length) return '<span style="color:#9a9aa3">—</span>';
  return '<table style="border-collapse:collapse;width:100%;font-size:14px"><tr>' +
    head.map((h) => `<th style="text-align:left;color:#6b6b73;font-weight:500;padding:4px 8px 4px 0">${h}</th>`).join('') + '</tr>' +
    rows.map((r) => '<tr>' + r.map((c) => `<td style="padding:4px 8px 4px 0;border-top:1px solid #f2f2f5">${esc_(c)}</td>`).join('') + '</tr>').join('') + '</table>';
}
