const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const isAuth = require('./middleware/is-auth');
const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const userRoutes = require('./routes/user');
const task = require('./routes/tasks');
const SocketIO = require('socket.io');

require('dotenv').config();

const { USER, PWD, HOST } = process.env;

const app = express();
app.use('/avatars', express.static(path.join(__dirname, 'public', 'avatars')));
app.use(cors());
app.use(express.json());

const MONGO_URI = `mongodb+srv://${USER}:${PWD}@${HOST}/familyhub?retryWrites=true`;

const server = app.listen(8080, () => {
  console.log('Server is listening on port 8080');
});

const io = SocketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
  },
});

io.on('connection', (socket) => {
  console.log('joined');
  if (socket.handshake.query?.room) {
    socket.join(socket.handshake.query.room);
  }

  const familyRouter = familyRoutes(io);
  const taskRouter = task(io);
  app.use('/family', familyRouter);
  app.use('/tasks', taskRouter);

  socket.on('error', (err) => {
    console.log(err);
  });

  socket.on('disconnect', () => {
    console.log('A client disconnected');
  });
});

app.use('/auth', authRoutes);
app.use(isAuth);
app.use('/user', userRoutes);

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => console.log(err));
