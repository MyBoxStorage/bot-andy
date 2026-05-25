module.exports = {
  apps: [{
    name:         'andy-na-regua',
    script:       'demo.mjs',
    interpreter:  'node',
    watch:        false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
    },
    log_date_format: 'DD/MM/YYYY HH:mm:ss',
    error_file:   'logs/error.log',
    out_file:     'logs/out.log',
    merge_logs:   true,
  }],
}
