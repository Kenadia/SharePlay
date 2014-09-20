if (Meteor.isClient) {

  Template.main.number = function () {
    return Session.get('phoneNumber');
  }

  Template.main.queue = function () {
    return Songs.find({to: Session.get('phoneNumber')});
  };

  Template.main.isPlaying = function () {
    return Playlist.isPlaying();
  };

  Template.main.isPaused = function () {
    return !Playlist.isPlaying();
  };

  Template.main.events({
    'click .js-play': function () {
      Playlist.resume();
    },
    'click .js-pause': function () {
      Playlist.pause();
    },
    'click .js-skip': function () {
      Playlist.skip();
    },
    'click .js-owner': function () {
      establishOwner();
    },
  })

  // Start watching for new songs
  var initializeWithNumber = function (number) {
    Session.set('phoneNumber', number);
    window.location.replace('#' + number);
    Playlist.initialize(number);
  }

  Template.main.rendered = function () {

    // Spinner
    $('.page .container').fadeOut(0);
    $('.page .page-box').removeClass('u-initially-hidden');
    var opts = {
      lines: 9, // The number of lines to draw
      length: 0, // The length of each line
      width: 12, // The line thickness
      radius: 11, // The radius of the inner circle
      corners: 1, // Corner roundness (0..1)
      rotate: 0, // The rotation offset
      direction: 1, // 1: clockwise, -1: counterclockwise
      color: '#000', // #rgb or #rrggbb or array of colors
      speed: 2, // Rounds per second
      trail: 31, // Afterglow percentage
      shadow: false, // Whether to render a shadow
      hwaccel: false, // Whether to use hardware acceleration
      className: 'spinner', // The CSS class to assign to the spinner
      zIndex: 2e9, // The z-index (defaults to 2000000000)
      top: '50%', // Top position relative to parent
      left: '50%' // Left position relative to parent
    };
    $('.spinner-box').append((new Spinner(opts).spin()).el);
    var removeSpinnerAndShowPage = function () {
      $('.spinner').fadeOut(1000);
      $('.page .container').fadeIn(1000);
      Meteor.setTimeout(function () {
        $('.spinner').remove();
      }, 1500);
    };

    // Sliders
    new Dragdealer('js-volume-slider', {
      animationCallback: function (x, y) {
        Player.setVolume(x * 100);
      }
    });
    new Dragdealer('js-scrub-slider', {
      callback: function (x, y) {
        Player.seekToFraction(x);
      }
    });
    
    // Load IFrame Player API
    Player.loadAPI();
    
    // Get a phone number
    Meteor.call('getNumber', function (err, res) {
      if (!err) {
        initializeWithNumber(res);
        removeSpinnerAndShowPage();
      }
    });
  };

  // Set the current owner to the value entered in the field
  var establishOwner = function (owner) {
    Users.insert({
      number: standardizeNumber($('.owner-field').val()),
      authorizedFor: Session.get('phoneNumber')
    });
  };
}

if (Meteor.isServer) {

  Meteor.startup(function () {
    Songs.remove();
    Phones.remove();
    Users.remove();
    Playlists.remove();
    var phones = Assets.getText('phones.txt').split('\n');
    for (i in phones) {
      var phone = phones[i];
      if (phone) {
        Phones.insert({
          number: phone,
          accessed: new Date().getTime()
        });
      }
    }
  });

  Meteor.methods({

    // Clears the playlist of the least recently used number, and
    // returns the number.
    getNumber: function () {
      var phone = Phones.find({}, {sort: {'accessed': 1}}).fetch()[0];
      Songs.find({to: phone.number}).map(function (song) {
        return song._id;
      }).forEach(function (songId) {
        Songs.remove(songId);
      });
      Users.find({playlist_id: phone.number}).map(function (user) {
        return user._id;
      }).forEach(function (userId) {
        Users.remove(userId);
      });
      Phones.update(phone._id, {$set: {accessed: new Date().getTime()}});
      return phone.number;
    },

  });
}
