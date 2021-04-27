const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const config = require('../config.json');
const FS = require('fs-extra')
const User = require('../models/user');
const mongoose = require('mongoose');
const Price = require('../models/price');
const Inventory = require('../models/inventory');



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


// Ensure Steam Desktop Authenticator is running in background (This scans and auto confirms any trade offers sent)
  sendWithdrawTrade(partner, assetid ) { 
    const offer = this.manager.createOffer(partner);
  
    this.manager.getUserInventoryContents(config.botSteamID, 730, 2, true, (err, inv) => {
      if (err) {
        console.log(err);
      } else {
        console.log(inv);
        const item = inv.find(item => item.assetid == assetid);     
        console.log(`Withdraw test ${item.market_hash_name}`);

        if (item) {


          
          mongoose.connect('mongodb://127.0.0.1:27017/steamtradingwebsite', function(err,db, steamid){   //Add credits into the credits field in the User collection in mongo database
        if (err) { throw err; }   
        else {  
          //Connect to item db to get price of item then pass down to priceOfItem var
          

          var priceOfItem = 10;   //replace this with the price of item being traded
          var collection = db.collection("users");
          collection.findOneAndUpdate({ steamid : "76561198119016105"}, {$inc: {credits: - priceOfItem}},  {upsert: true}, function(err,doc) {  //TO-DO Change steamid to grab it from user.steamid
            if (err) { throw err; }
            
            else { console.log("User has enough credits to buy item. Credit Amount: ", doc.credits); }
          });  
        }
        });



            
          offer.addMyItem(item); 
          offer.setMessage(`Withdraw ${item.market_hash_name} on the website! This item is worth credits`); 
          offer.send(function(err, status) {
            if (err) {
              console.log(err);
              return;
            }

            if (status == 'pending') {
              //Need too confirm it
              console.log(`Offer #${offer.id} sent, but requires confirmation`);
                if (err) {
                  console.log(err);
                } else {
                  console.log("Offer confirmed");
                }
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
      
        console.log("Withdraw trade offer has been declined")         
    }
    });

    this.manager.on('pollData', function(pollData) {
      FS.writeFileSync('polldata.json', JSON.stringify(pollData));
    });
    




  }


  

  sendDepositTrade(partner, assetid, socket, price , callback, steamid, message, credits ) {
    const offer = this.manager.createOffer(partner);
  
    this.manager.getUserInventoryContents(partner, 730, 2, true, (err, inv) => {
      if (err) {
        console.log(err);
      } else {
        console.log(inv);
        const item = inv.find(item => item.assetid == assetid);    
        console.log(`Deposit test ${item.market_hash_name}`);

        if (item) {
            

         
          mongoose.connect('mongodb://127.0.0.1:27017/steamtradingwebsite', function(err,db){   //Add credits into the credits field in the User collection in mongo database
        if (err) { throw err; }   
        else {
          var collection = db.collection("prices");   //Grab price from prices DB
          collection.findOne({market_hash_name: item.market_hash_name}, price, function(err,doc) {  
            if (err) { throw err; }
            else { console.log(item.market_hash_name, " price = ", /*doc.price*/); }
          });  
        }
        });


           

//TODO ADD CODE UNDERNEATH INTO THE ABOVE MONGOOSE CODE (THEN FROM WITHIN YOU SHOULD BE ABLE TO USE THE doc.price TO ADD ONTO THE CREDITS)
          offer.addTheirItem(item); 
          offer.setMessage(`Deposit ${item.market_hash_name} on the website! This item is worth ${price} credits`); 
          offer.send(function(err, status) {
            if (err) {
              console.log(err);
              return;
            }

            if (status == 'pending') {
              //Need to confirm it
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
      
        console.log("Deposit Trade offer has been declined")

        //MOVE THIS TO WHEN OFFER IS ACCEPTED WHEN FULLY WORKING

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


 






  }

module.exports = SteamBot;