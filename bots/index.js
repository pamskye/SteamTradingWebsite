const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const config = require('../config.json');
const FS = require('fs-extra')
const User = require('../models/user');
const mongoose = require('mongoose');
const Price = require('../models/price');



class SteamBot {
  constructor(logOnOptions) {
    this.client = new SteamUser();
    this.community = new SteamCommunity();
    this.manager = new TradeOfferManager({
      steam: this.client,
      community: this.community,
      language: 'en'
    });

    this.logOn(logOnOptions);
  }

  logOn(logOnOptions) {
    this.client.logOn(logOnOptions);

    this.client.on('loggedOn', () => {
      console.log('Logged into Steam');

      this.client.setPersona(SteamUser.EPersonaState.Online);
      this.client.gamesPlayed(730);
    });

    this.client.on('webSession', (sessionid, cookies) => {
      this.manager.setCookies(cookies);

      this.community.setCookies(cookies);
      this.community.startConfirmationChecker(10000, config.identitySecret);
    });


    this.client.on('friendMessage', (steamID, message) => {
    
  
      if (message.match('!help')) {
        console.log(' Chat From ' + steamID + ': ' + message);
          this.client.chatMessage(steamID, 
          `TYPE LIST OF COMMANDS HERE`);
                  }
                  else if (message.match('!credits')) {
                    this.client.chatMessage(steamID, `Your current balance is: ${user.credits} `);

                  }
                  else {
                    this.client.chatMessage(steamID, '\nInvalid please type "!help" for a list of available commands.');
                
              }
            });



  }


  

  sendDepositTrade(partner, assetid, socket, price , callback, steamid, message, credits ) {
    const offer = this.manager.createOffer(partner);
  
    this.manager.getUserInventoryContents(partner, 730, 2, true, (err, inv) => {
      if (err) {
        console.log(err);
      } else {
        const item = inv.find(item => item.assetid == assetid);    
        console.log(`Deposit test ${item.market_hash_name}`);

        if (item) {
            

          //Get item price
          mongoose.connect('mongodb://127.0.0.1:27017/steamtradingwebsite', function(err,db){   //Add credits into the credits field in the User collection in mongo database
        if (err) { throw err; }   
        else {
          var collection = db.collection("prices");   //Grab price from prices DB
          collection.findOne({market_hash_name: item.market_hash_name}, price, function(err,doc) {  
            if (err) { throw err; }
            else { console.log(item.market_hash_name, " price = ", doc.price); }
          });  
        }
        });


           


          offer.addTheirItem(item); 
          offer.setMessage(`Deposit ${item.market_hash_name} on the website! This item is worth ${price} credits`); 
          offer.send(function(err, status) {
            if (err) {
              console.log(err);
              return;
            }

            if (status == 'pending') {
              // We need to confirm it
              console.log(`Offer #${offer.id} sent, but requires confirmation`);
              community.acceptConfirmationForObject(config.identitySecret, offer.id, function(err) {
                if (err) {
                  console.log(err);
                } else {
                  console.log("Offer confirmed");
                }
              });
            } else {
              console.log(`Offer #${offer.id} sent successfully`);
            }
          });
        };
      };
      
    });
    this.manager.on('sentOfferChanged', function(offer, oldState) {
      console.log(`Offer #${offer.id} changed: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);   //TO-DO add credits here from item price
      if (TradeOfferManager.ETradeOfferState[offer.state] === "Declined") { //If offer is declined...
      
        console.log("Offer has been declined")

        /////////MOVE THIS TO WHEN OFFER IS ACCEPTED WHEN FULLY WORKING

        mongoose.connect('mongodb://127.0.0.1:27017/steamtradingwebsite', function(err,db, steamid){   //Add credits into the credits field in the User collection in mongo database
        if (err) { throw err; }   
        else {
          var test = 1;   //replace this with the price of item being traded
          var collection = db.collection("users");
          collection.findOneAndUpdate({steamid: steamid}, {$inc: {credits: test}}, {upsert: true}, function(err,doc) {  //TO-DO Change steamid to grab it from user.steamid
            if (err) { throw err; }
            else { console.log("Updated credit balance"); }
          });  
        }
        });


             
    }
      //TO-DO add if offer is accepted...
    });
    
    this.manager.on('pollData', function(pollData) {
      FS.writeFileSync('polldata.json', JSON.stringify(pollData));
    });
    




  }


  sendWithdrawTrade(partner, credits, assetid, callback) {
    const offer = this.manager.createOffer(partner);

    this.manager.getUserInventoryContents('76561198175112605', 730, 2, true, (err, inv) => {
      if (err) {
        console.log(err);
      } else {
        const item = inv.find(item => item.assetid == assetid);    
        console.log(`TEST`);
        console.log(`TEST 2 ${item.market_hash_name}`);

        if (item) {
          // Check to make sure the user can afford the item here
          console.log(`TEST 3`);
          offer.addMyItem(item);
          offer.setMessage('Withdraw item from the website!');
          offer.send((err, status) => {
            if (err) {
              console.log(err);
              return;
            }

            if (status == 'pending') {
              // We need to confirm it
              console.log(`Offer #${offer.id} sent, but requires confirmation`);
              community.acceptConfirmationForObject(config.identitySecret, offer.id, function(err) {
                if (err) {
                  console.log(err);
                } else {
                  console.log("Offer confirmed");
                }
              });
            } else {
              console.log(`Offer #${offer.id} sent successfully`);
            }
          });
        };
      };
      
    });
    this.manager.on('sentOfferChanged', function(offer, oldState) {
      if (TradeOfferManager.ETradeOfferState[offer.state] === "Declined") {
      
        console.log("Offer has been declined")
             
    }

      //TODO when trade offer is accepted, then add credits to the account
    });
    
    this.manager.on('pollData', function(pollData) {
      FS.writeFileSync('polldata.json', JSON.stringify(pollData));
    });
    

  }


  }

module.exports = SteamBot;