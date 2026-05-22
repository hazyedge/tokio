const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

app.post('/run', (req, res) => {
  const { command } = req.body;
  exec(command, (error) => {
    if (error) return res.status(500).json({ status: 'error', message: error.message });
    res.status(200).json({ status: 'ok' });
  });
});

app.listen(8080, '0.0.0.0');
