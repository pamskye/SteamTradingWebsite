const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passportSocket = require('passport.socketio');
const async = require('async');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const socket = require('socket.io');
const MongoStore = require('connect-mongo')(session);
const SteamCommunity = require('steamcommunity');
const SteamTotp = require('steam-totp');
const GlobalOffensive = require('globaloffensive');
const config = require('./config.json');

const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');   //Allow steam info to be displayed on handlebars page (fixes error)
const Handlebars = require('handlebars');
const exphbs = require('express-handlebars');


const Inventory = require('./models/inventory');
const Item = require('./models/item');
const User = require('./models/user');
const Price = require('./models/price');

const SteamBot = require('./bots');
const priceUpdater = require('./helpers/priceUpdater');

const app = express();
const server = http.Server(app);
const io = socket(server);
const hbs = Handlebars.create();
const community = new SteamCommunity();

const sessionStore = new MongoStore({
  mongooseConnection: mongoose.connection
});




const bot = new SteamBot({
  accountName: config.username,
  password: config.password,
  twoFactorCode: SteamTotp.generateAuthCode(config.sharedSecret)
});

mongoose.connect('mongodb://127.0.0.1:27017/steamtradingwebsite');
priceUpdater(6 * 60 * 60 * 1000);

passport.serializeUser((user, done) => {
  User.update(
    {
      steamid: user.id
    },
    {
      $set: user._json
    },
    { upsert: true },
    err => {
      done(err, user._json);
    }
  );
});

passport.deserializeUser((obj, done) => {
  User.findOne(
    {
      steamid: obj.steamid
    },
    (err, user) => {
      done(err, user);
    }
  );
});

passport.use(
  new SteamStrategy(
    {
      returnURL: 'http://localhost:3037/auth/steam/return',
      realm: 'http://localhost:3037/',
      apiKey: config.apiKey
    },
    (identifier, profile, done) => {
      return done(null, profile);
    }
  )
);

io.use(
  passportSocket.authorize({
    cookieParser: cookieParser,
    key: 'U_SESSION',
    secret: config.secretString,
    store: sessionStore
  })
);

io.on('connection', socket => {
  socket.on('deposit', data => {
    const user = socket.request.user;
    console.log(`${user.personaname} is depositting ${data.assetid}. Current credit balance: ${user.credits}`);
    
    

    
    bot.sendDepositTrade(
      user.steamid,
      data.assetid,
      (err, success, tradeOffer) => {
        // TODO: Handle these events on the website
        if (err && !success) {
          socket.emit('failure', {
            message: 'We could not process your request at this time.'
          });
        } else {
          socket.emit('success', { tradeOffer });
        }
      }
    );
  });

  socket.on('withdraw', data => {
    const user = socket.request.user;
    console.log(`${user.personaname} is withdrawing ${data.assetid}. Current credit balance: ${user.credits}`);



    bot.sendWithdrawTrade(
      user.steamid,
      data.assetid,
      (err, success, tradeOffer) => {
        // TODO: Handle these events on the website
        if (err && !success) {
          socket.emit('failure', {
            message: 'We could not process your request at this time.'
          });
        } else {
          socket.emit('success', { tradeOffer });
        }
      }
    );
  });
});

app.engine('hbs', exphbs({
    defaultLayout: 'main',
    // ...implement newly added insecure prototype access
    handlebars: allowInsecurePrototypeAccess(Handlebars)
    })
);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.locals.layout = false

app.use(
  session({
    secret: config.secretString,
    name: 'U_SESSION',
    resave: true,
    saveUninitialized: true,
    store: sessionStore
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.render('main', {
    user: req.user
  });
});

app.get('/deposit', (req, res) => {
  if (req.user) {
    Inventory.findOne(
      {
        steamid: req.user.steamid
      },
      (err, inv) => {
        if (inv && Date.now() - inv.updated < 6 * 60 * 60 * 1000) {
          res.render('deposit', {
            user: req.user,
            items: inv.items
          });
        } else {
          community.getUserInventoryContents(
            req.user.steamid,
            730,
            2,
            true,
            (err, inv) => {
              if (err) {
                console.log(err);
              } else {
                async.map(
                  inv,
                  (item, done) => {
                    Price.findOne(
                      {
                        market_hash_name: item.market_hash_name
                      },
                      (err, doc) => {
                        item.price = doc ? doc.price : '?';
                        done(null, item);
                      }
                    );
                  },
                  (err, results) => {
                    Inventory.update(
                      {
                        steamid: req.user.steamid
                      },
                      {
                        $set: {
                          updated: Date.now(),
                          items: results
                        }
                      },
                      err => {
                        if (err) {
                          console.log(err);
                        }
                      }
                    );

                    res.render('deposit', {
                      user: req.user,
                      items: results
                    });
                  }
                );
              }
            }
          );
        }
      }
    );
  } else {
    res.redirect('/auth/steam');
  }
});


app.get('/withdraw', (req, res) => {    //TO-DO make a request send out offering the user an item
  if (req.user) {
    Inventory.findOne(
      {
        steamid: config.botSteamID
      },
      (err, inv) => {
        if (inv && Date.now() - inv.updated < 6 * 60 * 60 * 1000) {
          res.render('withdraw', {
            user: req.user,
            items: inv.items
          });
        } else {
  community.getUserInventoryContents(
    config.botSteamID,                //Steam Bots steamid (Loads the steam bot inventory)
    730,
    2,
    true,
    (err, inv) => {
      if (err) {
        console.log(err);
      } else {
        async.map(
          inv,
          (item, done) => {
            Price.findOne(
              {
                market_hash_name: item.market_hash_name
              },
              (err, doc) => {
                item.price = doc ? doc.price : '?';
                done(null, item);
              }
            );
          },
          (err, results) => {
            Inventory.update(
              {
                steamid: config.botSteamID
              },
              {
                $set: {
                  updated: Date.now(),
                  items: results
                }
              },
              err => {
                if (err) {
                  console.log(err);
                }
              }
            );

            res.render('withdraw', {
              user: req.user,
              items: results
            });
          }
        );
      }
    }
  );
}
}
);
} else {
res.redirect('/auth/steam');
}
});





app.get('/profile', (req, res) => {
  res.render('profile', {
    user: req.user
  });
});

app.get(
  /^\/auth\/steam(\/return)?$/,
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});


server.listen(3037, () => {
  console.log('listening');
});


