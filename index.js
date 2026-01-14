const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// =====================
// Models
// =====================

// User model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Exercise model
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  duration: Number,
  date: Date
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

// =====================
// Routes
// =====================

// Home
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create new user
app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;
    const user = new User({ username });
    const savedUser = await user.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find().select('username _id');
  res.json(users);
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exerciseDate = date ? new Date(date) : new Date();

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: Number(duration),
      date: exerciseDate
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get exercise logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let query = { userId: user._id };

    if (from || to) query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);

    let exerciseQuery = Exercise.find(query)
      .select('description duration date -_id')
      .sort({ date: 1 });

    if (limit) {
      exerciseQuery = exerciseQuery.limit(Number(limit));
    }

    const exercises = await exerciseQuery.exec();

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// Start server
// =====================
const listener = app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
