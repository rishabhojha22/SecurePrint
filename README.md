# 🔒 SecurePrint - Secure Document Printing Service

A full-stack web application that allows you to securely send documents to cyber cafés for printing without risking your files being saved, copied, or reused.

## ✨ Features

- **🛡️ AES-256 Encryption**: Military-grade encryption protects your documents
- **⏰ 24-Hour Expiry**: Links automatically expire after 24 hours
- **🔗 One-Time Access**: Documents are permanently deleted after viewing/printing
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🖨️ Direct Printing**: Documents can be printed directly without downloading
- **🚀 Real-time Security**: Automatic cleanup of expired documents

## 🏗️ Tech Stack

### Frontend
- **React.js** - Modern UI framework
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **React Dropzone** - Drag & drop file uploads
- **Axios** - HTTP client

### Backend
- **Node.js + Express** - Server framework
- **MySQL** - Database for metadata storage
- **Multer** - File upload handling
- **Node.js Crypto** - AES-256-CBC encryption
- **Helmet** - Security headers
- **Rate Limiting** - DDoS protection

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secureprint
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up the database**
   ```bash
   # Create database and tables
   mysql -u root -p < backend/database.sql
   ```

4. **Configure environment variables**
   
   Edit `backend/.env`:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=secureprint
   ENCRYPTION_KEY=your-32-character-key
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health check: http://localhost:5000/api/health

## 📖 How It Works

1. **Upload Document**: User uploads a PDF or image file through the secure web interface
2. **Encryption**: File is encrypted using AES-256-CBC and stored securely on the server
3. **Generate Link**: A unique, one-time access link is generated (valid for 24 hours)
4. **Secure Viewing**: Cyber café opens the link in a secure viewer that prevents downloads
5. **Print & Delete**: Document can be viewed and printed, then is permanently deleted

## 🔒 Security Features

### Encryption
- **AES-256-CBC** encryption for all stored files
- Unique initialization vector (IV) for each file
- Secure key management with environment variables

### Access Control
- **One-time access tokens** - Links expire immediately after use
- **24-hour timeout** - Automatic expiration if not accessed
- **Rate limiting** - Prevents abuse and DDoS attacks
- **File type validation** - Only PDFs and images allowed
- **Size limits** - Maximum 10MB file size

### Secure Viewer
- **No download option** - Documents cannot be saved locally
- **Print-only access** - Direct printing without file storage
- **Right-click disabled** - Prevents unauthorized copying
- **Keyboard shortcuts blocked** - Disables save/copy commands
- **Auto-deletion** - Files removed after 5 minutes of inactivity

### Server Security
- **CORS protection** - Restricts cross-origin requests
- **Security headers** - Helmet.js middleware
- **Input validation** - Sanitizes all user inputs
- **Automatic cleanup** - Removes expired files every hour

## 📁 Project Structure

```
secureprint/
├── backend/
│   ├── uploads/           # Encrypted file storage
│   ├── public/
│   │   └── viewer.html    # Secure document viewer
│   ├── server.js          # Main server file
│   ├── database.sql       # Database schema
│   ├── .env              # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Custom styles
│   │   └── index.js       # Entry point
│   ├── public/
│   │   └── index.html
│   ├── tailwind.config.js
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## 🔧 API Endpoints

### Upload Document
```http
POST /api/upload
Content-Type: multipart/form-data

Body: file (multipart/form-data)
```

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "accessToken": "64-char-hex",
  "expiresAt": "2024-01-01T12:00:00.000Z",
  "viewUrl": "http://localhost:5000/view/64-char-hex"
}
```

### Access Document
```http
GET /api/document/:accessToken
```
Returns the decrypted document file (one-time access only)

### Check Status
```http
GET /api/status/:accessToken
```
**Response:**
```json
{
  "accessed": false,
  "expired": false,
  "expiresAt": "2024-01-01T12:00:00.000Z"
}
```

### Health Check
```http
GET /api/health
```

## 🛠️ Development

### Environment Setup
1. Copy `backend/.env.example` to `backend/.env`
2. Update with your MySQL credentials
3. Generate a secure encryption key (32 characters)
4. Set up the database using `database.sql`

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Building for Production
```bash
# Build frontend
cd frontend && npm run build

# Start production server
cd backend && npm start
```

## 🔒 Production Deployment

### Security Considerations
1. **Use HTTPS** - Enable SSL/TLS certificates
2. **Environment Variables** - Never commit secrets to git
3. **Database Security** - Use strong passwords and limit access
4. **Firewall** - Restrict database access to application server only
5. **Regular Updates** - Keep dependencies updated
6. **Monitoring** - Set up logging and monitoring

### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include error logs and steps to reproduce

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the need for secure document sharing
- Committed to privacy and security

---

**⚠️ Important**: This application is designed for temporary, secure document sharing. Always ensure you have backups of important documents before uploading.
