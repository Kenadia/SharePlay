standardizeNumber = function (number) {
  return '+1' + number.replace(/[\s-\(\)]/g, '');
}

// SMS handling
var handleSms = function (request, response) {
  var sms = request.body;
  if (sms.Body) {
    var phone = Phones.findOne({number: sms.To});
    var playlistId = Playlists.findOne({phone_id: phone._id})._id;
    var authorized = authorizedUser(sms.From, playlistId);
    var msgLower = sms.Body.toLowerCase();
    switch (msgLower) {
      case "pause":
        if (authorized) {
          Playlists.update(playlistId, {$set: {action: 'pause'}});
          textRespond(response, "Pausing song.");
        } else {
          textRespond(response, "You are not authorized to perform that action.");
        }
        return;
      case "play":
        if (authorized) {
          Playlists.update(playlistId, {$set: {action: 'play'}});
          textRespond(response, "Resuming play.");
        } else {
          textRespond(response, "You are not authorized to perform that action.");
        }
        return;
      case "skip":
        if (authorized) {
          Playlists.update(playlistId, {$set: {action: 'skip'}});
          textRespond(response, "Skipping song.");
        } else {
          textRespond(response, "You are not authorized to perform that action.");
        }
        return;
    }
    var found = msgLower.match(/play:(.*)/);
    if (found) {
      if (authorized) {
        Songs.insert({
          name: found[1].trim(),
          from: sms.From,
          playlist_id: playlistId,
          add_time: new Date().getTime(),
          privileged: true,
        });
        textRespond(response, "Playing " + found[1].trim());
      } else {
        textRespond(response, "You are not authorized to perform that action.");
      }
      return;
    }
    Songs.insert({
      name: sms.Body,
      from: sms.From,
      playlist_id: playlistId,
      add_time: new Date().getTime(),
    });
    textRespond(response, "Thanks for sending a song request!");
  }
};

var textRespond = function (response, str) {
  var xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Sms>'+ str +'</Sms></Response>';
  response.writeHead(200, {'Content-Type': 'text/xml'});
  response.end(xml);
};

var authorizedUser = function (userNumber, playlistId) {
  var numberArray = Users.find({playlist_id: playlistId}).map(function (user) {return user.number});
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
