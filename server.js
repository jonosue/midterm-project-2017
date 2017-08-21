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
  maxAge: 48 * 60 * 60 * 1000 // 24 hours
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

function checkRespondent(emailCheck, cb) {
   knex('events_responses')
   .where('users.email', emailCheck)
   .innerJoin('users', 'events_responses.user_id', 'users.id')
   .count('email')
  .asCallback(function (err, result) {
    const responseValue = Number(result[0].count);
    cb(responseValue);
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

function findEventID(cookieCheck, cb) {
    knex('events')
    .select('id')
    .where({cookie_value: cookieCheck})
    .asCallback(function (err, result) {
      const eventIDValue = result[0].id;
      cb(eventIDValue);
    });
}

// Home page
app.get("/", (req, res) => {
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
    findEventID(req.session.admin_id, function(id) {
    knex('events_dates')
    .where({ event_id: id })
    .delete()
    .asCallback(function (err, result) {
      knex.from('events')
      .orderBy('events_responses.user_id', 'asc', 'events_dates.id', 'asc')
      .where('events.short_url', req.params.shortURL)
      .leftJoin('events_dates', 'events.id', 'events_dates.event_id')
      .leftJoin('events_responses', 'events_dates.id', 'events_responses.eventsdates_id')
      .leftJoin('users', 'events_responses.user_id', 'users.id')
      .select('events_responses.user_id', 'users.email', 'events_responses.eventsdates_id', 'events_responses.id', 'users.first_name', 'users.last_name', 'events_dates.datetime', 'events_responses.response', 'events.name', 'events.location', 'events.description')
      .asCallback(function (err, userResponses) {
      res.render("datesadd", {user_summary: userResponses});
    });
  });
});
    }
    else {
      res.redirect('/');
    }
  });
});


app.post("/date_individual", (req, res) => {
  if (req.session.admin_id) {
  findEventID(req.session.admin_id, function(id) {
    knex('events_dates')
    .insert({
      datetime: req.body.date,
      event_id: id
    })
    .asCallback(function (err, result) {
    });
  });
}
else {
  res.redirect(req.get('referer'));
}
});

app.post("/vote", (req, res) => {
  findEventID(req.session.admin_id, function(id) {
    knex('events_dates')
    .where({ event_id: id })
    .select('event_id')
    .asCallback(function (err, result) {
      if (result.length > 0) {
        knex('events')
        .where({ id: result[0].event_id })
        .select('short_url')
        .asCallback(function (err, rows) {
          req.session = null;
          let shortURL = rows[0].short_url;
          res.redirect(`/${shortURL}`);
        });
      }
      else {
        res.status(404).send('You must enter at least one date in order to create an event!');
      }
    });
  });
});


app.get("/:shortURL", (req, res) => {
  knex.from('events')
  // .orderBy('events_responses.user_id', 'asc')
  // .orderBy('events_dates.id', 'desc')
    .orderByRaw('events_responses.user_id asc, events_dates.id asc')
  .where('events.short_url', req.params.shortURL)
  .leftJoin('events_dates', 'events.id', 'events_dates.event_id')
  .leftJoin('events_responses', 'events_dates.id', 'events_responses.eventsdates_id')
  .leftJoin('users', 'events_responses.user_id', 'users.id')
  .select('events_responses.user_id', 'users.email', 'events.short_url', 'events_responses.eventsdates_id', 'events_responses.id', 'users.first_name', 'users.last_name', 'events_dates.datetime', 'events_responses.response', 'events.name', 'events.location', 'events.description')
  .asCallback(function (err, userResponses) {
    knex.from('events_dates')
    .orderBy('events_dates.id', 'asc')
    .where('events.short_url', req.params.shortURL)
    .distinct('events_dates.id')
    .innerJoin('events', 'events.id', 'events_dates.event_id')
    .select('events_dates.datetime', 'events_dates.event_id')
    .asCallback(function (err, eventDates) {
      console.log(eventDates);
      console.log(userResponses);
      res.render('vote', { user_summary: userResponses, event_dates: eventDates });
      req.session = null;
    });
  });

});

