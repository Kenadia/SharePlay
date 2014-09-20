Songs = new Mongo.Collection("songs");

Router.map(function () {
  this.route('sms', {
    where: 'server',
    action: function () {
      handleSms(this.request, this.response);
    }
  });
});

var handleSms = function (request, response) {
  if (request.body.Body) {
    Songs.insert({name: request.body.Body});
    var xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Sms>Thanks for your song request!</Sms></Response>';
    response.writeHead(200, {'Content-Type': 'text/xml'});
    response.end(xml);
  }
};

if (Meteor.isClient) {

  Template.main.queue = function () {
    return Songs.find({});
  };

}
