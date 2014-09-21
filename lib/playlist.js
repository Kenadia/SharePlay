if (Meteor.isClient) {

  var songQuery;

  ClientPlaylist = {

    initialize: function (playlist_id) {
      songQuery = Songs.find({playlist_id: playlist_id}, {sort: {'add_time': 1}});
    },

    isPlaying: function () {
      return Session.get('isPlaying');
    },
    
    play: function () {
      if (!Session.get('selectedSong')) {
        self.startPlaying(songQuery.fetch()[0]);
      }
    },

    resume: function () {
      if (Session.get('selectedSong')) {
        Player.play();
        Session.set('isPlaying', true);
      }
    },

    pause: function () {
      if (Session.get('selectedSong')) {
        Player.pause();
        Session.set('isPlaying', false);
      }
    },

    prev: function () {
      var songId = Session.get('selectedSong');
      if (songId) {
        self.pause();
        var songIds = songQuery.map(function (song) {return song._id});
        var selectedIndex = songIds.indexOf(songId);
        if (selectedIndex != 0) {
          selectedIndex--;
        }
        self.startPlaying(Songs.findOne(songIds[selectedIndex]));
      }
    },

    skip: function () {
      var songId = Session.get('selectedSong');
      if (songId) {
        self.pause();
        var songIds = songQuery.map(function (song) {return song._id});
        var selectedIndex = songIds.indexOf(songId);
        selectedIndex++;
        if (selectedIndex < songIds.length) {
          self.startPlaying(Songs.findOne(songIds[selectedIndex]));
        } else {
          Session.set('selectedSong', null);
          Songs.update(songId, {$set: {isBeingListenedTo: false}});
        }
      }
    },

    songAdded: function (privileged) {
      if (privileged) {
        self.startPlaying(songQuery.fetch()[0]);
      } else if (songQuery.count() == 1) {
        self.play();
      }
    },

    songEnded: function () {
      self.skip();
    },

    startPlaying: function (song) {
      var oldSongId = Session.get('selectedSong');
      if (oldSongId) {
        Songs.update(oldSongId, {$set: {isBeingListenedTo: false}});
      }
      Player.loadTopSearchResult(song.name);
      Session.set('selectedSong', song._id);
      Songs.update(song._id, {$set: {isBeingListenedTo: true}});
      Session.set('isPlaying', true);
    }

  }
  var self = ClientPlaylist;

}
