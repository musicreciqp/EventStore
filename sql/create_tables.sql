create table if not exists pandora_events (id SERIAL, event text, username text, stationId text, stationName text, songName text, songHref text, shuffleEnabled boolean, date timestamp);
create table if not exists tunein_events (id SERIAL, href text, count integer, userId integer, date timestamp);
create table if not exists users (id integer primary key, name text, wpiEmail text);