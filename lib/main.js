// SMS handling
var handleSms = function (request, response) {
  var sms = request.body;
  if (sms.Body) {
    Songs.insert({
      name: sms.Body,
      from: sms.From,
      to: sms.To
    });
    var xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Sms>Thanks for your song request!</Sms></Response>';
    response.writeHead(200, {'Content-Type': 'text/xml'});
    response.end(xml);
  }
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
