const { spawn } = require('child_process');

console.log('🚀 Starting Gemica (Backend on :5000, Frontend on :5173)...');

const backend = spawn('npm', ['run', 'dev'], {
  cwd: './backend',
  stdio: 'inherit',
  shell: true,
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: './frontend',
  stdio: 'inherit',
  shell: true,
});

backend.on('error', (err) => console.error('Backend process error:', err));
frontend.on('error', (err) => console.error('Frontend process error:', err));

const cleanup = () => {
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

