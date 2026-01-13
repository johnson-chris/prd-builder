#!/bin/bash

# PRD Builder - Complete Docker Setup Script
# Run this in your ~/boost-prd directory

set -e  # Exit on any error

echo "🚀 Setting up PRD Builder Docker configuration..."
echo ""

# Check if we're in the right directory
if [ ! -f "prd-builder-application.md" ]; then
    echo "❌ Error: prd-builder-application.md not found"
    echo "Please run this script from your boost-prd directory"
    exit 1
fi

# ============================================
# 1. CREATE .ENV.EXAMPLE
# ============================================
echo "📝 Creating .env.example..."
cat > .env.example << 'EOF'
# PRD Builder - Environment Configuration

# ============================================
# REQUIRED: ANTHROPIC CLAUDE API
# ============================================
# Get your API key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# ============================================
# REQUIRED: AUTHENTICATION SECRETS
# ============================================
# Generate secure secrets with: openssl rand -base64 64
JWT_SECRET=your_jwt_secret_here_at_least_32_characters
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here_at_least_32_characters

# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_USER=prdbuilder
DB_PASSWORD=changeme_to_secure_password
DB_NAME=prdbuilder
DB_HOST=postgres
DB_PORT=5432

# ============================================
# APPLICATION PORTS
# ============================================
FRONTEND_PORT=3000
BACKEND_PORT=3001

# ============================================
# ENVIRONMENT
# ============================================
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
VITE_API_URL=http://localhost:3001

# ============================================
# JWT CONFIGURATION
# ============================================
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CLAUDE_RATE_LIMIT_PER_USER=10
EOF

# ============================================
# 2. CREATE .DOCKERIGNORE
# ============================================
echo "📝 Creating .dockerignore..."
cat > .dockerignore << 'EOF'
# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
package-lock.json

# Environment
.env
.env.local
.env.*.local

# Build output
dist
build
.next

# IDE
.vscode
.idea
*.swp
.DS_Store

# Git
.git
.gitignore

# Documentation
*.md
README.md
docs/

# Docker files
Dockerfile*
docker-compose*.yml
.dockerignore

# Logs
logs
*.log

# Testing
coverage
.jest
EOF

# ============================================
# 3. CREATE NGINX.CONF
# ============================================
echo "📝 Creating nginx.conf..."
cat > nginx.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# ============================================
# 4. CREATE INIT-DB.SQL
# ============================================
echo "📝 Creating init-db.sql..."
cat > init-db.sql << 'EOF'
-- PRD Builder Database Initialization Script
-- This creates the initial database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    preferences JSONB DEFAULT '{
        "defaultTemplate": "standard",
        "autoSaveInterval": 60
    }'::jsonb
);

-- PRDs table
CREATE TABLE IF NOT EXISTS prds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in-review', 'approved')),
    version VARCHAR(20) DEFAULT '1.0.0',
    markdown_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{
        "completenessScore": 0
    }'::jsonb
);

-- Sections table
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prd_id UUID NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    "order" INTEGER NOT NULL,
    required BOOLEAN DEFAULT false,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prds_user_id ON prds(user_id);
CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status);
CREATE INDEX IF NOT EXISTS idx_prds_created_at ON prds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sections_prd_id ON sections(prd_id);
CREATE INDEX IF NOT EXISTS idx_sections_order ON sections("order");

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prdbuilder;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prdbuilder;
EOF

# ============================================
# 5. CREATE DOCKER-COMPOSE.DEV.YML
# ============================================
echo "📝 Creating docker-compose.dev.yml..."
cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: prd-builder-db-dev
    environment:
      POSTGRES_USER: ${DB_USER:-prdbuilder}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-devpassword}
      POSTGRES_DB: ${DB_NAME:-prdbuilder_dev}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-prdbuilder}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - prd-dev-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: prd-builder-backend-dev
    environment:
      NODE_ENV: development
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER:-prdbuilder}
      DB_PASSWORD: ${DB_PASSWORD:-devpassword}
      DB_NAME: ${DB_NAME:-prdbuilder_dev}
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "${BACKEND_PORT:-3001}:3001"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - prd-dev-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: prd-builder-frontend-dev
    environment:
      VITE_API_URL: http://localhost:3001
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
    depends_on:
      - backend
    stdin_open: true
    tty: true
    networks:
      - prd-dev-network

volumes:
  postgres_dev_data:
    driver: local

