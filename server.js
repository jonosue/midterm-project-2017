"use strict";

require('dotenv').config();

const PORT        = process.env.PORT || 8080;
const ENV         = process.env.ENV || "development";
const express     = require("express");
const bodyParser  = require("body-parser");
const sass        = require("node-sass-middleware");
const app         = express();
const knexConfig  = require("./knexfile");
const knex        = require("knex")(knexConfig[ENV]);
const morgan      = require('morgan');
const knexLogger  = require('knex-logger');
const cookieSession = require('cookie-session');

// Seperated Routes for each Resource
const usersRoutes = require("./routes/users");

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));
app.use(cookieSession({
  name: 'session',
  secret: 'hello-world',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/styles", sass({
  src: __dirname + "/styles",
  dest: __dirname + "/public/styles",
  debug: true,
  outputStyle: 'expanded'
}));

app.use(express.static("public"));

// Mount all resource routes
app.use("/api/users", usersRoutes(knex));

function generateRandomString() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";
  for (let i = 0; i < 20; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return randomString;
}

function checkUser(emailCheck, cb) {
   knex('users').where({email: emailCheck}).count('email')
  .asCallback(function (err, result) {
    const countValue = Number(result[0].count);
    cb(countValue);
  });
}

function adminCheck(emailCheck, cb) {
    knex('users')
    .select('id')
    .where({email: emailCheck})
    .asCallback(function (err, result) {
      const idValue = Number(result[0].id);
      cb(idValue);
    });
}

function cookieCheck(urlCheck, cb) {
    knex('events')
    .select('cookie_value')
    .where({short_url: urlCheck})
    .asCallback(function (err, result) {
      const cookieValue = result[0].cookie_value;
      cb(cookieValue);
    });
}

// Home page
app.get("/", (req, res) => {
  //const user = req.session.user_id;
  res.render("index");
});


app.post("/create", (req, res) => {
  const shortURL = generateRandomString();
  const cookieVal = generateRandomString();
  if (!req.body.firstname || !req.body.lastname || !req.body.email || !req.body.eventname || !req.body.eventdescription || !req.body.location) {
    res.redirect('/');
  }
  else {
    checkUser(req.body.email, function(count) {
      if (count) {
        knex('users')
        .where({ email: req.body.email })
        .update({
          first_name: req.body.firstname,
          last_name: req.body.lastname
        })
        .asCallback(function (err, result) {
          adminCheck(req.body.email, function(id) {
          knex('events')
          .insert({name: req.body.eventname,
          description: req.body.eventdescription,
          location: req.body.location,
          short_url: shortURL,
          admin_id: id,
          cookie_value: cookieVal
          })
          .asCallback(function (err, result) {
            req.session.admin_id = cookieVal;
            res.redirect(`/${shortURL}/create`);
          });
        });
       });
      }
      else {
        knex('users')
        .insert({first_name: req.body.firstname, last_name: req.body.lastname, email: req.body.email})
        .asCallback(function (err, result) {
          adminCheck(req.body.email, function(id) {
          knex('events')
          .insert({name: req.body.eventname,
          description: req.body.eventdescription,
          location: req.body.location,
          short_url: shortURL,
          admin_id: id,
          cookie_value: cookieVal
          })
          .asCallback(function (err, result) {
            req.session.admin_id = cookieVal;
            res.redirect(`/${shortURL}/create`);
          });
        });
      });
      }
    });
  }
});


app.get("/:shortURL/create", (req, res) => {
  cookieCheck(req.params.shortURL, function(cv) {
    if (req.session.admin_id == cv) {
      res.render("datesadd");
    }
    else {
      res.redirect('/');
    }
  });
});

// app.post("/:shortURL/dates", (req, res) => {
// });

app.get("/:shortURL", (req, res) => {


 var short = "CZ1wCsAvYNygel2Es23t";
  knex('events').select().where({short_url: short}).then(function(result) {
     res.render("vote",{record:result});

     knex('events_dates').select().where({event_id: result[0].id}).then(function(eventdates){
      eventdates.forEach(element){
        knex('events_responses').select().where({eventsdates_id:element.id})
      }
     })

  });
});


app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT);
});
