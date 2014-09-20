var songQuery;
var currentSong;
var poll = function () {
  currentSong = songQuery.fetch()[0];
  return !!currentSong;
}

Playlist = {

  isPlaying: function () {
    return Session.get('isPlaying');
  },
  
  play: function () {
    if (poll()) {
      Player.loadTopSearchResult(currentSong.name);
      Session.set('isPlaying', true);
    }
  },

  resume: function () {
    if (poll()) {
      Player.play();
      Session.set('isPlaying', true);
    }
  },

  pause: function () {
    if (poll()) {
      Player.pause();
      Session.set('isPlaying', false);
    }
  },

  skip: function () {
    self.pause();
    self.songEnded();
  },

  initialize: function (number) {
    songQuery = Songs.find({to: number});
    songQuery.observeChanges({
      added: function (id, song) {
        if (!currentSong) {
          self.play();
        }
      }
    });
  },

  songEnded: function () {
    if (poll()) {
      Songs.remove(currentSong._id);
      Session.set('isPlaying', false);
      self.play();
    }
  }
}
var self = Playlist;
