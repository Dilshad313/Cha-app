import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { JWT_SECRET } from '../config/auth.js';
import app from '../index.js'; // We need to import the app to get the io instance

// Mock the database connection
jest.mock('../config/database.js', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(),
}));

// Mock the User model
jest.mock('../models/User.js', () => ({
  findById: jest.fn(),
}));

const User = require('../models/User');

describe('Socket.IO disconnection logic', () => {
  let io, server, port;
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });

  beforeAll((done) => {
    // Mock the user that will be "found" in the database
    User.findById.mockResolvedValue({
      _id: userId,
      name: 'Test User',
      select: jest.fn().mockReturnThis(), // Mock the .select('-password') call
    });

    // Start the server and get the io instance from it
    server = createServer(app);
    io = app.get('io'); // Get the io instance from the app

    server.listen(() => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  test('user should remain online after one of two sockets disconnects', (done) => {
    const client1 = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });

    const client2 = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });

    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        // Both clients are connected. Now, disconnect the first one.
        client1.disconnect();
      }
    };

    client1.on('connect', onConnect);
    client2.on('connect', onConnect);

    // This is the crucial part of the test.
    // We listen for the 'user-offline' event.
    // With the bug, this event will be emitted when client1 disconnects.
    // We want to assert that it is NOT emitted.
    const onUserOffline = (offlineUserId) => {
      if (offlineUserId === userId) {
        // If this event is emitted while client2 is still connected, the test fails.
        if (client2.connected) {
          done(new Error('User was marked offline while still having an active connection.'));
        }
      }
    };

    // We'll use a third client to observe the global events without interfering.
    const observerClient = Client(`http://localhost:${port}`, {
      auth: { token: jwt.sign({ userId: 'observer' }, JWT_SECRET) },
      transports: ['websocket'],
      forceNew: true,
    });

    observerClient.on('user-offline', onUserOffline);

    client1.on('disconnect', () => {
      // After client1 disconnects, we'll wait a moment to see if 'user-offline' is emitted.
      // If it's not, then the test is on the right track.
      setTimeout(() => {
        // Now, disconnect the second client.
        client2.disconnect();
      }, 500);
    });

    client2.on('disconnect', () => {
      // The test is successful if we reach this point without the 'user-offline' event being fired prematurely.
      // Now we can clean up and finish the test.
      observerClient.close();
      done();
    });
  });
});