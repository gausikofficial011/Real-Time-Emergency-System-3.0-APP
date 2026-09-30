const Ambulance = require('../models/Ambulance');

let _io = null;

// ─── Initialize Socket.IO ─────────────────────────────────────────────────────
const initSockets = (io) => {
  _io = io;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room
    socket.on('join', ({ userId, role }) => {
      if (userId) {
        const userRoom = `user_${userId}`;
        socket.join(userRoom);
        console.log(`👤 User ${userId} joined room: ${userRoom}`);
      }
      if (role === 'admin' || role === 'hospital_staff' || role === 'superadmin') {
        socket.join('admins');
        console.log(`🛡️  ${role} joined admins room`);
      }
      if (role === 'driver') {
        socket.join('drivers');
      }
      socket.emit('room_joined', { success: true, rooms: [...socket.rooms] });
    });

    // Driver location update (from mobile app)
    socket.on('driver_location_update', async ({ ambulanceId, lat, lng }) => {
      try {
        if (!ambulanceId || lat === undefined || lng === undefined) return;
        await Ambulance.findByIdAndUpdate(ambulanceId, {
          'currentLocation.lat': lat,
          'currentLocation.lng': lng,
          'currentLocation.lastUpdated': new Date(),
        });
        const locationData = { ambulanceId, lat, lng, timestamp: new Date() };
        io.to('admins').emit('ambulance_location', locationData);
      } catch (err) {
        console.error('Error updating driver location via socket:', err.message);
      }
    });

    // Status change from driver
    socket.on('status_change', async ({ ambulanceId, status }) => {
      try {
        if (!ambulanceId || !status) return;
        await Ambulance.findByIdAndUpdate(ambulanceId, { status });
        io.to('admins').emit('ambulance_status_changed', { ambulanceId, status, timestamp: new Date() });
      } catch (err) {
        console.error('Error updating status via socket:', err.message);
      }
    });

    // Ping/pong for health check
    socket.on('ping_server', () => {
      socket.emit('pong_server', { timestamp: new Date() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} — ${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`Socket error [${socket.id}]:`, err);
    });
  });

  console.log('✅ Socket.IO event handlers initialized');
};

// ─── Emit Helpers ─────────────────────────────────────────────────────────────
const emitAmbulanceAssigned = (userId, data) => {
  if (!_io) return;
  _io.to(`user_${userId}`).emit('ambulance_assigned', data);
  _io.to('admins').emit('ambulance_assigned_admin', data);
};

const emitAmbulanceLocation = (userId, data) => {
  if (!_io) return;
  if (userId) _io.to(`user_${userId}`).emit('ambulance_location', data);
  _io.to('admins').emit('ambulance_location', data);
};

const emitAssignmentConfirmed = (data) => {
  if (!_io) return;
  _io.to('admins').emit('assignment_confirmed', data);
};

const emitNewEmergency = (data) => {
  if (!_io) return;
  _io.to('admins').emit('new_emergency', data);
};

const emitStatusUpdate = (userId, data) => {
  if (!_io) return;
  if (userId) _io.to(`user_${userId}`).emit('status_update', data);
  _io.to('admins').emit('status_update', data);
};

const emitToDriver = (driverUserId, event, data) => {
  if (!_io) return;
  _io.to(`user_${driverUserId}`).emit(event, data);
};

module.exports = {
  initSockets,
  emitAmbulanceAssigned,
  emitAmbulanceLocation,
  emitAssignmentConfirmed,
  emitNewEmergency,
  emitStatusUpdate,
  emitToDriver,
};
