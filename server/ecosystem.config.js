module.exports = {
  apps: [
    {
      name: 'milo-backend',
      script: 'server.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
