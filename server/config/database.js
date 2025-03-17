const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'incenta_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Successfully connected to PostgreSQL database');
    release();
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
}; 