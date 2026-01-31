const { app, DB_PATH } = require('./app');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Using database at ${DB_PATH}`);
});
