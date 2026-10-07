#!/bin/sh
set -e
cd /app

runuser -u www-data -- node --env-file=.env db/init.js

runuser -u www-data -- node --env-file=.env server.js &

exec apachectl -D FOREGROUND
