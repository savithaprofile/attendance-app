// File:index.js (Node.js/Express Backend)
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const haversine = require('haversine-distance');
const officeLocation = require('./config/officeLocation'); // Import office location config

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Models
const User = require('./models/User');
const Schedule = require('./models/Schedule');
const Attendance = require('./models/Attendance');

// Middleware
const authMiddleware = require('./middleware/auth');
const roleMiddleware = require('./middleware/role');

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});


const upload = multer({ storage });

// Routes
//  Register Route
app.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, position, company, schedule } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone || !position || !company) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      position,
      company,
      role: 'employee'
    });

    await user.save();

    // Create schedule if provided
    if (schedule) {
      const userSchedule = new Schedule({
        user: user._id,
        weeklySchedule: schedule
      });
      await userSchedule.save();
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        position: user.position,
        company: user.company,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        name: user.name 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token,
      userId: user._id,
      role: user.role,
      name: user.name
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/attendance', authMiddleware, upload.single('image'), async (req, res) => {
  const userLocation = {
    lat: parseFloat(req.body.location.split(',')[0]),
    lon: parseFloat(req.body.location.split(',')[1])
  };
  
  const officeCoords = {
    lat: officeLocation.latitude,
    lon: officeLocation.longitude
  };
  
  const distance = haversine(userLocation, officeCoords); // in meters
  const isInOffice = distance <= officeLocation.radiusMeters;
  
  const attendance = new Attendance({
    user: req.user._id,
    type: req.body.type,
    location: req.body.location,
    image: req.file.filename,
    isInOffice,
    timestamp: new Date()
  });
  await attendance.save();
  res.json({ message: 'Attendance marked' });
});

app.get('/attendance/all', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const records = await Attendance.find().populate('user', 'name email');
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//checkin or check out
app.get('/attendance/last', authMiddleware, async (req, res) => {
  try {
    const lastRecord = await Attendance.findOne({ user: req.user._id }).sort({ timestamp: -1 });
    if (!lastRecord) return res.status(200).json({ type: null });
    res.json({ type: lastRecord.type });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch last attendance' });
  }
});

// Add these routes to your existing index.js file

// Get all users (admin only)
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name email role phone position company');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get single user
app.get('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password'); // Exclude password for safety

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      position: user.position,
      company: user.company,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Get all attendance records for a user
app.get('/attendance/user/:userId', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const records = await Attendance.find({ user: req.params.userId }).populate('user', 'name email');
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});   

// Get all attendance records for the logged-in user
app.get('/attendance/me', authMiddleware, async (req, res) => {
  try {
    const records = await Attendance.find({ user: req.user._id }).populate('user', 'name email');
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Get all attendance records for a specific date
app.get('/attendance/date/:date', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const records = await Attendance.find({
      timestamp: {
        $gte: new Date(date.setHours(0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59))
      }
    }).populate('user', 'name email');
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Get user's schedule
app.get('/schedules/user/:userId', authMiddleware, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ user: req.params.userId });
    res.json(schedule || {});
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this to your backend routes
app.get('/users/me', authMiddleware, async (req, res) => {
  try {
    // Get user ID from the authenticated request (added by authMiddleware)
    const userId = req.user._id;
    
    // Find user by ID and exclude the password field
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
app.put('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { name, email, password, phone, position, company, schedule } = req.body;
    const updateData = { name, email, phone, position, company };

    // Only update password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update or create schedule
    if (schedule) {
      await Schedule.findOneAndUpdate(
        { user: req.params.id },
        { weeklySchedule: schedule },
        { upsert: true, new: true }
      );
    }

    res.json({ 
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        position: user.position,
        company: user.company,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});






async function setupAdmin() {
  const existing = await User.findOne({ email: 'admin@urbancode.in' });
  if (!existing) {
    const hashed = await bcrypt.hash('12345678', 10);
    await User.create({
      name: 'Admin',
      email: 'admin@urbancode.in',
      password: hashed,
      role: 'admin',
      phone: '6374129515',       // ← required
      position: 'Admin',         // ← required
      company: 'Urbancode'       // ← required
    });
    console.log('Admin created: admin@urbancode.in / 12345678');
  }
}

setupAdmin();

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    app.listen(5000, () => console.log('Server running on port 5000'));
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

startServer();
