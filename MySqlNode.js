const express = require('express');
const mysql = require('mysql');
const app = express();
const port = 3000;

// Create a connection to the database
const connection = mysql.createConnection({
  host: '0.0.0.0', // replace with your server host
  port: 3306, // replace with your server port
  user: 'root',
  password: 'root', // if your MySQL root user has no password, use ''
  database: 'mydb'
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to database as id ' + connection.threadId);
});

// Define an endpoint to fetch data from the database
app.get('/data', (req, res) => {
  const query = 'SELECT * FROM users'; // replace 'your_table_name' with your actual table name
  connection.query(query, (err, results, fields) => {
    if (err) {
      console.error('Error executing query: ' + err.stack);
      res.status(500).send('Error executing query');
      return;
    }
    res.json(results);
  });
});


// Define an endpoint to delete data from the database
app.delete('/data/delete/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM users WHERE id = ?'; // replace 'your_table_name' and 'id' with your actual table name and primary key column

  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error executing query: ' + err.stack);
      res.status(500).send('Error executing query');
      return;
    }

    if (results.affectedRows === 0) {
      res.status(404).send('Record not found');
      return;
    }

    res.send('Record deleted successfully');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
