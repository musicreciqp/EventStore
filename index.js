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

function postgresQuoteEscape(str) { return str.replace(/'/g, "''"); }

var session = require('express-session');
app.use(session({secret: 'ssshhhhh'}));


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

var mySession;
app.get('/', function(req, res) { 
	mySession = req.session;
	if (mySession.username) res.render('pages/index'); 
	else res.redirect('/account');
});

app.post('/login', function(req, res) {
	var username = postgresQuoteEscape(req.body.username);
	var hash = req.body.hash;
	var sql = "select * from staff where username = '" + username + "'";
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query(sql, function(err, result) {
      done();
      if (err) { 
      	console.error(err);
      	res.end("Error: " + err); 
      	return;
      }
      if (!result.rows.length || result.rows[0].hash !== hash) {
      	res.end("Invalid Login");
      	return;
      }
			mySession = req.session;
			mySession.username = req.body.username;
			res.end('done');
		});
  });
});

app.get('/logout', function(req, res) {
	req.session.destroy(function(err) {
		if (err) {console.log(err);}
		else res.redirect('/account');
	})
});
app.listen(app.get('port'), function() { console.log('Node app is running on port', app.get('port')) });
app.get('/account', function(req, res) { res.render('pages/account'); });

app.post('/pandora-event', function(request, res) {
	var username = postgresQuoteEscape(request.body.username);
	if (allowedPandoraEmails.indexOf(username) === -1) {
		res.send("Email Not Permitted");
		return
	}
	var sql = "INSERT into pandora_events (event, username, stationId, stationName, songName, songHref, shuffleEnabled, date) values ('" + request.body.event + "', '" + username + "', '" + request.body.stationId + "', '" +
			postgresQuoteEscape(request.body.stationName) + "', '" + postgresQuoteEscape(request.body.songName) + "', '" + postgresQuoteEscape(request.body.songHref) + "', " + request.body.shuffleEnabled + ", '" + new Date().toISOString() + "')";
	res.send("Data Collection is Disabled");
	// pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	// 	client.query(sql, function (err, result) {
	// 			done();
	// 			if (err) {console.log(err); res.send("Error " + err);}
	// 			else {res.send("Pandora Event Added");}
	// 		});
	// });
});

app.post('/pandora/create', function(req, res) {
	var username = req.body.username;
	var event = 'Station Create';
	var stationName = postgresQuoteEscape(req.body.stationName);
	var stationId = req.body.stationId;
	var daysAgo = Number(req.body.daysAgo) + 1; // for date sorting put create events behind other events
	var date = new Date();
	date.setDate(date.getDate() - daysAgo);
	console.log(username, event, stationName, stationId, daysAgo, date);
	var sql = "insert into pandora_events (event, username, stationId, stationName, songName, songHref, shuffleEnabled, date) values('";
	sql += event +"', '" + username + "', '" + stationId + "', '" + stationName + "', '', '', 'false', '" + date.toISOString() + "')";
	console.log(sql);
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function(err, result) {
			done();
			if (err) res.send("Error " + err);
			else res.send("Pandora Event Added");
		});
	});
});

app.post('/tunein-events', function(req, res) {
	var sql = "insert into tunein_events (href, count, userId, date) values ('" + postgresQuoteEscape(req.body.href) + "', " +  req.body.timeCount +
	 ", " + req.body.userId + ", '" + new Date().toISOString() + "')";
	res.send("Data Collection is Disabled");
	// pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	// client.query(sql, function (err, result) {
	// 		done();
	// 		if (err) {console.log(err); res.send("Error " + err);}
	// 		else {res.send("Tunein Event Added");}
	// 	});
	// });
});

app.get('/pandora_events', function(request, res) {
	mySession = request.session;
	if (!mySession.username) {
		res.redirect('/account');
		return;
	}
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM pandora_events', function(err, result) {
      done();
      if (err) { console.error(err); res.send("Error " + err); }
      else {
      	var adjustedRows = result.rows.map(function(row) {
      		row.date = new Date(row.date);
      		return row;
      	});
      	res.render('pages/pandora_events', {results: adjustedRows} );
      } 
		 });
  });
});

