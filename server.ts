import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { spawn, ChildProcess } from 'child_process';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003;
const PYTHON_BACKEND_PORT = process.env.BACKEND_PORT ? parseInt(process.env.BACKEND_PORT, 10) : 5000;

// Body parsing with generous limit for lab reports & plate images
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Start and supervise the Python AI & Business Logic Backend
let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  console.log('[System Architecture] Spawning Python AI & Business Logic Backend on port', PYTHON_BACKEND_PORT);
  
  const env = {
    ...process.env,
    BACKEND_PORT: PYTHON_BACKEND_PORT.toString(),
    BACKEND_HOST: '127.0.0.1',
    PYTHONUNBUFFERED: '1',
    PYTHONPATH: __dirname,
  };

  pythonProcess = spawn('python3', ['backend/run.py'], {
    cwd: __dirname,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pythonProcess.stdout?.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Python Backend] ${msg}`);
  });

  pythonProcess.stderr?.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.warn(`[Python Backend Warning] ${msg}`);
  });

  pythonProcess.on('error', (err) => {
    console.error('[Python Backend Error] Failed to start:', err.message);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.warn(`[Python Backend Exited] code=${code}, signal=${signal}`);
  });
}

// Clean shutdown handler
process.on('SIGINT', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit(0);
});

// Start the Python backend immediately
startPythonBackend();

// Proxy all /api/* requests to the Python backend
const apiProxy = createProxyMiddleware({
  target: `http://127.0.0.1:${PYTHON_BACKEND_PORT}`,
  changeOrigin: true,
  on: {
    proxyReq: fixRequestBody,
    error: (err: any, req: any, res: any) => {
      console.warn('[Proxy Error] Python backend warming up or unreachable:', err?.message);
      if (res && !res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            error: 'Python backend initializing. Please retry in a few seconds.',
          })
        );
      }
    },
  },
} as any);

app.use('/api', (req, res, next) => {
  req.url = '/api' + req.url;
  apiProxy(req, res, next);
});

// Start Express server and mount Vite for modern UI display
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VitalPlate Full-Stack Active:`);
    console.log(`- Modern UI Server: http://0.0.0.0:${PORT}`);
    console.log(`- Python AI Backend: http://127.0.0.1:${PYTHON_BACKEND_PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
