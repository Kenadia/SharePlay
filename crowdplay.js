if (Meteor.isClient) {

  Template.main.number = function () {
    return Session.get('phoneNumber');
  }

  Template.main.queue = function () {
    return Songs.find({playlist_id: Session.get('playlistId')});
  };

  Template.main.isPlaying = function () {
    return ClientPlaylist.isPlaying();
  };

  Template.main.isPaused = function () {
    return !ClientPlaylist.isPlaying();
  };

  Template.main.events({
    'click .js-prev': function () {
      ClientPlaylist.prev();
    },
    'click .js-play': function () {
      ClientPlaylist.resume();
    },
    'click .js-pause': function () {
      ClientPlaylist.pause();
    },
    'click .js-skip': function () {
      ClientPlaylist.skip();
    },
    'click .js-owner': function () {
      addAuthorizedUser();
    },
  });

  Template.song.maybe_selected = function () {
    return Session.equals('selectedSong', this._id) ? 'selected' : '';
  };

  Template.song.events({
    'click': function () {
      ClientPlaylist.startPlaying(this);
    }
  });

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
      },
      slide: false
    });
    new Dragdealer('js-scrub-slider', {
      callback: function (x, y) {
        Player.seekToFraction(x);
      },
      slide: false
    });
    
    // Load IFrame Player API
    Player.loadAPI();
    
    // Get a new playlist object
    Meteor.call('newPlaylist', function (err, playlist_id) {
      if (!err) {
        Session.set('playlistId', playlist_id);
        ClientPlaylist.initialize(playlist_id);
        removeSpinnerAndShowPage();
        var phoneNumber = Phones.findOne({playlist_id: playlist_id}).number;
        window.location.replace('#' + phoneNumber);
        Session.set('phoneNumber', phoneNumber);
        Songs.find({playlist_id: playlist_id}).observeChanges({
          added: function (id, song) {
            ClientPlaylist.songAdded();
          }
        });
      }
    });

    $('.queryInput').keyup( $.debounce( 250, sendQuery ) );
    // Repeating playhead update
    var updatePlayhead = function () {
      var fraction = Player.getCurrentFraction();
      if (fraction) {
        var newLeft = fraction * $('#js-scrub-slider').width();
        $('#js-scrub-slider .handle').css('left', '' + newLeft + 'px');
      }
      Meteor.setTimeout(updatePlayhead, 500);
    };
    updatePlayhead();
  };

  // Set the current owner to the value entered in the field
  var addAuthorizedUser = function (owner) {
    Users.insert({
      number: standardizeNumber($('.owner-field').val()),
      playlist_id: Session.get('playlistId')
    });
  };
}

if (Meteor.isServer) {

  Meteor.startup(function () {
    Songs.remove({});
    Phones.remove({});
    Users.remove({});
    Playlists.remove({});
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
    newPlaylist: function () {
      var phone = Phones.find({}, {sort: {'accessed': 1}}).fetch()[0];
      var overwrittenPlaylist = Playlists.findOne({phone_id: phone._id});
      if (overwrittenPlaylist) {
        Songs.remove({playlist_id: overwrittenPlaylist._id});
        Users.remove({playlist_id: overwrittenPlaylist._id});
      }
      var playlistId = Playlists.insert({phone_id: phone._id});
      Phones.update(phone._id, {$set: {
        accessed: new Date().getTime(),
        playlist_id: playlistId
      }});
      return playlistId;
    },

  });
}