app.get('/tunein_events', function(request, res) {
	mySession = request.session;
	if (!mySession.username) {
		res.redirect('/account');
		return;
	}
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM tunein_events', function(err, result) {
      done();
      if (err) { console.error(err); res.send("Error " + err); }
      else {
      	var adjustedRows = result.rows.map(function(row) {
      		row.date = new Date(row.date);
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
	res.send("Data Collection is Disabled");
	// pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	// client.query(sql, function (err, result) {
	// 		done();
	// 		if (err) {console.log(err); res.send("Error " + err);}
	// 		else {res.send("Tunein Discovery Added");}
	// 	});
	// });
});

app.get('/tunein/discovery', function(req, res) {
	mySession = req.session;
	if (!mySession.username) {
		res.redirect('/account');
		return;
	}
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM tunein_discovery', function(err, result) {
      done();
      if (err) { console.error(err); res.send("Error " + err); }
      else {
      	var adjustedRows = result.rows.map(function(row) {
      		row.date = new Date(row.date);
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
	mySession = req.session;
	if (!mySession.username) {
		res.redirect('/account');
		return;
	}
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query("select * from users order by id", function(err, result) {
			done(); 
			if (err) {
				res.send(err);
				return;
			}
			var adjustedRows = result.rows.map(function(row, index) {
				row.previous = index > 0 ? index - 1 : null;
				row.next = index + 1 === result.rows.length ? null : index + 1;
				return row;
			});
			res.render('pages/users', {users: result.rows});
		});
	});
});

app.get('/users/:id', function(req, res) {
	mySession = req.session;
	if (!mySession.username) {
		res.redirect('/account');
		return;
	}
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
					id: Number(id), 
					name: "YIKES NO USER"
				},
				lastfm: '',
				pandora: ''
			});
		});
	});
});

app.get('/users/:id/pandora', function(req, res) {
	mySession = req.session;
	if (!mySession.username) {
		res.redirect('/account');
		return;
	}
	var username = getStudyEmail(req.params.id);
	var sql = "select * from pandora_events where username like '" + username + "'";
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function(err, result) {
			done();
			if (err) {
				res.send(err);
				return;
			}
			var adjustedRows = result.rows.map(function(row) {
      		row.date = new Date(row.date);
      		return row;
      });
			res.render('partials/pandora_user', {results:adjustedRows});
		});
	});
});

app.get('/users/:id/tunein', function(req, res) {
	mySession = req.session;
	if (!mySession.username) {
		res.redirect('/account');
		return;
	}
	var sql = "select * from tunein_events where userid = " + req.params.id;	
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function(err, result) {
			done();
			if (err) {
				res.send(err);
				return;
			}
			var adjustedRows = result.rows.map(function(row) {
      		row.date = new Date(row.date);
      		return row;
      });
			res.render('partials/tunein_user', {results:adjustedRows});
		});
	});
});

app.get('/users/:id/tunein/discovery', function(req, res) {
	mySession = req.session;
	if (!mySession.username) {
		res.redirect('/account');
		return;
	}
	var sql = "select * from tunein_discovery where userid = " + req.params.id;	
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function(err, result) {
			done();
			if (err) {
				res.send(err);
				return;
			}
			var adjustedRows = result.rows.map(function(row) {
      		row.date = new Date(row.date);
      		return row;
      });
			res.render('partials/tunein_discover_user', {results:adjustedRows});
		});
	});
});

app.get('/statistics/unique_tunein_stations', function(req, res) {
	mySession = req.session;
	if (!mySession.username) {
		res.redirect('/account');
		return;
	}
	var sql = "select userid, count(distinct href) from tunein_events where href<>'http://tunein.com/radio/local/' and href<>'https://beta.tunein.com/radio/local/' and userid < 100 group by userid;";
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function(err, result) {
			done();
			if (err) {
				res.send(err);
				return;
			}
			var avg = 0;
			for (var i = 0; i < result.rows.length; i++) avg += Number(result.rows[i].count);
			avg /= result.rows.length;
			res.render('pages/tunein_stations_stat', {
				results: result.rows,
				average: avg
			});
		});
	});
});

app.get('/statistics/unique_pandora_station_creates', function(req, res) {
	mySession = req.session;
	if (!mySession.username) {
		res.redirect('/account');
		return;
	}
	var sql = "select username, count(distinct stationId) from pandora_events where event = 'Station Create' group by username;";
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		client.query(sql, function(err, result) {
			done();
			if (err) {
				res.send(err);
				return;
			}
			var avg = 0;
			for (var i = 0; i < result.rows.length; i++) avg += Number(result.rows[i].count);
			avg /= result.rows.length;
			res.render('pages/pandora_create_stat', {
				results: result.rows.map(function(row) {
					row.userid = row.username.substring('muiqp'.length).substring(0,2);
					return row;
				}),
				average: avg
			});
		});
	});
});
