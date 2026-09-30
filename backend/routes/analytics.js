const express = require('express');
const Emergency = require('../models/Emergency');
const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/analytics/ (admin/superadmin only) ──────────────────────────────
router.get('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  req.url = '/summary';
  router.handle(req, res);
});

// ─── GET /api/analytics/summary ──────────────────────────────────────────────
router.get('/summary', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const [
      totalEmergencies,
      byStatus,
      bySeverity,
      byType,
      resolvedForResponseTime,
      ambulanceStats,
      hospitalStats,
    ] = await Promise.all([
      Emergency.countDocuments(),
      Emergency.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Emergency.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Emergency.aggregate([{ $group: { _id: '$incidentType', count: { $sum: 1 } } }]),
      Emergency.find({ status: 'resolved', resolvedAt: { $exists: true } })
        .select('createdAt resolvedAt')
        .limit(100),
      Ambulance.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Hospital.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalBeds: { $sum: '$totalBeds' },
            availableBeds: { $sum: '$availableBeds' },
            totalIcu: { $sum: '$icuBeds' },
            availableIcu: { $sum: '$availableIcuBeds' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Average response time in minutes
    let avgResponseTime = 0;
    if (resolvedForResponseTime.length > 0) {
      const totalMs = resolvedForResponseTime.reduce((sum, e) => {
        return sum + (new Date(e.resolvedAt) - new Date(e.createdAt));
      }, 0);
      avgResponseTime = Math.round(totalMs / resolvedForResponseTime.length / 60000);
    }

    const ambulanceByStatus = Object.fromEntries(ambulanceStats.map(x => [x._id, x.count]));
    const beds = hospitalStats[0] || { totalBeds: 0, availableBeds: 0, totalIcu: 0, availableIcu: 0, count: 0 };

    res.json({
      success: true,
      summary: {
        totalEmergencies,
        byStatus: Object.fromEntries(byStatus.map(x => [x._id, x.count])),
        bySeverity: Object.fromEntries(bySeverity.map(x => [x._id, x.count])),
        byType: Object.fromEntries(byType.map(x => [x._id, x.count])),
        avgResponseTime,
        activeAmbulances: ambulanceByStatus['dispatched'] || 0,
        availableAmbulances: ambulanceByStatus['available'] || 0,
        ambulanceByStatus,
        totalHospitals: beds.count,
        totalBeds: beds.totalBeds,
        availableBeds: beds.availableBeds,
        totalIcu: beds.totalIcu,
        availableIcu: beds.availableIcu,
      },
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/analytics/monthly ──────────────────────────────────────────────
router.get('/monthly', authenticate, async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const data = await Emergency.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            type: '$incidentType',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Pivot to chart-friendly format
    const monthMap = {};
    data.forEach(({ _id, count }) => {
      const key = `${_id.year}-${String(_id.month).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { month: key };
      monthMap[key][_id.type] = (monthMap[key][_id.type] || 0) + count;
      monthMap[key].total = (monthMap[key].total || 0) + count;
    });

    const monthly = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
    res.json({ success: true, monthly });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/analytics/response-times ───────────────────────────────────────
router.get('/response-times', authenticate, async (req, res) => {
  try {
    const data = await Emergency.aggregate([
      { $match: { status: 'resolved', resolvedAt: { $exists: true } } },
      {
        $group: {
          _id: '$incidentType',
          avgResponseMinutes: {
            $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 60000] },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const responseTimes = data.map(d => ({
      type: d._id,
      avgMinutes: Math.round(d.avgResponseMinutes),
      count: d.count,
    }));

    res.json({ success: true, responseTimes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/analytics/ambulance-utilization ─────────────────────────────────
router.get('/ambulance-utilization', authenticate, async (req, res) => {
  try {
    const [statusBreakdown, totalTrips] = await Promise.all([
      Ambulance.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalTrips: { $sum: '$totalTrips' } } },
      ]),
      Ambulance.aggregate([{ $group: { _id: null, total: { $sum: '$totalTrips' } } }]),
    ]);

    res.json({
      success: true,
      utilization: {
        byStatus: Object.fromEntries(statusBreakdown.map(x => [x._id, { count: x.count, trips: x.totalTrips }])),
        totalTripsAllFleet: totalTrips[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/analytics/user (authenticated user only) ─────────────────────────
router.get('/user', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const [total, pending, assigned, inProgress, resolved, cancelled] = await Promise.all([
      Emergency.countDocuments({ reportedBy: userId }),
      Emergency.countDocuments({ reportedBy: userId, status: 'pending' }),
      Emergency.countDocuments({ reportedBy: userId, status: 'assigned' }),
      Emergency.countDocuments({ reportedBy: userId, status: 'in_progress' }),
      Emergency.countDocuments({ reportedBy: userId, status: 'resolved' }),
      Emergency.countDocuments({ reportedBy: userId, status: 'cancelled' }),
    ]);

    res.json({
      success: true,
      stats: {
        total,
        pending,
        assigned,
        inProgress,
        active: pending + assigned + inProgress,
        resolved,
        cancelled,
      },
    });
  } catch (err) {
    console.error('User analytics error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/analytics/trends (admin/superadmin only) ─────────────────────────
router.get('/trends', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const trends = await Emergency.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const formattedTrends = trends.map((t) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        month: `${monthNames[t._id.month - 1]} ${t._id.year}`,
        count: t.count,
        critical: t.critical,
        high: t.high,
        medium: t.medium,
        low: t.low,
      };
    });

    res.json({ success: true, trends: formattedTrends });
  } catch (err) {
    console.error('Trends analytics error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
