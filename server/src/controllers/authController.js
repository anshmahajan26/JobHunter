import { User } from '../models/User.js';
import { UserProfile } from '../models/UserProfile.js';
import { UserPreference } from '../models/UserPreference.js';
import { AutomationSettings } from '../models/AutomationSettings.js';
import { generateToken } from '../utils/token.js';
import { env } from '../config/environment.js';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['user', 'admin']).optional(),
  adminSecret: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const register = async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    // Determine role: explicitly requested admin, or first registered user
    const userCount = await User.countDocuments();
    let assignedRole = userCount === 0 ? 'admin' : 'user';

    if (validated.role === 'admin') {
      const expectedSecret = env.ADMIN_SECRET || 'jobpilot-admin';
      if (userCount === 0 || validated.adminSecret === expectedSecret) {
        assignedRole = 'admin';
      } else {
        return res.status(403).json({
          success: false,
          message: 'Invalid Administrator Security Code. Contact system administrator.',
        });
      }
    }

    const user = await User.create({
      name: validated.name,
      email: validated.email,
      passwordHash: validated.password,
      role: assignedRole,
    });

    // Initialize blank UserProfile, UserPreference, and AutomationSettings
    await UserProfile.create({
      userId: user._id,
      personalDetails: {
        fullName: user.name,
        email: user.email,
      },
    });

    await UserPreference.create({
      userId: user._id,
    });

    await AutomationSettings.create({
      userId: user._id,
    });

    const token = generateToken({ userId: user._id, role: user.role });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validated.email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Contact administrator.',
      });
    }

    const isMatch = await user.comparePassword(validated.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken({ userId: user._id, role: user.role });

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { token, email, name, googleId } = req.body;
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication payload missing email or name.',
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const userCount = await User.countDocuments();
      const role = userCount === 0 ? 'admin' : 'user';

      user = await User.create({
        name,
        email,
        googleId: googleId || `g_${Date.now()}`,
        role,
      });

      await UserProfile.create({
        userId: user._id,
        personalDetails: {
          fullName: user.name,
          email: user.email,
        },
      });

      await UserPreference.create({ userId: user._id });
      await AutomationSettings.create({ userId: user._id });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Contact administrator.',
      });
    }

    const jwtToken = generateToken({ userId: user._id, role: user.role });

    res.json({
      success: true,
      message: 'Google login successful.',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
    },
  });
};

export const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
};

