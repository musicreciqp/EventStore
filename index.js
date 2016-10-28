var cool = require('cool-ascii-faces');
var express = require('express');
var bodyParser = require('body-parser')
var pg = require('pg'); 
var app = express();
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.set('port', (process.env.PORT || 5000));

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
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


app.get('/db', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM test_table', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.render('pages/db', {results: result.rows} ); }
    });
  });
});

app.post('/pandora-event', function(request, response) {
	console.log(request);
	console.log(request.body.username);
	console.log(request.body.event);
	console.log(request.body.shuffleEnabled);
	console.log(request.body.date);
	console.log(request.body.stationId);
	console.log(request.body.songName);
	console.log(request.body.songHref);
	response.send(cool()); // test view console.
});

app.get('/db_add', function(request, response) {
	var num = request.param('num');
	var msg = request.param('msg');
	console.log(num, msg);
	if (num && msg) {
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			client.query("INSERT into test_table values(" + num + ", '" + msg + "')", function(err, result) {
				done();
				if (err)
	       { console.error(err); response.send("Error " + err); }
	     else 
	     		{response.send(cool());}
			});
		});
	}
});