const SHEET_ID = '1W6co6bFm0itwCokxas0N8YzsuCg1rvcP024riAbad_M';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
const list = document.querySelector('#events-list');

const cell = (row, index) => row.c?.[index]?.v ?? '';
const escape = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const dateParser = raw => {
  const match = String(raw).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};
const monthKey = date => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
const monthName = date => new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'Europe/Warsaw' }).format(date);
const star = filled => `<svg class="${filled ? 'is-filled' : ''}" aria-hidden="true" viewBox="0 0 24 24"><path d="m12 3.8 2.52 5.1 5.63.82-4.08 3.97.96 5.61L12 16.65 6.97 19.3l.96-5.61-4.08-3.97 5.63-.82z"/></svg>`;

function render(events) {
  const now = new Date();
  const currentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const upcoming = events.filter(event => event.date && event.date >= currentMonth).sort((a, b) => a.date - b.date);
  if (!upcoming.length) {
    list.innerHTML = '<p class="events-empty">No upcoming events are listed yet. Check back soon, or view the source schedule.</p>';
    return;
  }
  const groups = upcoming.reduce((all, event) => { const key = monthKey(event.date); (all[key] ??= []).push(event); return all; }, {});
  list.innerHTML = Object.values(groups).map(group => {
    const first = group[0].date;
    return `<section class="month-section" aria-labelledby="month-${monthKey(first)}"><div class="month-heading"><h2 id="month-${monthKey(first)}">${escape(monthName(first))}</h2></div><ol class="events-grid">${group.map((event, index) => { const promoId = `promo-${monthKey(first)}-${index}`; return `<li class="event-item"><div class="event-main"><div class="event-title-row"><h3 class="event-name">${escape(event.name)}</h3><span class="event-rating event-rating-inline" aria-label="Rated ${event.rating} out of 5">${Array.from({ length: 5 }, (_, starIndex) => star(starIndex < event.rating)).join('')}</span></div>${event.organizers ? `<p class="event-organizers">${escape(event.organizers)}</p>` : ''}${event.description ? `<p class="event-description">${escape(event.description)}</p>` : ''}</div><div class="event-side"><time class="event-date">${escape(event.dateLabel)}</time>${event.url ? `<a class="event-registration" href="${escape(event.url)}" target="_blank" rel="noreferrer">Registration</a>` : ''}${event.promocode ? `<div class="event-promo"><button class="promocode-toggle" type="button" aria-expanded="false" aria-controls="${promoId}">Promocode <span aria-hidden="true">+</span></button><span id="${promoId}" class="promocode-value" hidden>${escape(event.promocode)}</span></div>` : ''}</div></li>`; }).join('')}</ol></section>`;
  }).join('');
  list.querySelectorAll('.promocode-toggle').forEach(button => button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const value = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(!expanded));
    button.querySelector('span').textContent = expanded ? '+' : '−';
    value.hidden = expanded;
  }));
}

async function loadEvents() {
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error('Schedule unavailable');
    const raw = await response.text();
    const payload = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const events = payload.table.rows.map(row => {
      const dateLabel = cell(row, 3);
      const rating = Math.min(5, Math.max(1, Number(cell(row, 6)) || 1));
      return { name: cell(row, 0), organizers: cell(row, 1), description: cell(row, 2), dateLabel, date: dateParser(dateLabel), url: cell(row, 4), promocode: cell(row, 5), rating };
    }).filter(event => event.name && event.date);
    render(events);
  } catch (error) {
    list.innerHTML = '<p class="events-empty">Please open the source schedule to see the latest events.</p>';
  }
}

loadEvents();
window.setInterval(loadEvents, 12 * 60 * 60 * 1000);
window.addEventListener('load', () => document.body.classList.remove('is-loading'));
