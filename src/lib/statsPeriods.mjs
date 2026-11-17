const DAY = 86400000;

function calendarDate(key) {
  return new Date(`${key.length === 7 ? `${key}-01` : key}T00:00:00Z`);
}

const keyOf = date => date.toISOString().slice(0, 10);

export function statsPeriod(period, selection) {
  const start = calendarDate(selection);
  const end = new Date(start);
  if (period === 'weekly') {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    end.setTime(start.getTime() + 7 * DAY);
  } else {
    start.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1, 1);
  }
  return {
    start: keyOf(start),
    end: keyOf(end),
    last: keyOf(new Date(end.getTime() - DAY)),
  };
}

export function shiftStatsPeriod(period, selection, step) {
  const date = calendarDate(statsPeriod(period, selection).start);
  if (period === 'weekly') date.setUTCDate(date.getUTCDate() + step * 7);
  else date.setUTCMonth(date.getUTCMonth() + step);
  return keyOf(date).slice(0, period === 'monthly' ? 7 : 10);
}

export function statsRangeQuery(range) {
  return new URLSearchParams({
    startDate: `${range.start}T00:00:00+07:00`,
    endDate: `${range.end}T00:00:00+07:00`,
  }).toString();
}
