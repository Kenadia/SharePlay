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
