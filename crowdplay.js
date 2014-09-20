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

if (Meteor.isClient) {

  var currentSong;
  var songQuery;
  Session.set('isPlaying', false);

  Template.main.number = function () {
    return Session.get('phoneNumber');
  }

  Template.main.queue = function () {
    return Songs.find({to: Session.get('phoneNumber')});
  };

  Template.main.isPlaying = function () {
    return Session.get('isPlaying');
  };

  Template.main.isPaused = function () {
    return !Session.get('isPlaying');
  };

  Template.main.events({
    'click .js-play': function () {
      resumeSong();
    },
    'click .js-pause': function () {
      pauseSong();
    },
    'click .js-skip': function () {
      skipSong();
    },
    'click .js-owner': function () {
      establishOwner();
    }
  })

  // Start watching for new songs
  var initializeWithNumber = function (number) {
    Session.set('phoneNumber', number);
    window.location.replace('#' + number);
    console.log('#' + number);
    songQuery = Songs.find({to: number});
    songQuery.observeChanges({
      added: function (id, song) {
        if (!currentSong) {
          playSong();
        }
      }
    });
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
    
    // Load IFrame Player API
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    // Get a phone number
    Meteor.call('getNumber', function (err, res) {
      if (!err) {
        initializeWithNumber(res);
        removeSpinnerAndShowPage();
      }
    });
  };

  // Initialize YouTube player
  var player;
  var playerReady = false;
  onYouTubeIframeAPIReady = function () {
    player = new YT.Player('youtube', {
      height: '200',
      width: '200',
      videoId: '62E1MdaXcco',
      events: {
        // 'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
  }

  // Play the next song when the video ends
  var onPlayerStateChange = function (e) {
    if (e.data == 0) {
      songEnded();
      playSong();
    }
  };

  // Remove the song at the top of the playlist
  var songEnded = function () {
    var topSong = songQuery.fetch()[0];
    if (topSong) {
      Songs.remove(topSong._id);
      Session.set('isPlaying', false);
    }
  };

  // Load and play the song at the top of the playlist
  var playSong = function () {
    currentSong = songQuery.fetch()[0];
    if (currentSong) {
      playTopSearchResult(currentSong.name);
      Session.set('isPlaying', true);
    }
  };

  // Resume the song at the top of the playlist
  var resumeSong = function () {
    currentSong = songQuery.fetch()[0];
    if (currentSong) {
      player.playVideo();
      Session.set('isPlaying', true);
    }
  };

  // Pause the current song
  var pauseSong = function () {
    currentSong = songQuery.fetch()[0];
    if (currentSong) {
      player.pauseVideo();
      Session.set('isPlaying', false);
    }
  };

  // Skip the current song
  var skipSong = function () {
    pauseSong();
    songEnded();
    playSong();
  };

  // Set the current owner to the value entered in the field
  var establishOwner = function (owner) {
    Session.set('owner', '+1' + $('.owner-field').val());
  }
  
  var playTopSearchResult = function (keyword) {
    if (!player || !player.loadVideoById) {
      Meteor.setTimeout(function () {
        playTopSearchResult(keyword);
      }, 1000);
    }
    var searchURI = 'http://gdata.youtube.com/feeds/api/videos?q=' +
                    encodeURIComponent(keyword) +
                    '&format=5&max-results=1&v=2&alt=jsonc';
    $.ajax({
      type: "GET",
      url: searchURI,
      dataType: "jsonp",
      success: function(responseData, textStatus, XMLHttpRequest) {
        if (responseData.data.items) {
          var video = responseData.data.items[0];
          player.loadVideoById(video.id, 0, 'small');
        }
      }
    });
  };

}

if (Meteor.isServer) {

  Meteor.startup(function () {
    Songs.remove({});
    Phones.remove({});
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
      Phones.update(phone._id, {$set: {accessed: new Date().getTime()}});
      return phone.number;
    },

  });
}
