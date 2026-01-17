const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// In-memory Database (Data resets if server restarts - perfect for simple usage)
let candidates = [];
let questions = [];
let isExamActive = false; // Master switch for the exam

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // --- CANDIDATE EVENTS ---
    socket.on('candidateLogin', (creds) => {
        const valid = candidates.find(c => c.name === creds.name && c.roll === creds.roll);
        if (valid) {
            socket.emit('loginSuccess', { questions, isExamActive });
        } else {
            socket.emit('loginFailed');
        }
    });

    // --- EXAMINER EVENTS ---
    socket.on('addCandidate', (candidate) => {
        candidates.push(candidate);
        console.log('Candidate Added:', candidate.name);
    });

    socket.on('addQuestion', (q) => {
        questions.push(q);
        // Update all connected candidates instantly
        io.emit('updateQuestions', questions);
    });

    socket.on('toggleExam', (status) => {
        isExamActive = status;
        io.emit('examStatusChange', isExamActive); // Notify everyone instantly
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});