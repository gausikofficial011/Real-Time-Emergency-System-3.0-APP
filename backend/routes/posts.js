const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/posts - Get all active posts (accessible by everyone)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: posts.length, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/posts/admin - Get all posts including inactive (Admin only)
router.get('/admin', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: posts.length, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/posts - Create a new post (Admin only)
router.post('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const post = await Post.create({
      ...req.body,
      createdBy: req.user._id,
    });
    
    // If it's an emergency alert, trigger a socket event
    if (post.type === 'emergency_alert') {
      const io = req.app.get('io');
      if (io) {
        io.emit('emergency_broadcast', post);
      }
    }

    res.status(201).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/posts/:id - Update a post (Admin only)
router.put('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/posts/:id - Delete a post (Admin only)
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.status(200).json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
