const http = require('http');

const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');

const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIRECTORY_PATH = './public';

let app = express();
let server = http.createServer(app);
let io = socketio(server);

app.use(express.static(PUBLIC_DIRECTORY_PATH));

io.on('connection', (socket) => {
    console.log('New WebSocket connection');
    
    socket.on('join', (options, callback) => {
        const {user, error} = addUser({ id: socket.id, ...options });
        
        if (error) {
            callback(error);
            return;
        }
    
        socket.join(user.room);
    
        socket.emit('message', generateMessage('Admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
        
        callback();
    });
    
    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter();
        
        if (filter.isProfane(message)) {
            callback('Profanity is not allowed!');
            return;
        }
    
        const user = getUser(socket.id);
        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback();
    });
    
    socket.on('sendLocation', (coordinates, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`));
        callback();
    });
    
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
    
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}...`);
});