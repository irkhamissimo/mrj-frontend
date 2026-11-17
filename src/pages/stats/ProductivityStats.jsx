import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api';
import { statsPeriod, shiftStatsPeriod, statsRangeQuery } from '@/lib/statsPeriods.mjs';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BookOpen, Repeat2, Clock3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

const TYPES = [
  { key: 'ziyadah', label: 'Ziyadah', color: '#10b981', icon: BookOpen, style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  { key: 'murajaah', label: 'Murajaah', color: '#3b82f6', icon: Repeat2, style: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  { key: 'revision', label: 'Revisi', color: '#f59e0b', icon: BookOpen, style: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
];
const PERIODS = {
  daily: { label: 'Harian', key: 'date', field: 'dailyStats', description: '7 hari terakhir' },
  weekly: { label: 'Mingguan' },
  monthly: { label: 'Bulanan' },
};
const panel = 'rounded-2xl border bg-card/95 shadow-sm';

function formatMinutes(value = 0) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours ? `${hours} jam${minutes ? ` ${minutes} mnt` : ''}` : `${minutes} mnt`;
}
function parseDay(value) {
  const [year, month, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function dateLabel(value, period, full = false) {
  if (period === 'weekly') {
    const [year, week] = value.split('-W');
    return full ? `Minggu ${week}, ${year}` : `Mg ${week}`;
  }
  return parseDay(value).toLocaleDateString('id-ID', period === 'monthly'
    ? { month: full ? 'long' : 'short', year: 'numeric' }
    : { day: 'numeric', month: full ? 'long' : 'short', ...(full ? { year: 'numeric' } : {}) });
}
async function readData(endpoint, signal) {
  const response = await apiCall(endpoint, { signal });
  if (!response.ok) throw new Error('Statistik belum dapat dimuat. Silakan coba lagi.');
  return response.json();
}
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
    <p className="mb-2 font-semibold">{dateLabel(label, 'daily', true)}</p>
    {payload.map(item => <div key={item.dataKey} className="flex items-center justify-between gap-5 py-0.5">
      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span>
      <span className="font-medium tabular-nums">{formatMinutes(item.value)}</span>
    </div>)}
  </div>;
}

export default function ProductivityStats() {
  const [activeTab, setActiveTab] = useState('daily');
  const [chartData, setChartData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedWeek, setSelectedWeek] = useState(todayKey);
  const [selectedMonth, setSelectedMonth] = useState(() => todayKey().slice(0, 7));
  const [activitySummary, setActivitySummary] = useState([]);
  const [activityDetail, setActivityDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const history = activeTab === 'riwayat';
  const selectablePeriod = activeTab === 'weekly' || activeTab === 'monthly';
  const selection = activeTab === 'weekly' ? selectedWeek : selectedMonth;
  const range = selectablePeriod ? statsPeriod(activeTab, selection) : null;
  const currentRange = selectablePeriod ? statsPeriod(activeTab, todayKey()) : null;
  const periodLabel = activeTab === 'weekly'
    ? `${dateLabel(range.start, 'daily', true)} – ${dateLabel(range.last, 'daily', true)}`
    : activeTab === 'monthly' ? dateLabel(selectedMonth, 'monthly', true) : PERIODS.daily.description;
  const choosePeriod = value => {
    if (!value) return;
    const candidate = statsPeriod(activeTab, value);
    if (candidate.start > currentRange.start) return;
    if (activeTab === 'weekly') setSelectedWeek(value > todayKey() ? todayKey() : value);
    else setSelectedMonth(value);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        if (activeTab === 'riwayat') {
          const [summary, detail] = await Promise.all([
            readData('/stats/activity/summary?days=14', controller.signal),
            readData(`/stats/activity?date=${selectedDate}`, controller.signal),
          ]);
          if (controller.signal.aborted) return;
          setActivitySummary(summary.days || []);
          setActivityDetail(detail);
        } else {
          const query = activeTab === 'weekly' || activeTab === 'monthly'
            ? `?${statsRangeQuery(statsPeriod(activeTab, activeTab === 'weekly' ? selectedWeek : selectedMonth))}` : '';
          const data = await readData(`/stats/daily-breakdown${query}`, controller.signal);
          if (controller.signal.aborted) return;
          setChartData(data.dailyStats || []);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [activeTab, selectedDate, selectedWeek, selectedMonth, retry]);

  const totals = Object.fromEntries(TYPES.map(({ key }) => [key, chartData.reduce((sum, row) => sum + (Number(row[key]) || 0), 0)]));
  const totalMinutes = Object.values(totals).reduce((sum, minutes) => sum + minutes, 0);
  const sessions = activityDetail?.sessions || [];
  const completed = activityDetail?.completedMemorizations || [];

  return <div className="min-w-0 space-y-5">
    <header className="flex items-start gap-3 px-1">
      <span className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CalendarDays className="h-5 w-5" /></span>
      <div><h1 className="text-2xl font-semibold tracking-tight">Statistik</h1><p className="mt-1 text-sm text-muted-foreground">Lihat waktu belajar dan perjalanan hafalanmu.</p></div>
    </header>
    <nav aria-label="Tampilan statistik" className="grid grid-cols-4 gap-1 rounded-xl border bg-muted/80 p-1">
      {[...Object.entries(PERIODS).map(([key, period]) => [key, period.label]), ['riwayat', 'Riwayat']].map(([key, label]) =>
        <button key={key} type="button" aria-pressed={activeTab === key} onClick={() => setActiveTab(key)}
          className={`min-w-0 rounded-lg px-1 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm ${activeTab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'}`}>{label}</button>)}
    </nav>
    {selectablePeriod && <section className={`${panel} space-y-3 p-4`} aria-label="Pilih periode statistik">
      <label htmlFor="stats-period" className="block text-sm font-medium">{activeTab === 'weekly' ? 'Pilih tanggal dalam minggu' : 'Pilih bulan'}</label>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Periode sebelumnya" onClick={() => choosePeriod(shiftStatsPeriod(activeTab, selection, -1))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><ChevronLeft className="h-4 w-4" /></button>
        <input id="stats-period" type={activeTab === 'weekly' ? 'date' : 'month'} value={selection}
          max={activeTab === 'weekly' ? todayKey() : todayKey().slice(0, 7)} onChange={event => choosePeriod(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <button type="button" aria-label="Periode berikutnya" disabled={range.start >= currentRange.start}
          onClick={() => choosePeriod(shiftStatsPeriod(activeTab, selection, 1))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <p className="text-xs text-muted-foreground">{periodLabel} · WIB{activeTab === 'weekly' ? ' · Senin–Minggu' : ''}</p>
    </section>}
    {error ? <div className={`${panel} p-6`} role="alert"><p className="text-sm text-destructive">{error}</p><button type="button" className="mt-3 rounded-lg border px-4 py-2 text-sm font-medium" onClick={() => setRetry(value => value + 1)}>Coba lagi</button></div>
    : loading ? <div className={`${panel} p-6`} role="status"><p className="mb-6 text-sm text-muted-foreground">Memuat statistik…</p><div className="h-12 w-40 animate-pulse rounded-lg bg-muted" /><div className="mt-8 h-48 animate-pulse rounded-xl bg-muted" /></div>
    : history ? <>
      <section className={`${panel} p-4 sm:p-5`} aria-label="Pilih tanggal aktivitas">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Aktivitas harian</h2><span className="text-xs text-muted-foreground">14 hari terakhir · WIB</span></div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {activitySummary.map(day => <button key={day.date} type="button" onClick={() => setSelectedDate(day.date)} aria-pressed={selectedDate === day.date}
            aria-label={`${dateLabel(day.date, 'daily', true)}, ${formatMinutes(day.totalMinutes)}`}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedDate === day.date ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' : 'border-transparent bg-muted/50 hover:border-border'}`}>
            <span className="text-[10px] text-muted-foreground sm:text-xs">{parseDay(day.date).toLocaleDateString('id-ID', { weekday: 'short' })}</span><span className="text-sm font-semibold tabular-nums">{parseDay(day.date).getDate()}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${day.totalMinutes >= 60 ? 'bg-emerald-600' : day.totalMinutes >= 30 ? 'bg-emerald-400' : day.totalMinutes > 0 ? 'bg-emerald-300' : 'bg-muted-foreground/25'}`} />
          </button>)}
        </div>
      </section>
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">{dateLabel(selectedDate, 'daily', true)}</h2><p className="mt-1 text-xs text-muted-foreground">{sessions.length} sesi · {completed.length} hafalan selesai</p></div><span className="rounded-lg bg-muted px-3 py-2 text-sm font-semibold tabular-nums">{formatMinutes(activityDetail?.totalMinutes)}</span></div>
        {!sessions.length && !completed.length ? <div className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada aktivitas pada tanggal ini.</div>
        : <ul className="divide-y px-4 sm:px-5">{[...completed.map(item => ({ ...item, completed: true })), ...sessions].map((item, index) => {
          const activity = TYPES.find(type => type.key === item.type);
          const Icon = item.completed ? CheckCircle2 : activity?.icon || Clock3;
          return <li key={`${item.completed ? 'completed' : 'session'}-${index}`} className="flex items-start gap-3 py-4">
            <span className={`mt-0.5 shrink-0 rounded-xl p-2.5 ${item.completed ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' : activity?.style || 'bg-muted text-muted-foreground'}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium leading-relaxed">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.completed ? 'Selesai dihafal' : activity?.label || item.subtitle}{item.rating ? ` · ★ ${item.rating}` : ''}</p></div>
            <div className="shrink-0 text-right text-xs tabular-nums">{!item.completed && <p className="font-medium">{formatMinutes(item.duration)}</p>}<p className="mt-1 text-muted-foreground">{item.time}</p></div>
          </li>;
        })}</ul>}
      </section>
    </> : <>
      <section className={`${panel} overflow-hidden`} aria-label="Ringkasan waktu belajar">
        <div className="bg-gradient-to-br from-emerald-50 to-transparent p-5 dark:from-emerald-950/50 sm:p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" />Total waktu belajar</div>
          <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{formatMinutes(totalMinutes)}</p><p className="mt-2 text-xs text-muted-foreground">{periodLabel} · sesi yang telah selesai</p>
        </div>
        <div className="grid grid-cols-3 divide-x border-t">{TYPES.map(({ key, label, color, icon: Icon, style }) =>
          <div key={key} className="min-w-0 p-3 sm:p-5"><span className={`mb-2 inline-flex rounded-lg p-2 ${style}`}><Icon className="h-4 w-4" /></span><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold tabular-nums sm:text-base">{formatMinutes(totals[key])}</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ background: color, width: `${totalMinutes ? totals[key] / totalMinutes * 100 : 0}%` }} /></div></div>)}</div>
      </section>
      <section className={`${panel} p-4 sm:p-6`} aria-label="Grafik waktu belajar">
        <h2 className="font-semibold">Waktu belajar</h2><p className="mt-1 text-xs text-muted-foreground">Durasi dalam menit · WIB</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">{TYPES.map(type => <span key={type.key} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: type.color }} />{type.label}</span>)}</div>
        {totalMinutes > 0 ? <div className="mt-5 h-64 w-full min-w-0 sm:h-72"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
            <XAxis dataKey="date" tickFormatter={value => activeTab === 'weekly' ? parseDay(value).toLocaleDateString('id-ID', { weekday: 'short' }) : dateLabel(value, 'daily')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={15} tickMargin={12} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.6 }} />
            {TYPES.map(type => <Bar key={type.key} dataKey={type.key} name={type.label} fill={type.color} stackId="time" maxBarSize={36} />)}
          </BarChart>
        </ResponsiveContainer></div>
        : <div className="py-14 text-center"><BookOpen className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" /><p className="text-sm font-medium">Belum ada sesi selesai</p><p className="mt-1 text-xs text-muted-foreground">Statistik akan muncul setelah kamu menyelesaikan sesi.</p></div>}
      </section>
    </>}
  </div>;
}
