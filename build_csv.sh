#!/bin/bash
rm -rf ./csv
mkdir csv
cat sql/csv_rip.sql | heroku pg:psql
rm csv.zip 
zip -r csv.zip csv
