// SMS handling
var handleSms = function (request, response) {
  var sms = request.body;
  if (verifyNumber(request.From) === false){
    if (sms.Body) {
      Songs.insert({
        name: sms.Body,
        from: sms.From,
        to: sms.To
        });
        textRespond("Thanks for sending a song request!");
    }
  }

  else {
    switch(sms.Body.toLowerCase()) {
      case "pause":
          Playlist.pause();
          textRespond("Song paused.");
          break;
      case "play":
          Playlist.play();
          textRespond("Play resumed.");
          break;
      case "skip":
          Playlist.skip();
          textRespond("Song skipped.");
          break;
      default:
          if (sms.Body) {
            Songs.insert({
              name: sms.Body,
              from: sms.From,
              to: sms.To
            });
            textRespond("Thanks for sending a song request!");
          }
    }
  }
};

var textRespond = function (str) {
  var xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Sms>'+ str +'</Sms></Response>';
    response.writeHead(200, {'Content-Type': 'text/xml'});
    response.end(xml);
};

var verifyNumber = function (number) {
  for (i = 0; i < numberArray.length; i++) {
    if (number === numberArray[i]){
      return true;
    }
  }
  return false;
};

// Collections
Songs = new Mongo.Collection("songs");
Phones = new Mongo.Collection("phones");

// Routes
Router.map(function () {
  this.route('sms', {
    where: 'server',
    action: function () {
      handleSms(this.request, this.response);
    }
  });
});
