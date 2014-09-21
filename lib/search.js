sendQuery = function () {
	console.log("senQuery called");
	var query = $('.queryInput').val();
	$.get( "https://partner.api.beatsmusic.com/v1/api/search/predictive", {q: query, client_id: G4KZWGRM }, function (response) {
		console.log(response);
	});
};
