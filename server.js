// server.js updates
const { Server } = require("socket.io");

// Increase buffer size to handle video frames
const io = new Server(server, {
    maxHttpBufferSize: 1e8, // 100 MB buffer
    cors: { origin: "*" }
});

io.on('connection', (socket) => {
    // ... existing login/question logic ...

    // MONITORING: Relay stream from Candidate to Examiner
    socket.on('candidateStream', (data) => {
        // data contains: { roll, name, image }
        // We broadcast this to the 'examinerRoom' only to save bandwidth
        socket.to('examinerRoom').emit('updateFeed', data);
    });

    // Examiner must join a special room to receive feeds
    socket.on('examinerLogin', () => {
        socket.join('examinerRoom');
    });
});