module.exports = {
  apps: [
    {
      name: 'scmtv-dev',
      script: 'npm',
      args: 'run dev:public',
      cwd: '/home/bmkg/gui/qcmt-garuda-dev',
      autorestart: true,
      watch: false,
      max_restarts: 20,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'scmtv-prod',
      script: 'npm',
      args: 'run preview:public',
      cwd: '/home/bmkg/gui/qcmt-garuda-dev',
      autorestart: true,
      watch: false,
      max_restarts: 20,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
