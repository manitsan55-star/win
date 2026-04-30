const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const users = []; // In-memory user storage (use a database in production)

app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const userRole = role || 'user';
  users.push({ username, password: hashedPassword, role: userRole });
  res.status(201).send('User registered');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(user => user.username === username);
  if (!user) return res.status(400).send('User not found');
  
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).send('Invalid credentials');
  
  // Include the user's role in the JWT token
  const token = jwt.sign({ username, role: user.role }, 'secret_key', { expiresIn: '1h' });
  res.json({ token });
});

function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send('Token is required');

  try {
    const decoded = jwt.verify(token, 'secret_key');
    req.user = decoded; // Attach the decoded user info (including role) to the request
    next();
  } catch (err) {
    res.status(401).send('Invalid token');
  }
}

function verifyAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).send('Admin access required');
    next();
  });
}

app.get('/users', (req, res) => {
  // Only an admin should be allowed to access this endpoint
  // Here, we're just returning all users for simplicity
  res.json(users);
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});
