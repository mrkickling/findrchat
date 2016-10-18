var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();

var express=require('express');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(appEnv.port);
console.log(appEnv.port);
app.use(express.static('public'));


lonelyClient = {};
allClients = {};

io.on('connection', function (socket) {
    io.to(socket.id).emit('userCount', Object.keys(allClients).length);
    console.log(socket.id,'just came to website')
    
    socket.on('disconnect', function() {
        if(allClients[socket.id]){
            if(lonelyClient.id == socket.id){
                    lonelyClient = {};
            }else{
                if(allClients[allClients[socket.id].partner]){
                    io.to(allClients[socket.id].partner).emit('aborted');
                }
            }
            
            delete allClients[socket.id];

            console.log(socket.username, 'disconnected!');
            console.log(Object.keys(allClients).length + ' users online');
        }else{
            console.log('A user that never registered left')
        }
        
        io.sockets.emit('userCount', Object.keys(allClients).length);

    });
        
    socket.on('delete', function(){
        if(lonelyClient.id == socket.id){
            lonelyClient = {};
        }
        if(allClients[allClients[socket.id].partner]){
            io.to(allClients[socket.id].partner).emit('aborted');
        }
        delete allClients[socket.id];
        console.log(socket.username, 'left')
        console.log(Object.keys(allClients).length + ' users online now')
    });
    
    socket.on('new user', function(data){
        
        if(!data || data==""){
            console.log('error: no username');
            return;
        }
        if(data.length>30){
            data = data.substring(0,29)
        }
        socket.username = data;
        allClients[socket.id] = socket;

        console.log('new user', data); 
                
        if(lonelyClient.id){
            console.log(lonelyClient.username, 'matchar nu med', socket.username);
            socket.partner = lonelyClient.id;
            allClients[lonelyClient.id].partner = socket.id;
            allClients[socket.id].partner = lonelyClient.id;
            
            io.to(lonelyClient.id).emit('match', {
                username:data,
                id:socket.id
            });
            io.to(socket.id).emit('match', {
                username:lonelyClient.username,
                id:lonelyClient.id
            });
            
            lonelyClient = {};

        }else{
            console.log(socket.username, 'är ensam här');
            lonelyClient.username = data;
            lonelyClient.id = socket.id;
        }

        console.log(Object.keys(allClients).length + ' users online')
        io.sockets.emit('userCount', Object.keys(allClients).length);

    });
    
    socket.on('new message', function(data){
        console.log(data)
        if(allClients[data.partnerID]){
              
            io.to(data.partnerID).emit('incoming message', {
                userID:socket.id,
                user:socket.username,
                message:data.message
            });
            io.to(socket.id).emit('incoming message', {
                userID:socket.id,
                user:socket.username,
                message:data.message
            });
            io.to(data.partnerID).emit('stop typing', {
                username: socket.username
            });

        }else{
           io.to(socket.id).emit('aborted');
        }
    })
    
          // when the client emits 'typing', we broadcast it to others
      socket.on('typing', function (data) {
        io.to(data).emit('typing', {
          username: socket.username
        });
      });

      // when the client emits 'stop typing', we broadcast it to others
      socket.on('stop typing', function (data) {
        io.to(data).emit('stop typing', {
          username: socket.username
        });
      });

    
});

