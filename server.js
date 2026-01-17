const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app); // This creates the 'server' variable

// Now we can safely use 'server' here
const io = new Server(server, {
    maxHttpBufferSize: 1e8, // 100 MB buffer for video streams
    cors: { origin: "*" }
});

// Serve frontend files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- DATABASE (In-Memory) ---
let candidates = [];
let questions = [];
let submissions = {}; 
let examConfig = {
    startTime: null, 
    durationMinutes: 30,
    isActive: false
};

io.on('connection', (socket) => {
    
    // --- EXAMINER LOGIN (For CCTV Room) ---
    socket.on('examinerLogin', () => {
        socket.join('examinerRoom');
    });

    // --- EXAMINER ACTIONS ---
    socket.on('examinerUpdateConfig', (config) => {
        examConfig = config;
        io.emit('configUpdate', examConfig);
    });

    socket.on('addQuestion', (q) => {
        questions.push(q);
        io.emit('updateQuestions', questions);
    });

    socket.on('removeQuestion', (index) => {
        questions.splice(index, 1);
        io.emit('updateQuestions', questions);
    });

    socket.on('registerCandidate', (c) => {
        candidates.push(c);
        console.log("New Candidate Registered:", c.name);
    });

    socket.on('getResults', () => {
        socket.emit('resultsData', { candidates, submissions, questions });
    });

    // --- CANDIDATE ACTIONS ---
    socket.on('candidateLogin', (creds) => {
        const user = candidates.find(c => c.name === creds.name && c.roll === creds.roll);
        if (user) {
            socket.join(user.roll);
            socket.emit('loginSuccess', { 
                questions, 
                config: examConfig,
                previousAnswers: submissions[user.roll] || {}
            });
        } else {
            socket.emit('loginFailed');
        }
    });

    // VIDEO STREAM RELAY (Candidate -> Server -> Examiner)
    socket.on('candidateStream', (data) => {
        // Broadcasts video feed ONLY to the examiner
        socket.to('examinerRoom').emit('updateFeed', data);
    });

    // ANSWER SUBMISSION
    socket.on('submitAnswer', (data) => {
        if (!submissions[data.roll]) submissions[data.roll] = {};
        submissions[data.roll][data.qIndex] = data.answer;
    });

    socket.on('finishExam', (roll) => {
        console.log(`Exam submitted by ${roll}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});