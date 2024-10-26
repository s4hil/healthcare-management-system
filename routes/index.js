// routes/index.js
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path')
const { User, Appointment } = require('../models');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Middleware to check authentication
function ensureAuthenticated(req, res, next) {
    if (req.session.userId) {
      return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    res.redirect('/login');
  }

// Routes
router.get('/', (req, res) => {
  res.render('login', { message: req.flash('error_msg') });
});

// Signup
router.get('/signup', (req, res) => {
  res.render('signup');
});

router.post('/signup', async (req, res) => {
  const { email, name, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, name, password: hashedPassword });
  await user.save();
  req.flash('success_msg', 'Signup successful! Please log in.');
  res.redirect('/login');
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id; // Set user ID in the session
      return res.redirect('/dashboard');
    }
    req.flash('error_msg', 'Invalid email or password');
    res.redirect('/login');
  });

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id;
    return res.redirect('/dashboard');
  }
  req.flash('error_msg', 'Invalid email or password');
  res.redirect('/login');
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const appointments = await Appointment.find({ userId: req.session.userId });
  res.render('dashboard', { user, appointments });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Appointment
router.get('/appointment', ensureAuthenticated, (req, res) => {
  res.render('appointment');
});

router.post('/appointment', ensureAuthenticated, async (req, res) => {
  const { date, time, doctor } = req.body;
  const appointment = new Appointment({ userId: req.session.userId, date, time, doctor });
  await appointment.save();
  res.redirect('/dashboard');
});

// Document Upload
router.post('/upload', upload.single('document'), ensureAuthenticated, async (req, res) => {
    const user = await User.findById(req.session.userId);
  
    // Use the original name and preserve the extension
    const originalName = req.file.originalname;
    const fileName = req.file.filename; // Store the filename
  
    user.documents.push({ name: originalName, path: fileName }); // Save only filename in path
    await user.save();
    res.redirect('/dashboard');
  });
  


// Document Download
router.get('/download/:filename', ensureAuthenticated, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename); // Construct the full path to the file
    res.download(filePath, (err) => {
      if (err) {
        req.flash('error_msg', 'File not found');
        return res.redirect('/dashboard');
      }
    });
  });

module.exports = router;
