// index.js
require('dotenv').config(); // Load environment variables from .env
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
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize database: create users and analyses tables if they don't exist
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
    console.error("Error initializing database:", err);
  }
}
initDb();

// Middleware for authenticating JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // user: { id, username }
    next();
  });
}

// ---------------------
// Authentication Routes
// ---------------------

// Register a new user
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing username or password" });

  try {
    // Check if the user already exists
    const existingUser = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );
    res.json({ message: "User registered", user: result.rows[0] });
  } catch (err) {
    console.error("Error in registration:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login a user
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing username or password" });

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error("Error in login:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------
// Analysis Routes (Protected)
// ---------------------

// POST /analyze - analyze sentiment using Hugging Face API and save the result
app.post('/analyze', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    // Call Hugging Face Inference API
    const MODEL = 'distilbert-base-uncased-finetuned-sst-2-english';
    const API_URL = `https://api-inference.huggingface.co/models/${MODEL}`;
    const API_TOKEN = process.env.HUGGINGFACE_API_KEY;

    const response = await axios.post(
      API_URL,
      { inputs: text },
      {
        headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : undefined,
      }
    );

    // Log complete response for debugging
    console.log('Hugging Face API response:', response.data);

    // Handle nested array response: [ [ { label, score }, ... ] ]
    let predictions = response.data;
    if (
      Array.isArray(response.data) &&
      response.data.length === 1 &&
      Array.isArray(response.data[0])
    ) {
      predictions = response.data[0];
    }

    if (!Array.isArray(predictions) || predictions.length === 0) {
      return res.status(500).json({ error: 'Invalid analysis result from model' });
    }

    // Get the first prediction
    const primaryPrediction = predictions[0];

    // Validate the prediction format
    if (!primaryPrediction || !primaryPrediction.label) {
      console.error('Unexpected prediction format:', primaryPrediction);
      return res.status(500).json({ error: 'Unexpected model response format' });
    }

    let sentimentLabel = 'Neutral';
    if (primaryPrediction.label.toUpperCase() === 'POSITIVE') {
      sentimentLabel = 'Positive';
    } else if (primaryPrediction.label.toUpperCase() === 'NEGATIVE') {
      sentimentLabel = 'Negative';
    }

    const confidence = Math.round(primaryPrediction.score * 100) / 100;

    const analysisResult = {
      text,
      sentiment: sentimentLabel,
      confidence,
    };

    // Insert analysis record into the database linked to the user
    await pool.query(
      `INSERT INTO analyses (user_id, text, sentiment, confidence)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, text, sentimentLabel, confidence]
    );

    res.json(analysisResult);
  } catch (error) {
    console.error(
      'Error in sentiment analysis:',
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: error.message });
  }
});

// GET /history - retrieve all analyses for the authenticated user
app.get('/history', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT text, sentiment, confidence, created_at 
       FROM analyses WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------
// Start the Server
// ---------------------
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
