select userid, count(distinct href) from tunein_events where href<>'http://tunein.com/radio/local/' and href<>'https://beta.tunein.com/radio/local/' and userid < 100 group by userid;

