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
  if (!request.body.Body) {
    console.log("Empty request");
    return;
  } else {
    console.log("Received an SMS with body:");
    console.log(request.body.Body);
    Songs.insert({name: request.body.Body});
  }
  var xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Sms>Thanks for your song request!</Sms></Response>';
  response.writeHead(200, {'Content-Type': 'text/xml'});
  response.end(xml);
};

if (Meteor.isClient) {

  Template.main.queue = function () {
    return Songs.find({});
  };

}

if (Meteor.isServer) {

  // Constants and libraries
  var accountSid = 'AC116fe83f10fb4d81941b83f71ca10f60'; 
  var authToken = '745b0d3378f769e4918f0255cf61f850';

  // Returns the result of an asynchronous call.
  var asyncResult = function (asyncCall) {
    var future = new Future();
    asyncCall(Meteor.bindEnvironment(function (err, res) {
      if (err) {
        future.throw(err);
      } else {
        future.return(res)
      }
    }));
    return future.wait();
  };

  Meteor.methods({
  });

}
