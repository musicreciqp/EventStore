\copy (select * from pandora_events where event in ('Skip', 'Thumb Up Added', 'Thumb Up Deleted', 'Thumb Down Added', 'Thumb Down Deleted', 'Station Select') order by id) to ~/Desktop/EventStore/pandora_exclusive.csv DELIMITER ',' CSV HEADER;
