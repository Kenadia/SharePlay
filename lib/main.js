standardizeNumber = function (number) {
  return '+1' + number;
}

// SMS handling
var handleSms = function (request, response) {
  var sms = request.body;
  if (sms.Body) {
    var authorized = authorizedUser(sms.From, sms.To);
    switch(sms.Body.toLowerCase()) {
      case "pause":
        if (authorized) {
          // Playlist.pause();
          textRespond(response, "Song paused.");
        } else {
          textRespond(response, "You are not authorized to perform that action.");
        }
        return;
      case "play":
        if (authorized) {
          // Playlist.play();
          textRespond(response, "Play resumed.");
        } else {
          textRespond(response, "You are not authorized to perform that action.");
        }
        return;
      case "skip":
        if (authorized) {
          // Playlist.skip();
          textRespond(response, "Song skipped.");
        } else {
          textRespond(response, "You are not authorized to perform that action.");
        }
        return;
    }
    Songs.insert({
      name: sms.Body,
      from: sms.From,
      to: sms.To
    });
    textRespond(response, "Thanks for sending a song request!");
  }
};

var textRespond = function (response, str) {
  var xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Sms>'+ str +'</Sms></Response>';
  response.writeHead(200, {'Content-Type': 'text/xml'});
  response.end(xml);
};

var authorizedUser = function (userNumber, toNumber) {
  var numberArray = Users.find({authorizedFor: toNumber}).map(function (user) {return user.number});
  console.log("Check whether " + userNumber + " is in ");
  console.log(numberArray);
  return numberArray.indexOf(userNumber) != -1;
};

// Collections
Songs = new Mongo.Collection("songs");
Phones = new Mongo.Collection("phones");
Users = new Mongo.Collection("users");
Playlists = new Mongo.Collection("playlists");

// Routes
Router.map(function () {
  this.route('sms', {
    where: 'server',
    action: function () {
      handleSms(this.request, this.response);
    }
  });
});
