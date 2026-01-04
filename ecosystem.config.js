module.exports = {
  apps: [
    {
      name: 'plzdrawing-nest',
      script: 'dist/main.js',
      instances: 'max', // CPU 코어 수만큼 인스턴스 실행 (클러스터 모드)
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
