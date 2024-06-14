const { Client } = require('pg');
const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const app = express();
const cors = require('cors');
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
  }
});

require('dotenv').config();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: "*",
  methods: 'GET, POST, PUT, DELETE',
  credentials: true,
  allowedHeaders: 'Content-Type,Authorization',
  exposedHeaders: 'Content-Range,X-Content-Range'
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies (form-data)
app.use(express.urlencoded({ extended: true }));

const dbClient = new Client({
  connectionString: `postgres://postgres.ymxaumghnhxmtjhgoopm:${process.env.PG_PSSWD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
});

dbClient.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Connection error', err.stack));

io.on('connection', (socket) => {
  console.log('New client connected');
  sendExistingData(socket);
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

app.post('/data', async (req, res) => {
  const { field1: card_id, field2: balance, field3: transportfare } = req.body;
  console.log(req.body);
  try {
    await dbClient.query('INSERT INTO transaction (card_id, balance, transportfare) VALUES ($1, $2, $3)', [card_id, balance, transportfare]);

    const newData = { card_id, balance, transportfare };
    io.emit('newData', newData);

    res.status(200).json({ message: 'Data received' });
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: error.message });
  }
});

const sendExistingData = async (socket) => {
  try {
    const res = await dbClient.query('SELECT * FROM transaction');
    socket.emit('existingData', res.rows);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
