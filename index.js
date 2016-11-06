var express = require('express');
var bodyParser = require('body-parser');
var cheerio = require('cheerio');
var pg = require('pg'); 
var request = require('request');
var app = express();
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.set('port', (process.env.PORT || 5858));

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
	res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
  next();
});
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.get('/', function(request, response) { response.render('pages/index'); });
app.listen(app.get('port'), function() { console.log('Node app is running on port', app.get('port')) });

app.post('/pandora-event', function(request, response) {
	var sql = "INSERT into pandora_events (event, username, stationId, stationName, songName, songHref, shuffleEnabled, date) values ('" +request.body.event + "', '" + request.body.username + "', '" + request.body.stationId + "', '" +
			request.body.stationName + "', '" + request.body.songName + "', '" + request.body.songHref + "', " + request.body.shuffleEnabled + ", '" + request.body.date + "')";
	// console.log("SQL: " + sql);
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function (err, result) {
				done();
				if (err) {console.log(err); response.send("Error " + err);}
				else {response.send("Song Added ");}
			});
	});
});

app.get('/pandora_events', function(request, res) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM pandora_events', function(err, result) {
      done();
      if (err) { console.error(err); res.send("Error " + err); }
      else {
      	var adjustedRows = result.rows.map(function(row) {
      		row.date = new Date(row.date);
      		row.date.setHours(row.date.getHours() - 4);
      		return row;
      	});
      	res.render('pages/pandora_events', {results: adjustedRows} );
      } 
		 });
  });
});

app.get('/pandora_scrape', function(req, res) {
	var href = req.param('href');
	var errorMsg = function() {res.send("No Song For Event");};
	if (!href) errorMsg();
	request(href, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	  	var $ = cheerio.load(body);
	  	var resp = $('.song_features').html() + '<br/>' + $('.similar_songs').html();
	    res.send(resp);
	  }
	  else errorMsg();
	});
});


app.get('/users', function(req, res) {
	var users = ["testacc1"];
	res.render('pages/users', {users: users});
});

app.get('/users/:id', function(req, res) {
	res.render('pages/user', {user: req.params.id});
});

app.get('/users/:id/scrape', function(req, res) {
	var si = 0;
	var payload = "";
	var endMsg = 'No more posts available';
	var makeRequest = function() {
		var href = 'https://www.pandora.com/content/newsfeed?si=' + si  + '&webname=' + req.params.id + '&followingCount=0&only_own=true';
		console.log("href", href);
		request(href, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				console.log("here");
				// console.log(body);
				var $ = cheerio.load(body);
				var section = $(".section");
				console.log(section.length);
				$('.section').each(function(index, element) {
					payload += $(this).html(); + '<br/>';
				});
				if (body.indexOf(endMsg) !== -1) {
					si += 20;
					makeRequest();
				}
				else {
					console.log("final payload:\t" + payload);
					res.send(payload);
				}
			}
		});
	};
	makeRequest();
});


