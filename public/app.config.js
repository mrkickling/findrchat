var app = angular.module('IBMfinder', ['ngRoute']);

app.config(['$routeProvider', 
  function($routeProvider, settings) {
    $routeProvider
      .when('/main', {
        templateUrl: 'welcome.html',
        controller: 'welcomeCtrl',
      })
      .when('/find', {
        templateUrl: 'find.html',
        controller: 'findCtrl',
      })
      .when('/chat', {
        templateUrl: 'chat.html',
        controller: 'chatCtrl',
      })

      .otherwise({
        templateUrl: 'welcome.html',
        controller: 'welcomeCtrl',
      })
}])

app.controller('userCount', ['$scope', 'socket', function($scope, socket){
    socket.on('userCount', function(amount){
        $scope.online = amount;
        
    })
}]);

app.controller('welcomeCtrl', ['$scope', '$location', 'settings', 'socket', function($scope, $location, settings, socket){
    $scope.users = 13;
    if(settings.getUsername()!==""){
        socket.emit('delete');
        settings.reset();
    }
    
    $scope.enter = function(){
        settings.setUsername($scope.name);
        $location.path('/find');
    }
}]);

app.controller('findCtrl', ['$scope', '$location', 'settings', 'socket', '$rootScope', function($scope, $location, settings, socket, $rootScope){
    $scope.username = settings.getUsername();

    if(!$scope.username || $scope.username == ""){
        location.href = "index.html";
    }
    if(settings.exists){
        socket.emit('delete');
        location.href = "index.html";
        
    }

    $scope.chatlog = [];

    if(!settings.exists){
        var username = $scope.username;
        settings.setExists(true);
        
        socket.emit('new user', username );
    };
    
    socket.on('match', function (data) {
        settings.setPartner(data['username'], data['id']);
         $location.path('/chat');
    });

}]);


app.controller('chatCtrl', ['$scope', '$location', 'settings', 'socket', '$rootScope', '$timeout', '$window', '$interval', function($scope, $location, settings, socket, $rootScope, $timeout, $window, $interval){
    var typing = false;
    var focus = true;
    var titleTimer;
    var onFocus = function(){
        focus = true;
        $interval.cancel(titleTimer);
        document.title = 'Findr';
    }
    var onBlur = function(){
        focus = false;
    }
    $window.onfocus = onFocus;
    $window.onblur = onBlur;   

    $scope.username = settings.getUsername();
    $scope.partnerTyping = false;
    
    if(!$scope.username || $scope.username == ""){
        location.href = "index.html";
    }

    $scope.chatlog = [];

    if(!settings.exists){
        var username = $scope.username;
        settings.setExists(true);
        
        socket.emit('new user', username );
    };
    
    socket.on('incoming message', function(data){
        if($scope.chatlog[$scope.chatlog.length-1]){
            if($scope.chatlog[$scope.chatlog.length-1].sentby == data.userID){
                $scope.chatlog[ $scope.chatlog.length] = {
                    sentby:data.userID,
                    chatusername: '',
                    chatmessage: data.message
                }
            }else{
                $scope.chatlog[ $scope.chatlog.length] = {
                    sentby:data.userID,
                    chatusername: data.user + ": ",
                    chatmessage: data.message
                }

            }
        }else{
            $scope.chatlog[ $scope.chatlog.length] = {
                sentby:data.userID,
                chatusername: data.user + ": ",
                chatmessage: data.message
            }
        }

        if(!focus){
            document.title = 'Nytt meddelande!';
            
            $interval.cancel(titleTimer);
            titleTimer = $interval(function(){
                if(document.title == 'Nytt meddelande!'){
                    document.title = 'Findr';
                }else{
                    document.title = 'Nytt meddelande!';
                }
            }, 1000)
        }

    });
    
    socket.on('aborted',  function(data){
        alert('Your partner left, sorry!');
        socket.emit('delete');
        settings.reset();
        location.href = "index.html";
    })
    
    $scope.typing = function(){
        if(!typing){
            socket.emit('typing', settings.getID());
            typing = true;
        var stop = $timeout(function() {
            typing = false;
            socket.emit('stop typing', settings.getID());
        }, 2000);

        }


    }
    
    socket.on('typing', function(data){
        $scope.partnerTyping = true;
        $('#chatbox').scrollTop(10000);

    })
    
    socket.on('stop typing', function(data){
        $scope.partnerTyping = false;
        $('#chatbox').scrollTop(10000);

    })


    $scope.sendMessage = function(){
        if($scope.message==""){
            
        }else{
            socket.emit( 'new message', {
                message:$scope.message, 
                partner:$scope.partner,
                partnerID: settings.getID()
            });
        }
        
        $scope.message = "";        
    }

    $scope.partner = settings.getPartner();

}]);


app.service('settings', function() {
    this.exists = false;
    this.username = "";
    this.partner = "";
    this.partnerID = "";
    this.userdata = {}


    this.setExists = function(bool){
        this.exists = bool;
    }
    this.setUsername = function(uname){
        this.username = uname;
    }
    this.getUsername = function(){
        return(this.username);
    }
    this.setUserID = function(id){
        this.userdata.id = id;
    }
    this.getuserdata = function(){
        return(this.userdata);
    }
    this.setPartner = function(uname, id){
        this.partner = uname;
        this.partnerID = id;
    }
    this.getPartner = function(){
        return(this.partner);
    }
    this.getID = function(){
        return(this.partnerID);
    }
    this.reset = function(){
        this.exists = false;
        this.username = "";
        this.partner = "";
        this.partnerID = "";
        this.userdata = {}
    }
});

app.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    },
    disconnect: function(id){
        socket.disconnect(id);
    }
  };
});


app.directive('myEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.myEnter);
                });

                event.preventDefault();
            }
        });
    };
});

app.directive('schrollBottom', function () {
  return {
    scope: {
      schrollBottom: "="
    },
    link: function (scope, element) {
      scope.$watchCollection('schrollBottom', function (newValue) {
        if (newValue)
        {
          $(element).scrollTop(100000);
        }
      });
    }
  }
})