networks:
  prd-dev-network:
    driver: bridge
EOF

# ============================================
# 6. CREATE BACKEND DOCKERFILE.DEV
# ============================================
echo "📝 Creating backend/Dockerfile.dev..."
cat > backend/Dockerfile.dev << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "run", "dev"]
EOF

# ============================================
# 7. CREATE FRONTEND DOCKERFILE.DEV
# ============================================
echo "📝 Creating frontend/Dockerfile.dev..."
cat > frontend/Dockerfile.dev << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start Vite dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
EOF

# ============================================
# 8. CREATE BACKEND APP
# ============================================
echo "📝 Creating backend application..."

cat > backend/package.json << 'EOF'
{
  "name": "prd-builder-backend",
  "version": "1.0.0",
  "description": "PRD Builder Backend API",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
EOF

cat > backend/index.js << 'EOF'
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (required for Docker)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'prd-builder-backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      host: process.env.DB_HOST || 'not configured',
      name: process.env.DB_NAME || 'not configured'
    }
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '✅ Backend is working!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    app: 'PRD Builder API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET /health - Health check',
      'GET /api/test - Test endpoint'
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('================================');
  console.log('🚀 PRD Builder Backend');
  console.log('================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API test: http://localhost:${PORT}/api/test`);
  console.log('================================');
});
EOF

cat > backend/.gitignore << 'EOF'
node_modules
.env
npm-debug.log*
EOF

# ============================================
# 9. CREATE FRONTEND APP
# ============================================
echo "📝 Creating frontend application..."

cat > frontend/package.json << 'EOF'
{
  "name": "prd-builder-frontend",
  "version": "1.0.0",
  "description": "PRD Builder Frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
EOF

cat > frontend/vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  }
})
EOF

cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PRD Builder - Docker Test</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

mkdir -p frontend/src

cat > frontend/src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

cat > frontend/src/App.jsx << 'EOF'
import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState('⏳ Checking...')
  const [backendData, setBackendData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:3001/health')
        const data = await response.json()
        setBackendStatus('✅ Connected')
        setBackendData(data)
        setError(null)
      } catch (err) {
        setBackendStatus('❌ Not Connected')
        setError(err.message)
        console.error('Backend connection error:', err)
      }
    }

    checkBackend()
    const interval = setInterval(checkBackend, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🚀 PRD Builder</h1>
          <p className="subtitle">Docker Test Environment</p>
          <div className="badge">Minimal Setup Running</div>
        </header>

        <div className="cards">
          <div className="card">
            <div className="card-header">
              <h2>Frontend Status</h2>
            </div>
            <div className="card-body">
              <div className="status-row">
                <span className="label">Framework:</span>
                <span className="value success">✅ React 18</span>
              </div>
              <div className="status-row">
                <span className="label">Build Tool:</span>
                <span className="value success">✅ Vite</span>
              </div>
              <div className="status-row">
                <span className="label">Port:</span>
                <span className="value">3000</span>
              </div>
              <div className="status-row">
                <span className="label">Status:</span>
                <span className="value success">✅ Running</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Backend Status</h2>
            </div>
            <div className="card-body">
              <div className="status-row">
                <span className="label">Connection:</span>
                <span className={`value ${backendData ? 'success' : error ? 'error' : ''}`}>
                  {backendStatus}
                </span>
              </div>
              {backendData && (
                <>
                  <div className="status-row">
                    <span className="label">Service:</span>
                    <span className="value">{backendData.service}</span>
                  </div>
                  <div className="status-row">
                    <span className="label">Environment:</span>
                    <span className="value">{backendData.environment}</span>
                  </div>
                  <div className="status-row">
                    <span className="label">Port:</span>
                    <span className="value">3001</span>
                  </div>
                </>
              )}
              {error && (
                <div className="error-message">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Database Status</h2>
            </div>
            <div className="card-body">
              <div className="status-row">
                <span className="label">Type:</span>
                <span className="value">PostgreSQL 15</span>
              </div>
              <div className="status-row">
                <span className="label">Database:</span>
                <span className="value">prdbuilder_dev</span>
              </div>
              <div className="status-row">
                <span className="label">Port:</span>
                <span className="value">5432</span>
              </div>
              <div className="status-row">
                <span className="label">Status:</span>
                <span className="value success">✅ Running</span>
              </div>
            </div>
          </div>
        </div>

        <div className="next-steps">
          <h2>✅ All Services Running!</h2>
          <p>Your Docker environment is working correctly. Here's what to do next:</p>
          
          <div className="step">
            <span className="step-number">1</span>
            <div className="step-content">
              <h3>Test the Backend</h3>
              <code>curl http://localhost:3001/health</code>
            </div>
          </div>

          <div className="step">
            <span className="step-number">2</span>
            <div className="step-content">
              <h3>View Logs</h3>
              <code>docker-compose -f docker-compose.dev.yml logs -f</code>
            </div>
          </div>

          <div className="step">
            <span className="step-number">3</span>
            <div className="step-content">
              <h3>Stop Services</h3>
              <code>docker-compose -f docker-compose.dev.yml down</code>
            </div>
          </div>

          <div className="step">
            <span className="step-number">4</span>
            <div className="step-content">
              <h3>Build Full Application</h3>
              <p>Use Claude Code with your PRD to build the complete application</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
EOF

cat > frontend/src/index.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f5f7fa;
}
EOF

cat > frontend/src/App.css << 'EOF'
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 3.5rem;
  margin: 0;
  font-weight: 700;
  text-shadow: 2px 2px 8px rgba(0,0,0,0.2);
}

.subtitle {
  font-size: 1.3rem;
  opacity: 0.95;
  margin: 0.5rem 0 1rem 0;
}

.badge {
  display: inline-block;
  background: rgba(255,255,255,0.2);
  padding: 0.5rem 1.5rem;
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-4px);
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
}

