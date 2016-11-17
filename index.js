var express = require('express');
var bodyParser = require('body-parser');
var cheerio = require('cheerio');
var pg = require('pg'); 
var request = require('request');
var app = express();
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.set('port', (process.env.PORT || 5858));

function getStudyEmail(id) {
	 var str = 'muiqp';
	 if (id < 10) str += 0;
	 str += id + '@hmamail.com'
	 return str;
}

function getLastFmUrl(id) {
	var str = 'http://last.fm/user/muiqp';
	if (id < 10) str += '0';
	return str + id;
}

function getPandoraUrl(id) {
	var str = "https://www.pandora.com/profile/muiqp";
	if (id < 10) str += '0';
	return str + id;
}

var allowedPandoraEmails = ["testacc@mailinator.com"];
for (var i = 0; i < 20; i++) allowedPandoraEmails.push(getStudyEmail(i));

function postgresQuoteEscape(str) {
	return str.replace(/'/g, "''");
}

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
app.get('/', function(request, res) { res.render('pages/index'); });
app.listen(app.get('port'), function() { console.log('Node app is running on port', app.get('port')) });

app.post('/pandora-event', function(request, res) {
	var username = postgresQuoteEscape(request.body.username);
	if (allowedPandoraEmails.indexOf(username) === -1) {
		res.send("Email Not Permitted");
		return
	}
	var sql = "INSERT into pandora_events (event, username, stationId, stationName, songName, songHref, shuffleEnabled, date) values ('" + request.body.event + "', '" + username + "', '" + request.body.stationId + "', '" +
			postgresQuoteEscape(request.body.stationName) + "', '" + postgresQuoteEscape(request.body.songName) + "', '" + postgresQuoteEscape(request.body.songHref) + "', " + request.body.shuffleEnabled + ", '" + new Date().toISOString() + "')";
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function (err, result) {
				done();
				if (err) {console.log(err); res.send("Error " + err);}
				else {res.send("Pandora Event Added");}
			});
	});
});

app.post('/tunein-events', function(req, res) {
	var sql = "insert into tunein_events (href, count, userId, date) values ('" + postgresQuoteEscape(req.body.href) + "', " +  req.body.timeCount +
	 ", " + req.body.userId + ", '" + new Date().toISOString() + "')";
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	client.query(sql, function (err, result) {
			done();
			if (err) {console.log(err); res.send("Error " + err);}
			else {res.send("Tunein Event Added");}
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
      		row.date.setHours(row.date.getHours() - 5);
      		return row;
      	});
      	res.render('pages/pandora_events', {results: adjustedRows} );
      } 
		 });
  });
});

app.get('/tunein_events', function(request, res) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM tunein_events', function(err, result) {
      done();
      if (err) { console.error(err); res.send("Error " + err); }
      else {
      	var adjustedRows = result.rows.map(function(row) {
      		row.date = new Date(row.date);
      		row.date.setHours(row.date.getHours() - 5);
      		return row;
      	});
      	res.render('pages/tunein_events', {results: adjustedRows} );
      } 
		 });
  });
});

app.post('/tunein/discovery', function(req, res) {
	var userId = req.body.userId;
	var href = req.body.href;
	var date = new Date().toISOString();
	if (userId === undefined || !href || ! date) {
		res.send("Invalid Input");
		return;
	}
	href = postgresQuoteEscape(href);
	var sql = "insert into tunein_discovery (userId, href, date) values (" + userId + ", '" + href + "', '" + date + "')";
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	client.query(sql, function (err, result) {
			done();
			if (err) {console.log(err); res.send("Error " + err);}
			else {res.send("Tunein Discovery Added");}
		});
	});
});

app.get('/tunein/discovery', function(req, res) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM tunein_discovery', function(err, result) {
      done();
      if (err) { console.error(err); res.send("Error " + err); }
      else {
      	var adjustedRows = result.rows.map(function(row) {
      		row.date = new Date(row.date);
      		row.date.setHours(row.date.getHours() - 5);
      		return row;
      	});
      	res.render('pages/tunein_discovery', {results: adjustedRows} );
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

app.post('/users', function(req, res) {
	var id = req.body.id;
	var wpiEmail = req.body.wpiEmail;
	var name = req.body.name;
	if (!(id && name && wpiEmail)) {
		res.send("Need ID, Name and WPI Email");
		return;
	}
	var sql = "insert into users (id, name, wpiemail) values (" + id + ", '" + postgresQuoteEscape(name) + "', '" + postgresQuoteEscape(wpiEmail) + "')";
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function(err, result) {
			done();
			if (err) {
				if (err.toString().indexOf("duplicate key") !== -1) res.send("ID " + id + " Already Registered");
				else res.send("SQL Error: " + err);
			}
			else res.send(name + ' added');
		});
	});
});

app.get('/users', function(req, res) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query("select * from users order by id", function(err, result) {
			done(); 
			if (err) {
				res.send(err);
				return;
			}
			res.render('pages/users', {users: result.rows});
		});
	});
});

app.get('/users/:id', function(req, res) {
	var id = req.params.id;
	if (!id) {
		res.send("Need ID");
		return;
	}
	else if (isNaN(id)) {
		res.send("Invalid ID: " + id);
		return;
	}
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var sql = "select * from users where id = " + id;
		client.query(sql, function(err, result) {
			done();
			if (err) {
				res.send(err);
				return;
			}
			if (result.rows[0])
				res.render('pages/user', {
					user : result.rows[0], 
					lastfm: getLastFmUrl(Number(id)),
					pandora: getPandoraUrl(Number(id))
				});
			else res.render('pages/user', {
				user : {
					id: -1, 
					name: "YIKES NO USER"
				},
				lastfm: '',
				pandora: ''
			});
		});
	});
});

app.get('/users/:id/pandora', function(req, res) {
	var username = getStudyEmail(req.params.id);
	var sql = "select * from pandora_events where username like '" + username + "'";
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function(err, result) {
			done();
			if (err) {
				res.send(err);
				return;
			}
			res.render('partials/pandora_user', {results:result.rows});
		});
	});
});

app.get('/users/:id/tunein', function(req, res) {
	var sql = "select * from tunein_events where userid = " + req.params.id;	
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function(err, result) {
			done();
			if (err) {
				res.send(err);
				return;
			}
			res.render('partials/tunein_user', {results:result.rows});
		});
	});
});

app.get('/users/:id/tunein/discovery', function(req, res) {
	var sql = "select * from tunein_discovery where userid = " + req.params.id;	
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function(err, result) {
			done();
			if (err) {
				res.send(err);
				return;
			}
			res.render('partials/tunein_discover_user', {results:result.rows});
		});
	});
});