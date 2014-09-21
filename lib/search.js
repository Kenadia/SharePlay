sendQuery = function () {
	var query = $('.queryInput').val().split(' ').join('+');
    $.get('https://partner.api.beatsmusic.com/v1/api/search?q=' + query + '&type=track&client_id=g4kzwgrmksrnupgzf2cyg8g5&limit=5', function (result) {
      Session.set('songSuggestions', result.data);
    });
};
