var handleSms = function (request, response) {
  if (request.body.Body) {
    Songs.insert({name: request.body.Body});
    var xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Sms>Thanks for your song request!</Sms></Response>';
    response.writeHead(200, {'Content-Type': 'text/xml'});
    response.end(xml);
  }
};

if (Meteor.isClient) {

  var currentSong;
  var songQuery = Songs.find({});
  Session.set('isPlaying', false);

  Template.main.queue = function () {
    return songQuery;
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
    }
  })

  songQuery.observeChanges({
    added: function (id, song) {
      if (!currentSong) {
        playSong();
      }
    }
  });

  // Load IFrame Player API
  Template.main.rendered = function () {
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
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
    var topSong = Songs.findOne()
    if (topSong) {
      Songs.remove(topSong._id);
      Session.set('isPlaying', false);
    }
  };

  // Load and play the song at the top of the playlist
  var playSong = function () {
    currentSong = Songs.findOne();
    if (currentSong) {
      playTopSearchResult(currentSong.name);
      Session.set('isPlaying', true);
    }
  };

  // Resume the song at the top of the playlist
  var resumeSong = function () {
    currentSong = Songs.findOne();
    if (currentSong) {
      player.playVideo();
      Session.set('isPlaying', true);
    }
  };

  // Pause the current song
  var pauseSong = function () {
    currentSong = Songs.findOne();
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
    },

  });
}
