const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const auth = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Emails listed in ADMIN_EMAILS (comma-separated) are automatically admins.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
    authProvider: user.authProvider,
  };
}

// ==================== POST /register ====================
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, email, password, and role are all required',
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A user with that email already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isAdmin: isAdminEmail(email),
      authProvider: 'local',
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// ==================== POST /login ====================
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Sync isAdmin in case ADMIN_EMAILS changed since account was created
    if (user.isAdmin !== isAdminEmail(email)) {
      user.isAdmin = isAdminEmail(email);
      await user.save();
    }

    const token = signToken(user);
    res.status(200).json({ success: true, token, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// ==================== POST /google ====================
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing Google credential',
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        authProvider: 'google',
        role: 'Visitor',
        isAdmin: isAdminEmail(email),
      });
    } else {
      // Link Google ID if first time using Google, and sync admin status
      let changed = false;
      if (!user.googleId) { user.googleId = googleId; changed = true; }
      if (user.isAdmin !== isAdminEmail(email)) {
        user.isAdmin = isAdminEmail(email);
        changed = true;
      }
      if (changed) await user.save();
    }

    const token = signToken(user);
    res.status(200).json({ success: true, token, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// ==================== POST /forgot-password ====================
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Bad Request', message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    const genericResponse = {
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    };

    if (!user) return res.status(200).json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Reset your password here (valid 10 min): ${clientUrl}/reset-password/${rawToken}`,
    });

    res.status(200).json(genericResponse);
  } catch (err) {
    next(err);
  }
});

// ==================== POST /reset-password/:token ====================
router.post('/reset-password/:token', async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 6 characters',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Reset link is invalid or has expired',
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

// ==================== GET /me ====================
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    res.status(200).json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// ==================== PUT /me ====================
router.put('/me', auth, async (req, res, next) => {
  try {
    const { name, role } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true, runValidators: true,
    }).select('-password');

    if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    res.status(200).json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
