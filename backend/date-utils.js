const TZ = 'America/Merida';

function fmt(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function today() {
  return fmt(new Date());
}

function nowMinutes() {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  const [h, m] = f.format(new Date()).split(':').map(Number);
  return h * 60 + m;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T06:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

function rangeArray(startStr, endStr) {
  const result = [];
  let current = startStr;
  while (current <= endStr) {
    result.push(current);
    current = addDays(current, 1);
  }
  return result;
}

module.exports = { today, nowMinutes, addDays, rangeArray, fmt };
