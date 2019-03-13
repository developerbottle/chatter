const socket = io();

// Elements
let $messageForm = document.querySelector('#message-form');
let $messageInput = $messageForm.elements.message;
let $messageSubmit = $messageForm.elements.submit;

let $sendLocationButton = document.querySelector('#send-location');

let $messages = document.querySelector('#messages');

// Templates
let messageTemplate = document.querySelector('#message-template').innerHTML;
let locationTemplate = document.querySelector('#location-template').innerHTML;
let sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
let { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;
    
    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom) + parseInt(newMessageStyles.marginTop);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;
    
    // Visible height
    const visibleHeight = $messages.offsetHeight;
    
    // Height of messages container
    const containerHeight = $messages.scrollHeight;
    
    // How far have I scrolled?
    const scrolledOffset = $messages.scrollTop + visibleHeight;
    
    if (containerHeight - newMessageHeight <= scrolledOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
};

socket.on('message', (message) => {
    console.log(message);
    let html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format("h:mm a")
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('locationMessage', (message) => {
    console.log(message);
    let html = Mustache.render(locationTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format("h:mm a")
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('roomData', ({ room, users }) => {
    let html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    
    document.querySelector('#sidebar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    let message = $messageInput.value;
    if (message) {
        $messageSubmit.setAttribute('disabled', 'disabled');
        
        socket.emit('sendMessage', message, (error) => {
            $messageSubmit.removeAttribute('disabled');
            $messageInput.focus();
            
            if (error) {
                console.log(error);
                return;
            }
            
            console.log('Message delivered!');
        });
    }
    
    $messageInput.value = '';
});

$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }
    
    $sendLocationButton.setAttribute('disabled', 'disabled');
    
    navigator.geolocation.getCurrentPosition((position) => {
        const coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };
        
        socket.emit('sendLocation', coordinates, () => {
            $sendLocationButton.removeAttribute('disabled');
            console.log('Location shared!');
        });
    });
});

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});