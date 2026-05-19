const express = require('express');
const app = express();

app.get('/api/v1/query', (req, res) => {
  const query = req.query.query;
  
  let value = "0";
  const now = Date.now();
  
  // Create fluctuating realistic data using Math.sin
  if (query.includes('cpu')) {
    // CPU fluctuates between 30 and 85
    value = (57.5 + 27.5 * Math.sin(now / 5000)).toFixed(1);
  }
  if (query.includes('memory')) {
    // Memory fluctuates around 1.5GB
    value = Math.floor(1500000000 + 300000000 * Math.cos(now / 10000)).toString();
  }
  if (query.includes('network')) {
    // Network fluctuates
    value = Math.floor(5000 + 2000 * Math.sin(now / 2000)).toString();
  }
  if (query === 'up') {
    value = "1";
  }

  res.json({
    status: "success",
    data: {
      resultType: "vector",
      result: [
        {
          metric: {},
          value: [now / 1000, value]
        }
      ]
    }
  });
});

app.listen(9090, () => {
  console.log('Dynamic Mock Prometheus running on port 9090');
});
