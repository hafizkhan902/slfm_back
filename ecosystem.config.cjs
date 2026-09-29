module.exports = {
  apps: [
    {
      name: 'shahlajuk-backend-cluster',
      script: './server.js',
      instances: 'max', // Spawns 1 instance per CPU core for maximum load balancing
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