app.post("/response", (req, res) => {
  let event_id = '';
    if (Array.isArray(req.body.event_id)) {
      event_id = req.body.event_id
    }
    else {
      event_id = [req.body.event_id]
    };
    let short_url = '';
    if (Array.isArray(req.body.short_url)) {
      short_url = req.body.short_url
    }
    else {
      short_url = [req.body.short_url]
    };
    let eventsdates_id = '';
    if (Array.isArray(req.body.eventsdates_id)) {
      eventsdates_id = req.body.eventsdates_id
    }
    else {
      eventsdates_id = [req.body.eventsdates_id]
    };
    checkRespondent(req.body.email, function(count) {
      if (count) {
        knex('users')
        .where({ email: req.body.email })
        .update({
          first_name: req.body.firstname,
          last_name: req.body.lastname
        })
        .asCallback(function (err, result) {
          knex('users')
          .select('id')
          .where('email', req.body.email)
          .asCallback(function (err, result) {
            for (let loop = 0; loop < 1; loop++) {
            for (let i = 0; i < eventsdates_id.length; i++) {
            knex('events_responses')
            .where('user_id', result[0].id)
            .andWhere('eventsdates_id', Number(eventsdates_id[i]))
            .update({
              response: false
            })
           .asCallback(function (err, rows) {
              for (let x in req.body) {
              knex('users')
              .select('id')
              .where('email', req.body.email)
              .asCallback(function (err, rowsval) {
              knex('events_responses')
              .where('user_id', rowsval[0].id)
              .andWhere('eventsdates_id', Number(x))
              .update({
                response: true
              })
              .asCallback(function (err, rows) {
              })
              });
              };
           });
         }
}
        knex('events')
        .where({ short_url: short_url[0] })
        .select('short_url')
        .asCallback(function (err, rows) {
                 knex('events')
        .where({ short_url: short_url[0] })
        .select('short_url')
        .asCallback(function (err, rows) {
          let redirect = rows[0].short_url;
          res.redirect(`/${redirect}`);
        });
        });

       })
    });
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
          knex('users')
          .select('id')
          .where('email', req.body.email)
          .asCallback(function (err, result) {
            for (let loop = 0; loop < 1; loop++) {
            for (let i = 0; i < eventsdates_id.length; i++) {
                 knex('events_responses')
            .rightJoin('users', 'users.id', 'events_responses.user_id')
            .where('users.email', req.body.email)
            .insert({
              eventsdates_id: Number(eventsdates_id[i]),
              user_id: result[0].id,
              response: false
            })
           .asCallback(function (err, rows) {
              for (let x in req.body) {
              knex('users')
              .select('id')
              .where('email', req.body.email)
              .asCallback(function (err, rowsval) {
              knex('events_responses')
              .where('user_id', rowsval[0].id)
              .andWhere('eventsdates_id', Number(x))
              .update({
                response: true
              })
              .asCallback(function (err, rows) {
              })
              });
              };
           });
         }
       }
        knex('events')
        .where({ short_url: short_url[0] })
        .select('short_url')
        .asCallback(function (err, rows) {
                 knex('events')
        .where({ short_url: short_url[0] })
        .select('short_url')
        .asCallback(function (err, rows) {
          let redirect = rows[0].short_url;
          res.redirect(`/${redirect}`);
        });
        });

       })
      });
            }
            else {
              knex('users')
              .insert({first_name: req.body.firstname, last_name: req.body.lastname, email: req.body.email})
              .asCallback(function (err, result) {
          knex('users')
          .select('id')
          .where('email', req.body.email)
          .asCallback(function (err, result) {
                        for (let loop = 0; loop < 1; loop++) {
            for (let i = 0; i < eventsdates_id.length; i++) {
            knex('events_responses')
            .rightJoin('users', 'users.id', 'events_responses.user_id')
            .where('users.email', req.body.email)
            .insert({
              eventsdates_id: Number(eventsdates_id[i]),
              user_id: result[0].id,
              response: false
            })
           .asCallback(function (err, rows) {
              for (let x in req.body) {
              knex('users')
              .select('id')
              .where('email', req.body.email)
              .asCallback(function (err, rowsval) {
              knex('events_responses')
              .where('user_id', rowsval[0].id)
              .andWhere('eventsdates_id', Number(x))
              .update({
                response: true
              })
              .asCallback(function (err, rows) {
              })
              });
              };
           });
         }
       }
        knex('events')
        .where({ short_url: short_url[0] })
        .select('short_url')
        .asCallback(function (err, rows) {
        knex('events')
        .where({ short_url: short_url[0] })
        .select('short_url')
        .asCallback(function (err, rows) {
          let redirect = rows[0].short_url;
          res.redirect(`/${redirect}`);
        });
        });

       })



      });
            }
          });
      }
    });
});


app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT);
});
