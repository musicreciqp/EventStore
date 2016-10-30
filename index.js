var cool = require('cool-ascii-faces');
var express = require('express');
var bodyParser = require('body-parser')
var pg = require('pg'); 
var app = express();
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.set('port', (process.env.PORT || 5000));

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

app.get('/', function(request, response) {
  response.render('pages/index');
});


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.post('/pandora-event', function(request, response) {
	var sql = "INSERT into pandora_events (event, username, stationId, stationName, songName, songHref, shuffleEnabled, date) values ('" +request.body.event + "', '" + request.body.username + "', '" + request.body.stationId + "', '" +
			request.body.stationName + "', '" + request.body.songName + "', '" + request.body.songHref + "', " + request.body.shuffleEnabled + ", '" + request.body.date + "')";
	console.log("SQL: " + sql);
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function (err, result) {
				done();
				if (err) {console.log(err); response.send("Error " + err);}
				else {response.send("Song Added " + cool());}
			});
	});
});

app.get('/pandora_events', function(request, res) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM pandora_events', function(err, result) {
      done();
      if (err)
       { console.error(err); res.send("Error " + err); }
      else
		       {res.render('pages/db', {results: result.rows} ); } 
		 });
  });
});
