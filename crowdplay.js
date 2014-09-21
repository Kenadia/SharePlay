if (Meteor.isClient) {

  Template.main.number = function () {
    return Session.get('phoneNumber');
  }

  Template.main.queue = function () {
    return Songs.find({playlist_id: Session.get('playlistId')}, {sort: {'add_time': 1}});
  };

  Template.main.nowPlaying = function () {
    return Songs.findOne(Session.get('selectedSong'));
  }

  Template.main.isPlaying = function () {
    return ClientPlaylist.isPlaying();
  };

  Template.main.isPaused = function () {
    return !ClientPlaylist.isPlaying();
  };

  Template.main.songSuggestions = function () {
    var suggestions = Session.get('songSuggestions');
    if (suggestions) {
      return suggestions.map(function (data) {
        return {
          title: data.display,
          artist: data.detail,
          album: data.related.display
        };
      });
    }
  };

  var clearSongSuggestions = function () {
    $('.queryInput').val('');
    Session.set('songSuggestions', null);
  }

  var resetScrub = function () {
    $('#js-scrub-slider .handle').css('left', '0');
  }

  var prevSong = function () {
    ClientPlaylist.prev();
    resetScrub();
  }

  var skipSong = function () {
    ClientPlaylist.skip();
    resetScrub();
  }

  Template.songSuggestion.events({
    'click': function () {
      Songs.insert({
        name: this.title + ' – ' + this.artist,
        playlist_id: Session.get('playlistId'),
        add_time: new Date().getTime(),
      });
      clearSongSuggestions();
    }
  });

  Template.main.events({
    'click .js-prev': function () {
      prevSong();
    },
    'click .js-play': function () {
      ClientPlaylist.resume();
    },
    'click .js-pause': function () {
      ClientPlaylist.pause();
    },
    'click .js-skip': function () {
      skipSong();
    },
    'keypress .js-owner': function (e) {
      if (e.which === 13) {
        addAuthorizedUser();
        $('.add-owner input').blur().val('');
      }
    },
    'keypress .queryInput': function (e) {
      if (e.which === 13) {
        Songs.insert({
          name: $('.queryInput').val(),
          playlist_id: Session.get('playlistId'),
          add_time: new Date().getTime(),
        });
        clearSongSuggestions();
      }
    }
  });

  Template.song.maybe_selected = function () {
    return Session.equals('selectedSong', this._id) ? 'selected' : '';
  };

  Template.song.events({
    'click .delete': function (e) {
      var songId = Session.get('selectedSong');
      if (songId == this._id) {
        skipSong();
      }
      Songs.remove(this._id);
    },
    'click .song-clickable': function () {
      if (!Session.equals('selectedSong', this._id)) {
        ClientPlaylist.startPlaying(this);
      }
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
    var scrubbing;
    Meteor.setTimeout(function () {
      scrubbing = false;
    });
    new Dragdealer('js-scrub-slider', {
      animationCallback: function (x, y) {
        scrubbing = true;
      },
      callback: function (x, y) {
        Player.seekToFraction(x);
        scrubbing = false;
      },
      slide: false
    });
    new Dragdealer('js-volume-slider', {
      animationCallback: function (x, y) {
        Player.setVolume(x * 100);
      },
      slide: false,
      x: 1
    });
    
    // Load IFrame Player API
    Player.loadAPI();
    
    // Get a new playlist object
    var initializeWithPlaylistId = function (playlist_id) {
      Session.set('playlistId', playlist_id);
      ClientPlaylist.initialize(playlist_id);
      removeSpinnerAndShowPage();
      var phoneNumber = Phones.findOne({playlist_id: playlist_id}).number;
      window.location.replace('#' + phoneNumber);
      Session.set('phoneNumber', phoneNumber);
      Songs.find({playlist_id: playlist_id}).observeChanges({
        added: function (id, song) {
          if (song.privileged) {
            var songQuery = Songs.find({playlist_id: Session.get('playlistId')}, {sort: {'add_time': 1}});
            var earliestTime = songQuery.fetch()[0].add_time;
            Songs.update(id, {$set: {add_time: earliestTime - 1}});
          }
          ClientPlaylist.songAdded(song.privileged);
        }
      });
      Playlists.find({_id: playlist_id}).observeChanges({
        changed: function (id, changes) {
          if (changes.action) {
            switch (changes.action) {
              case 'pause':
                ClientPlaylist.pause();
                break;
              case 'play':
                ClientPlaylist.resume();
                break;
              case 'skip':
                skipSong();
                break;
            }
            Playlists.update(id, {$unset: {action: ''}});
          }
        }
      });
    };
    var initialized = false;
    var tryToInitialize = function () {
      var hash = window.location.hash;
      if (hash) {
        var phone = Phones.findOne({number: hash.slice(1)});
        if (phone) {
          var playlist = Playlists.findOne({phone_id: phone._id});
          if (playlist) {
            Phones.update(phone._id, {$set: {
              accessed: new Date().getTime(),
            }});
            initializeWithPlaylistId(playlist._id);
            initialized = true;
          }
        }
      }
      if (!initialized) {
        Meteor.call('newPlaylist', function (err, playlist_id) {
          if (!err) {
            initializeWithPlaylistId(playlist_id);
          }
        });
      }
    };
    if (window.location.hash) {
      var waitForPhonesToInitialize = function () {
        if (Phones.find().count()) {
          tryToInitialize();
        } else {
          Meteor.setTimeout(waitForPhonesToInitialize, 200);
        }
      };
      waitForPhonesToInitialize();
    } else {
      tryToInitialize();
    }

    $('.queryInput')
      .keyup( $.debounce( 500, sendQuery ) )
      .focus(function () {
        $('.songSuggestions').fadeIn(400);
      })
      .blur(function () {
        $('.songSuggestions').fadeOut(400);
      });


    // Repeating playhead update
    var updatePlayhead = function () {
      var fraction = Player.getCurrentFraction();
      if (fraction && !scrubbing) {
        var newLeft = fraction * $('#js-scrub-slider').width();
        $('#js-scrub-slider .handle').css('left', '' + newLeft + 'px');
      }
      Meteor.setTimeout(updatePlayhead, 500);
    };
    updatePlayhead();
  };

  // Set the current owner to the value entered in the field
  var addAuthorizedUser = function () {
    Users.insert({
      number: standardizeNumber($('.add-owner input').val()),
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
