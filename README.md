# Sentiment Analysis Dashboard

A full-stack web application for analyzing the sentiment of user-submitted text using a transformer-based NLP model. The system provides authentication, historical tracking of analysis, and visualizations.

---

## Live URL
https://sentiment-analysis-app-7wvp.vercel.app/login

---

## Tech Stack

### Frontend
- React.js (with Hooks)
- Chart.js (via react-chartjs-2)
- MUI Date Picker
- JWT decoding
- Vercel for deployment

### Backend
- Node.js + Express.js
- PostgreSQL
- Bcrypt for password hashing
- JWT for authentication
- Hugging Face Inference API
- Render for deployment

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/sentiment-analysis-app.git
cd sentiment-analysis-app
```

### 2. Backend Setup (Node.js)
```bash
cd sentiment-backend
cp .env.example .env   # Update values in .env
npm install
npm start
```

### 3. Database Setup (PostgreSQL)

This application uses **PostgreSQL** to store user credentials and sentiment analysis history.

#### Schema Initialization
On server startup, the backend automatically initializes the following tables (if they don’t exist):

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

-- Sentiment Analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  text TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Connecting to PostgreSQL

The connection uses `DATABASE_URL` from your `.env` file. Example:
```
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<dbname>
```

### 4. Frontend Setup (React)
```bash
cd sentiment-frontend
npm install
npm start
```

---

## Environment Variables for backend
Create a `.env` file in the backend folder based on `.env.example` for the frontend and backend projects

---

## Features
- User registration and login with JWT authentication
- Text input with sentiment classification (Positive / Neutral / Negative)
- Uses Hugging Face model: `cardiffnlp/twitter-roberta-base-sentiment`
- Visualization with Bar and Pie charts
- Filter history by date range

---

## Model Used
- **Model**: [cardiffnlp/twitter-roberta-base-sentiment](https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment)
- **API**: Hugging Face Inference API

---

## Deployment
- **Frontend**: Vercel
- **Backend**: Render (Web Service)
- **Database**: Render PostgreSQL

---

## Author
- **Vaishnavi Madhavaram**  
  [GitHub](https://github.com/m-vaishnavi7) | [LinkedIn](https://linkedin.com/in/vaishnavi-madhavaram)