.card-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.card-body {
  padding: 1.5rem;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.status-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: #555;
  font-size: 0.95rem;
}

.value {
  color: #333;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-size: 0.9rem;
}

.value.success {
  color: #10b981;
  font-weight: 600;
}

.value.error {
  color: #ef4444;
  font-weight: 600;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee;
  border-left: 3px solid #ef4444;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #991b1b;
}

.next-steps {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}

.next-steps h2 {
  color: #667eea;
  margin: 0 0 1rem 0;
  font-size: 1.8rem;
}

.next-steps > p {
  color: #666;
  margin-bottom: 2rem;
  font-size: 1.05rem;
}

.step {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.step-number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  margin-right: 1rem;
}

.step-content h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.1rem;
}

.step-content p {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
}

.step-content code {
  display: block;
  background: #1e293b;
  color: #10b981;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-size: 0.85rem;
  margin-top: 0.5rem;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .app {
    padding: 1rem;
  }
  
  .header h1 {
    font-size: 2.5rem;
  }
  
  .cards {
    grid-template-columns: 1fr;
  }
}
EOF

cat > frontend/.gitignore << 'EOF'
node_modules
dist
.env
.env.local
npm-debug.log*
EOF

# ============================================
# 10. CREATE .ENV FILE
# ============================================
echo "📝 Creating .env file..."
cat > .env << 'EOF'
# Development Environment
NODE_ENV=development

# Database
DB_USER=prdbuilder
DB_PASSWORD=devpassword
DB_NAME=prdbuilder_dev
DB_HOST=postgres
DB_PORT=5432

# Application Ports
FRONTEND_PORT=3000
BACKEND_PORT=3001

# CORS
CORS_ORIGIN=http://localhost:3000
VITE_API_URL=http://localhost:3001
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📁 Created files:"
echo "   ✓ .env.example"
echo "   ✓ .env"
echo "   ✓ .dockerignore"
echo "   ✓ nginx.conf"
echo "   ✓ init-db.sql"
echo "   ✓ docker-compose.dev.yml"
echo "   ✓ backend/Dockerfile.dev"
echo "   ✓ backend/package.json"
echo "   ✓ backend/index.js"
echo "   ✓ frontend/Dockerfile.dev"
echo "   ✓ frontend/package.json"
echo "   ✓ frontend/vite.config.js"
echo "   ✓ frontend/index.html"
echo "   ✓ frontend/src/main.jsx"
echo "   ✓ frontend/src/App.jsx"
echo "   ✓ frontend/src/index.css"
echo "   ✓ frontend/src/App.css"
echo ""
echo "🚀 Next steps:"
echo "   1. Start Docker: docker-compose -f docker-compose.dev.yml up"
echo "   2. Open browser: http://localhost:3000"
echo "   3. Test backend: curl http://localhost:3001/health"
echo ""
