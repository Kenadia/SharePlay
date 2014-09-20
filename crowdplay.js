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

  var currentSong;
  var songQuery = Songs.find({});

  Template.main.queue = function () {
    return songQuery;
  };

  songQuery.observeChanges({
    added: function (id, song) {
      if (currentSong != song.name) {
        currentSong = song.name;
        playTopSearchResult(currentSong);
      }
    }
  });

  Template.main.rendered = function () {
    // Load IFrame Player API
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
        // 'onStateChange': onPlayerStateChange
      }
    });
  }
  
  var playTopSearchResult = function (keyword) {
    console.log('play top ' + keyword);
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
  Songs.remove({});
}