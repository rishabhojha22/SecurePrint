const express = require('express');
const multer = require('multer');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const uuid = require('uuid');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "*"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', '*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  trustProxy: false,
  skip: (req) => {
    // Skip rate limiting for local development
    return req.ip === '127.0.0.1' || req.ip === '::1';
  }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Database connection
let db;
async function initDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Create tables if they don't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY,
        original_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_size INT NOT NULL,
        encrypted_path VARCHAR(500) NOT NULL,
        encryption_iv VARCHAR(32) NOT NULL,
        access_token VARCHAR(64) UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        accessed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database connected and tables initialized');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

// Encryption utilities
const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function encryptFile(buffer) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'hex'), iv);
  
  let encrypted = cipher.update(buffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex')
  };
}

function decryptFile(encryptedData, iv) {
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, 'hex'), Buffer.from(iv, 'hex'));
  
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted;
}

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'), false);
    }
  }
});

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const documentId = uuid.v4();
    const accessToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Encrypt the file
    const { encryptedData, iv } = encryptFile(req.file.buffer);
    
    // Save encrypted file to disk
    const fileName = `${documentId}.enc`;
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, encryptedData);

    // Save metadata to database
    await db.execute(
      `INSERT INTO documents (id, original_name, file_type, file_size, encrypted_path, encryption_iv, access_token, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        filePath,
        iv,
        accessToken,
        expiresAt
      ]
    );

    res.json({
      success: true,
      documentId,
      accessToken,
      expiresAt,
      viewUrl: `${req.protocol}://${req.get('host')}/view/${accessToken}`
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.get('/api/document/:accessToken', async (req, res) => {
  try {
    const { accessToken } = req.params;

    // Get document from database
    const [rows] = await db.execute(
      'SELECT * FROM documents WHERE access_token = ? AND expires_at > NOW() AND accessed = FALSE',
      [accessToken]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or link expired' });
    }

    const document = rows[0];

    // Read encrypted file
    const encryptedData = await fs.readFile(document.encrypted_path);
    
    // Decrypt file
    const decryptedData = decryptFile(encryptedData, Buffer.from(document.encryption_iv, 'hex'));

    // Mark as accessed
    await db.execute(
      'UPDATE documents SET accessed = TRUE WHERE id = ?',
      [document.id]
    );

    // Set appropriate headers
    res.set({
      'Content-Type': document.file_type,
      'Content-Disposition': `inline; filename="${document.original_name}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff'
    });

    res.send(decryptedData);

  } catch (error) {
    console.error('Document access error:', error);
    res.status(500).json({ error: 'Failed to access document' });
  }
});

app.get('/api/status/:accessToken', async (req, res) => {
  try {
    const { accessToken } = req.params;

    const [rows] = await db.execute(
      'SELECT accessed, expires_at FROM documents WHERE access_token = ?',
      [accessToken]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = rows[0];
    const isExpired = new Date(document.expires_at) < new Date();

    res.json({
      accessed: document.accessed,
      expired: isExpired,
      expiresAt: document.expires_at
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Cleanup expired documents
async function cleanupExpiredDocuments() {
  try {
    const [rows] = await db.execute(
      'SELECT id, encrypted_path FROM documents WHERE expires_at < NOW() OR accessed = TRUE'
    );

    for (const doc of rows) {
      try {
        await fs.unlink(doc.encrypted_path);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }

    if (rows.length > 0) {
      await db.execute(
        'DELETE FROM documents WHERE expires_at < NOW() OR accessed = TRUE'
      );
      console.log(`Cleaned up ${rows.length} expired documents`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredDocuments, 60 * 60 * 1000);

// Serve static files for viewer
app.get('/view/:accessToken', (req, res) => {
  // Disable security headers for viewer to ensure compatibility
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Content-Type-Options');
  res.removeHeader('X-Frame-Options');
  res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Favicon route
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Initialize server
async function startServer() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);

module.exports = app;
