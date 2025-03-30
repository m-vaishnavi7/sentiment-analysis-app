// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize tables
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        text TEXT NOT NULL,
        sentiment TEXT NOT NULL,
        confidence NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database initialized");
  } catch (err) {
    console.error("Database init error:", err);
  }
}
initDb();

// JWT Auth Middleware
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing username or password" });

  try {
    const exists = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (exists.rows.length > 0)
      return res.status(400).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashed]
    );
    res.json({ message: "User registered", user: result.rows[0] });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing username or password" });

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0)
      return res.status(400).json({ error: "Invalid credentials" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Analyze
app.post('/analyze', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  try {
    const API_TOKEN = process.env.HUGGINGFACE_API_KEY;
    const MODEL = 'cardiffnlp/twitter-roberta-base-sentiment';
    const API_URL = `https://api-inference.huggingface.co/models/${MODEL}`;

    const response = await axios.post(
      API_URL,
      { inputs: text },
      { headers: { Authorization: `Bearer ${API_TOKEN}` } }
    );

    const predictions = response.data[0]; // Array of { label, score }
    if (!Array.isArray(predictions)) throw new Error('Unexpected model response');

    const top = predictions.reduce((prev, curr) => (curr.score > prev.score ? curr : prev));
    const mapLabel = {
      'LABEL_0': 'Negative',
      'LABEL_1': 'Neutral',
      'LABEL_2': 'Positive'
    };

    console.log('Response:',JSON.stringify(response.data,null,2));
    const sentiment = mapLabel[top.label] || 'Neutral';
    const confidence = parseFloat(top.score.toFixed(3));

    await pool.query(
      `INSERT INTO analyses (user_id, text, sentiment, confidence) VALUES ($1, $2, $3, $4)`,
      [req.user.id, text, sentiment, confidence]
    );

    res.json({ sentiment, confidence });
  } catch (error) {
    console.error('Analysis error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Sentiment analysis failed' });
  }
});

// History
app.get('/history', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT text, sentiment, confidence, created_at FROM analyses WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("History fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
