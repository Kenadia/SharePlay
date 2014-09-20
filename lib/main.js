// SMS handling
var handleSms = function (request, response) {
  var sms = request.body;
  if (sms.Body) {
    if (authorizedUser(sms.From)) {
      switch(sms.Body.toLowerCase()) {
        case "pause":
          Playlist.pause();
          textRespond("Song paused.");
          return;
        case "play":
          Playlist.play();
          textRespond("Play resumed.");
          return;
        case "skip":
          Playlist.skip();
          textRespond("Song skipped.");
          return;
      }
    }
    Songs.insert({
      name: sms.Body,
      from: sms.From,
      to: sms.To
    });
    textRespond("Thanks for sending a song request!");
  }
};

var textRespond = function (str) {
  var xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Sms>'+ str +'</Sms></Response>';
  response.writeHead(200, {'Content-Type': 'text/xml'});
  response.end(xml);
};

var authorizedUser = function (number) {
  console.log("Check whether " + number + " is in ");
  console.log(numberArray);
  return numberArray.indexOf(number) != -1;
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
