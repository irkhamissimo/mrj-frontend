import React, { useState, useEffect } from 'react';
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

function ProductivityStats() {
  const [activeTab, setActiveTab] = useState('daily');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyStats();
    } else if (activeTab === 'weekly') {
      fetchWeeklyStats();
    } else if (activeTab === 'monthly') {
      fetchMonthlyStats();
    }
  }, [activeTab]);

  // Determine which key to use on the XAxis based on the active tab
  let xAxisKey;
  if (activeTab === 'daily') xAxisKey = 'date';
  else if (activeTab === 'weekly') xAxisKey = 'week';
  else if (activeTab === 'monthly') xAxisKey = 'month';

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Productivity Statistics</h1>
      {/* Tab Navigation */}
      <div className="flex justify-center mb-4 space-x-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded ${activeTab === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-800'}`}
        >
          Daily
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded ${activeTab === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-800'}`}
        >
          Weekly
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 rounded ${activeTab === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-800'}`}
        >
          Monthly
        </button>
      </div>

      {/* Chart Section */}
      {loading ? (
        <p className="text-center">Loading...</p>
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
      )}
    </div>
  );
}

export default ProductivityStats; 