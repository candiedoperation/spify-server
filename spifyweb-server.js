/*
    Spify - Cross Platform Classroom Monitoring
    Copyright (C) 2023  Atheesh Thirumalairajan

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const fs = require("fs");
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { corsOrigin } = require('./middleware/SpifySaltMiddleware');
const { SpifyDatabaseMiddleware } = require('./middleware/SpifyDatabaseMiddleware');
const SpifyConfigVerify = require('./middleware/SpifyConfigVerify');

/* Initialize Express */
let server;
const app = express();
const http = require('http');
const https = require('https');
const { WebSocketServer } = require('ws');
const SpifyDaemonDriver = require('./middleware/SpifyDaemonDriver');

if (process.env.HTTPS == "true") {
  let credentials = { 
    key: fs.readFileSync('ssl/key.pem', 'utf8'), 
    cert: fs.readFileSync('ssl/cert.pem', 'utf8') 
  };

  server = https.createServer(credentials, app);
} else {
  /* Set Server to HTTP */
  server = http.createServer(app);
}

/* Define Websocket Server for RFB Proxies */
const wss = new WebSocketServer({ server });

app.use(cookieParser());
app.use(cors({
  origin: ((origin, next) => {
    if (corsOrigin.indexOf(origin) > -1 || corsOrigin.indexOf("*") > -1) {
      next(null, true);
    } else {
      next(new Error('Invalid Prod/ProdX CORS Origin'))
    }
  }),
  credentials: true,
}));

app.use(bodyParser.json({
  limit: '10mb'
}));

app.use(bodyParser.urlencoded({
  extended: true,
  limit: "10mb",
}));

app.get('/api', (req, res) => {
  res.send('<h1>Spify Web Server is listening to API requests!</h1>');
});

server.listen(3001, () => {
    let spify_config = SpifyConfigVerify(true);
    if (spify_config == false) {
        console.log("Server Configuration Invalid");
        process.exit(0);
    } else {
        // Initialize Middleware
        SpifyDatabaseMiddleware(app, spify_config);
        SpifyDaemonDriver(app, wss);

        /* Serving the Public Folder */
        app.use(express.static(__dirname + '/public'));
        app.get('*', (req,res) => res.sendFile(__dirname+'/public/index.html'))
    }
});