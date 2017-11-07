var express = require('express'),
app = express(),
server = require('http').createServer(app),
io = require('socket.io').listen(server),
mongoose = require('mongoose');

var usernames = [];
server.listen(process.env.PORT || 3000, function(){
console.log("Server started on port 3000...");
});

mongoose.connect('mongodb://localhost/chat', function(err){
    if(err){
        console.log(err);
    }else{
        console.log('Connected to mongodb...');
    }
});

var chatSchema = mongoose.Schema({
    nick: String,
    msg: String,
    created: {type: Date, default: Date.now}
});

var Chat = mongoose.model('Message',chatSchema);

var path = require('path');
app.use('/scripts', express.static(path.join(__dirname, 'node_modules')));
//app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
res.sendFile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket){
console.log('Socket Connected...');
var query = Chat.find({});
query.sort('-created').limit(8).exec(function(err, docs){
    if(err) throw err;
    socket.emit('load old msgs', docs);
});

//new user
socket.on('new user', function(data, callback){
    if(usernames.indexOf(data) != -1){
        callback(false);
    } else {
        callback(true);
        socket.username = data;
        usernames.push(socket.username);
        updateUsernames();
    }
});
//update Usernames
function updateUsernames(){
    io.sockets.emit('usernames', usernames);
}
//send message
socket.on('send message', function(data){
    var newMsg = new Chat({msg:data, nick:socket.username});
    newMsg.save(function(err){
        if(err) throw err;
        io.sockets.emit('new message', {msg:data, nick:socket.username});
    })
    
});
//Disconnect
socket.on('disconnect', function(data){
    if(!socket.username){
        return;
    }

    usernames.splice(usernames.indexOf(socket.username), 1);
    updateUsernames();
})
}); 