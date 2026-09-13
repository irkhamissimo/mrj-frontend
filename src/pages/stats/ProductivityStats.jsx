import React, { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const TYPE_STYLES = {
  ziyadah: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  murajaah: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  revision: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const TYPE_LABELS = {
  ziyadah: 'Ziyadah',
  murajaah: 'Murajaah',
  revision: 'Revisi',
};

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatDayKey(dateStr) {
  // dateStr is YYYY-MM-DD; parse as local to avoid UTC off-by-one.
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ProductivityStats() {
  const [activeTab, setActiveTab] = useState('daily');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activitySummary, setActivitySummary] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [activityDetail, setActivityDetail] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // Fetch Daily Stats endpoint
  const fetchDailyStats = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/stats/daily-breakdown');
      if (response.ok) {
        const data = await response.json();
        // Transform minutes to hours
        const transformed = data.dailyStats.map(item => ({
          date: item.date,
          ziyadah: +(item.ziyadah / 60).toFixed(2),
          revision: +(item.revision / 60).toFixed(2),
          murajaah: +(item.murajaah / 60).toFixed(2),
        }));
        setChartData(transformed);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      setLoading(false);
    }
  };

  // Fetch Weekly Stats endpoint
  const fetchWeeklyStats = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/stats/weekly-breakdown');
      if (response.ok) {
        const data = await response.json();
        const transformed = data.weeklyStats.map(item => ({
          week: item.week,
          ziyadah: +(item.ziyadah / 60).toFixed(2),
          revision: +(item.revision / 60).toFixed(2),
          murajaah: +(item.murajaah / 60).toFixed(2),
        }));
        setChartData(transformed);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
      setLoading(false);
    }
  };

  // Fetch Monthly Stats endpoint
  const fetchMonthlyStats = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/stats/monthly-breakdown');
      if (response.ok) {
        const data = await response.json();
        const transformed = data.monthlyStats.map(item => ({
          month: item.month,
          ziyadah: +(item.ziyadah / 60).toFixed(2),
          revision: +(item.revision / 60).toFixed(2),
          murajaah: +(item.murajaah / 60).toFixed(2),
        }));
        setChartData(transformed);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      setLoading(false);
    }
  };

  const fetchActivitySummary = useCallback(async () => {
    try {
      const response = await apiCall('/stats/activity/summary?days=14');
      if (response.ok) {
        const data = await response.json();
        setActivitySummary(data.days || []);
      }
    } catch (error) {
      console.error('Error fetching activity summary:', error);
    }
  }, []);

  const fetchActivityDetail = useCallback(async (date) => {
    try {
      setActivityLoading(true);
      const response = await apiCall(`/stats/activity?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setActivityDetail(data);
      }
      setActivityLoading(false);
    } catch (error) {
      console.error('Error fetching activity detail:', error);
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyStats();
    } else if (activeTab === 'weekly') {
      fetchWeeklyStats();
    } else if (activeTab === 'monthly') {
      fetchMonthlyStats();
    } else if (activeTab === 'riwayat') {
      fetchActivitySummary();
      fetchActivityDetail(selectedDate);
    }
  }, [activeTab, selectedDate]);

  // Determine which key to use on the XAxis based on the active tab
  let xAxisKey;
  if (activeTab === 'daily') xAxisKey = 'date';
  else if (activeTab === 'weekly') xAxisKey = 'week';
  else if (activeTab === 'monthly') xAxisKey = 'month';

  const intensityDot = (totalMinutes) => {
    if (totalMinutes <= 0) return 'bg-gray-300 dark:bg-gray-600';
    if (totalMinutes < 30) return 'bg-green-300';
    if (totalMinutes < 60) return 'bg-green-500';
    return 'bg-green-700';
  };

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-900">
      <h1 className="text-2xl font-bold mb-4 text-center dark:text-white">Productivity Statistics</h1>
      {/* Tab Navigation */}
      <div className="flex justify-center mb-4 space-x-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-3 sm:px-4 py-2 rounded text-sm ${activeTab === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}
        >
          Daily
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-3 sm:px-4 py-2 rounded text-sm ${activeTab === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}
        >
          Weekly
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-3 sm:px-4 py-2 rounded text-sm ${activeTab === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`px-3 sm:px-4 py-2 rounded text-sm ${activeTab === 'riwayat' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}
        >
          Riwayat
        </button>
      </div>

      {activeTab === 'riwayat' ? (
        <div className="space-y-4">
          {/* Date selector strip */}
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <div className="flex gap-2 min-w-max">
              {activitySummary.map((day) => {
                const d = formatDayKey(day.date);
                const weekday = d.toLocaleDateString('id-ID', { weekday: 'short' });
                const dayNumber = d.getDate();
                const isSelected = day.date === selectedDate;
                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <span className="text-xs text-gray-500 dark:text-gray-400">{weekday}</span>
                    <span className="text-sm font-semibold dark:text-white">{dayNumber}</span>
                    <span className={`w-2 h-2 rounded-full ${intensityDot(day.totalMinutes)}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day header */}
          {activityLoading ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</p>
          ) : activityDetail ? (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium dark:text-white">
                  {formatDayKey(activityDetail.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {formatMinutes(activityDetail.totalMinutes)}
                </span>
              </div>

              {activityDetail.completedMemorizations.length === 0 &&
              activityDetail.sessions.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Tidak ada aktivitas pada hari ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {activityDetail.completedMemorizations.map((item, idx) => (
                    <div
                      key={`completed-${idx}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium dark:text-white truncate">{item.title}</div>
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          Selesai Dihafal
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.time}</span>
                    </div>
                  ))}

                  {activityDetail.sessions.map((session, idx) => (
                    <div
                      key={`session-${idx}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium dark:text-white truncate">{session.title}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${TYPE_STYLES[session.type] || 'bg-gray-100 text-gray-700'}`}>
                            {TYPE_LABELS[session.type] || session.subtitle}
                          </span>
                          {session.rating && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">★ {session.rating}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end whitespace-nowrap">
                        <span className="text-xs text-gray-600 dark:text-gray-300">{session.duration}m</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{session.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      ) : (
        /* Chart Section */
        loading ? (
          <p className="text-center dark:text-gray-300">Loading...</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ziyadah" stroke="#8884d8" name="Ziyadah" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="revision" stroke="#82ca9d" name="Revision" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="murajaah" stroke="#ffc658" name="Murajaah" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        )
      )}
    </div>
  );
}

export default ProductivityStats;
