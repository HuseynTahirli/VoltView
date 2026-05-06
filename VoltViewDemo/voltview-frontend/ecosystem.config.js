module.exports = {
  apps: [
    {
      name: 'voltview-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      interpreter: 'node',
    },
    {
      name: 'voltview-backend',
      script: 'server.js',
      cwd: '../voltview-backend',
      interpreter: 'node',
    },
  ],
};
