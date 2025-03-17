const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
require('dotenv').config();

// Import socket service
const socketService = require('./realtime/socket');

// Import database for connection test
const db = require('./config/database');

// Import routes
const authRoutes = require('./auth/routes');
const caseRoutes = require('./case/routes');
const documentRoutes = require('./document/routes');
const messagingRoutes = require('./messaging/routes');
const benefitsRoutes = require('./benefits/routes');
const faqRoutes = require('./faq/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const io = socketService.initialize(server);
socketService.setIoInstance(io);

// Make io available to routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware 
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "connect-src": ["'self'", "ws:", "wss:"], // Allow WebSocket connections
    },
  }
}));

// Logging middleware
app.use(morgan('dev'));

// File upload middleware (for document uploads)
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/messages', messagingRoutes);
app.use('/api/benefits', benefitsRoutes);
app.use('/api/faqs', faqRoutes);

app.get('/', (req, res) => {
  res.send('Incenta Employee Advocacy API');
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}`);
  
  // Test database connection
  db.pool.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
    } else {
      console.log('Successfully connected to PostgreSQL database');
      release();
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app; 