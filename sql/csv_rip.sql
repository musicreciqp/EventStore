\copy (select * from users) to ~/Desktop/iqp/event_store/csv/users.csv DELIMITER ',' CSV HEADER;
\copy (select * from pandora_events) to ~/Desktop/iqp/event_store/csv/pandora_events.csv DELIMITER ',' CSV HEADER;
\copy (select * from tunein_discovery) to ~/Desktop/iqp/event_store/csv/tunein_discoveries.csv DELIMITER ',' CSV HEADER;
\copy (select * from tunein_events) to ~/Desktop/iqp/event_store/csv/tunein_events.csv DELIMITER ',' CSV HEADER;
