const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const isAuth = require('./middleware/is-auth');
const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const userRoutes = require('./routes/user');

require('dotenv').config();

const { USER, PWD, HOST } = process.env;

const app = express();
app.use('/avatars', express.static(path.join(__dirname, 'public', 'avatars')));
app.use(cors());
app.use(express.json());

const MONGO_URI = `mongodb+srv://${USER}:${PWD}@${HOST}/familyhub?retryWrites=true`;

app.use('/auth', authRoutes);
app.use(isAuth);
app.use('/user', userRoutes);
app.use('/family', familyRoutes);

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => app.listen(8080))
  .catch((err) => console.log(err));
