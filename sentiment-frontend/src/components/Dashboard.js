import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';
import '../App.css';
import NavBar from '../components/NavBar';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const API_URL = process.env.REACT_APP_API_URL;

function Dashboard({ token, username, onLogout }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          onLogout();
        } else {
          fetchHistory();
        }
      } catch (err) {
        console.error('Invalid token:', err);
        onLogout();
      }
    }
  }, [token]);

  const fetchHistory = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/history`, config);
      setHistory(res.data);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Could not fetch history');
    }
  };

  const analyzeText = async () => {
    setError('');
    setResult(null);
    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length > 500) {
      setError('Please enter valid text (max 500 characters)');
      return;
    }
    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.post(`${API_URL}/analyze`, { text: trimmedText }, config);
        setResult(res.data);
        setText('');
        fetchHistory();
      } catch (err) {
        console.error('Error analyzing text:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Server error occurred during analysis.');
      }
      
  };

  const getFilteredHistory = () => {
    if (!selectedStartDate || !selectedEndDate) return history;
    const start = dayjs(selectedStartDate).startOf('day');
    const end = dayjs(selectedEndDate).endOf('day');
    return history.filter((entry) => {
      const entryDate = dayjs(entry.created_at);
      return entryDate.isAfter(start.subtract(1, 'millisecond')) && entryDate.isBefore(end.add(1, 'millisecond'));
    });
  };

  const barChartData = useMemo(() => {
    const grouped = {};
    getFilteredHistory().forEach((entry) => {
      const date = dayjs(entry.created_at).format('YYYY-MM-DD');
      if (!grouped[date]) {
        grouped[date] = { Positive: 0, Negative: 0, Neutral: 0 };
      }
      grouped[date][entry.sentiment]++;
    });

    const labels = Object.keys(grouped).sort();
    return {
      labels,
      datasets: [
        { label: 'Positive', data: labels.map(d => grouped[d].Positive), backgroundColor: 'rgba(0, 128, 0, 0.7)' },
        { label: 'Negative', data: labels.map(d => grouped[d].Negative), backgroundColor: 'rgba(255, 0, 0, 0.7)' },
        { label: 'Neutral', data: labels.map(d => grouped[d].Neutral), backgroundColor: 'rgba(128, 128, 128, 0.7)' }
      ]
    };
  }, [history, selectedStartDate, selectedEndDate]);

  const pieChartData = useMemo(() => {
    let positive = 0, negative = 0, neutral = 0;
    history.forEach(({ sentiment }) => {
      if (sentiment === 'Positive') positive++;
      else if (sentiment === 'Negative') negative++;
      else if (sentiment === 'Neutral') neutral++;
    });
    return {
      labels: ['Positive', 'Negative', 'Neutral'],
      datasets: [{
        data: [positive, negative, neutral],
        backgroundColor: ['#4caf50', '#f44336', '#9e9e9e']
      }]
    };
  }, [history]);

  return (
    <div className="dashboard-container">
      <NavBar showLogout={true} onLogout={onLogout} />

      <section className="masthead">
        <div className="masthead-content">
          <h2>Dashboard</h2>
          <p>Welcome {username ? `, ${username}` : ''}! This is your Sentiment Analysis Portal</p>
        </div>
      </section>

      <div className="grid-container">
        <div className="left-column">
          <div className="card">
            <h3 className="card-title">Analyze New Text</h3>
            <textarea
              className="text-input"
              placeholder="Enter text to analyze..."
              rows="4"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="card-button" onClick={analyzeText}>Analyze</button>
            {error && <div className="alert error-alert">{error}</div>}
            {result && (
              <div className="result-box">
                <p><strong>Sentiment:</strong> {result.sentiment}</p>
                <p><strong>Confidence:</strong> {result.confidence}</p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">History</h3>
            {history.length === 0 ? (
              <p>No past analyses yet.</p>
            ) : (
              <div className="history-scroll">
                {history.map((item, i) => (
                  <div key={i} className="history-item">
                    <p><strong>Text:</strong> {item.text}</p>
                    <p><strong>Sentiment:</strong> {item.sentiment} | <strong>Confidence:</strong> {item.confidence}</p>
                    <p className="timestamp">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="right-column">
          <div className="card">
            <h3 className="card-title">Daily Sentiment Trends</h3>
            <h3>Filter by Date Range</h3>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className="date-picker-container">
                <DatePicker
                label="Start Date"
                value={selectedStartDate}
                onChange={(val) => setSelectedStartDate(val)}
                slotProps={{
                    textField: {
                    variant: 'outlined',
                    className: 'text-input',
                    },
                }}
                />

                <DatePicker
                  label="End Date"
                  value={selectedEndDate}
                  onChange={(val) => setSelectedEndDate(val)}
                  minDate={selectedStartDate}
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      className: 'text-input',
                    },
                  }}
                />

              </div>
              {(selectedStartDate || selectedEndDate) && (
                <button className="clear-button" onClick={() => { setSelectedStartDate(null); setSelectedEndDate(null); }}>
                  Clear Range
                </button>
              )}
            </LocalizationProvider>
            {barChartData.labels.length > 0 ? (
              <Bar data={barChartData} options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: 'Daily Sentiment Trends' }
                },
                scales: { x: { stacked: true }, y: { stacked: true } }
              }} />
            ) : (
              <p>No data available for chart</p>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Overall Sentiment Distribution</h3>
            {pieChartData.labels.length > 0 ? (
              <div className="pie-chart-container">
                <Pie data={pieChartData} options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Sentiment Split' }
                  }
                }} />
              </div>
            ) : (
              <p>No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
