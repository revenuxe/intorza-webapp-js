// Local dev server. NOT used in Lambda.
require('dotenv').config();
const app = require('./server');

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`[dev] intorza-backend on http://localhost:${port}`);
});
