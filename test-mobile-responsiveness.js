/**
 * Mobile Responsiveness Testing Script
 * Starts a simple HTTP server to test mobile responsiveness improvements
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Parse URL and remove query parameters
  let filePath = req.url.split('?')[0];
  
  // Default to index.html for root
  if (filePath === '/') {
    filePath = '/index.html';
  }

  // Construct full file path
  const fullPath = path.join(PUBLIC_DIR, filePath);
  const ext = path.extname(fullPath);
  const contentType = mimeTypes[ext] || 'text/plain';

  // Check if file exists
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Not Found</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f8fafc;
            }
            .error-container {
              text-align: center;
              padding: 2rem;
            }
            h1 { color: #0f172a; margin-bottom: 1rem; }
            p { color: #64748b; }
            a { color: #2563eb; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>404 - Page Not Found</h1>
            <p>The requested file was not found: ${filePath}</p>
            <p><a href="/">Go to Home</a> | <a href="/mobile-test.html">Mobile Test Page</a></p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Read and serve the file
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>500 - Server Error</title></head>
          <body>
            <h1>500 - Internal Server Error</h1>
            <p>Error reading file: ${filePath}</p>
          </body>
          </html>
        `);
        return;
      }

      // Successful response
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Mobile Responsiveness Test Server Started!');
  console.log('='.repeat(60));
  console.log(`\n📱 Server running at: http://localhost:${PORT}`);
  console.log(`\n🧪 Test Pages Available:`);
  console.log(`   • Home Page:       http://localhost:${PORT}/`);
  console.log(`   • Mobile Test:     http://localhost:${PORT}/mobile-test.html`);
  console.log(`   • Dashboard:       http://localhost:${PORT}/dashboard.html`);
  console.log(`   • Sign In:         http://localhost:${PORT}/signin.html`);
  console.log(`   • Sign Up:         http://localhost:${PORT}/signup.html`);
  console.log(`   • Onboarding:      http://localhost:${PORT}/onboarding.html`);
  console.log(`   • Wellness:        http://localhost:${PORT}/wellness.html`);
  console.log(`   • Profile:         http://localhost:${PORT}/profile.html`);
  
  console.log(`\n📏 Test at These Widths:`);
  console.log(`   • 320px  - iPhone SE (small phones)`);
  console.log(`   • 375px  - iPhone 12/13 (standard phones)`);
  console.log(`   • 390px  - iPhone 14 Pro`);
  console.log(`   • 414px  - iPhone 14 Plus`);
  console.log(`   • 768px  - iPad (tablets)`);
  console.log(`   • 1024px - iPad Pro (large tablets)`);
  
  console.log(`\n🔧 DevTools Instructions:`);
  console.log(`   1. Press F12 to open DevTools`);
  console.log(`   2. Press Ctrl+Shift+M (or Cmd+Shift+M on Mac) for device mode`);
  console.log(`   3. Select 'Responsive' from the device dropdown`);
  console.log(`   4. Adjust width to test different breakpoints`);
  
  console.log(`\n✅ What to Check:`);
  console.log(`   • No horizontal scrolling`);
  console.log(`   • All text fits within containers`);
  console.log(`   • Font sizes are readable (min 14px)`);
  console.log(`   • Buttons have proper touch targets (44px)`);
  console.log(`   • Long words/URLs wrap properly`);
  
  console.log(`\n📚 Documentation: See MOBILE-RESPONSIVENESS.md for details`);
  console.log(`\n⏹  Press Ctrl+C to stop the server\n`);
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped successfully\n');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped successfully\n');
    process.exit(0);
  });
});

