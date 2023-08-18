const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const SocketIO = require('socket.io');
const isAuth = require('./middleware/is-auth');
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/group');
const userRoutes = require('./routes/user');
const taskListRoutes = require('./routes/tasklist');
const shoppingListRoutes = require('./routes/shoppinglist');
const taskRoutes = require('./routes/taskitems');
const shoppingItemRoutes = require('./routes/shoppingitems');
const eventRoutes = require('./routes/eventitems');

require('dotenv').config();

const { USER, PWD, HOST, PORT } = process.env;

const app = express();
app.use('/avatars', express.static(path.join(__dirname, 'public', 'avatars')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use(cors());
app.use(express.json());

const MONGO_URI = `mongodb+srv://${USER}:${PWD}@${HOST}/grouphub?retryWrites=true`;

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err);
  });

const server = app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Initialize Socket.IO
const io = SocketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
  },
});

io.on('connection', (socket) => {
  if (socket.handshake.query?.room && socket.handshake.query.room !== 'notset') {
    socket.join(socket.handshake.query.room);
  }
});

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/user', isAuth, userRoutes);
app.use('/api/group', isAuth, groupRoutes(io));
app.use('/api/tasklist', isAuth, taskListRoutes(io));
app.use('/api/shoppinglist', isAuth, shoppingListRoutes(io));
app.use('/api/task', isAuth, taskRoutes(io));
app.use('/api/shoppingitem', isAuth, shoppingItemRoutes(io));
app.use('/api/eventitem', isAuth, eventRoutes(io));
