const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const config = require('../config.json');
const FS = require('fs-extra')
const User = require('../models/user');
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


        if (item) {
          offer.addTheirItem(item);
          offer.setMessage(`Deposit ${item.market_hash_name} on the website! Current balance:`);   //TO-DO grab item price here and add to credits
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
    });
    
    this.manager.on('pollData', function(pollData) {
      FS.writeFileSync('polldata.json', JSON.stringify(pollData));
    });
    




  }








  

  // sendWithdrawTrade(partner, credits, assetid, callback) {
  //   const offer = this.manager.createOffer(partner);

  //   this.manager.getInventoryContents(730, 2, true, (err, inv) => {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       const item = inv.find(item => item.assetid === assetid);

  //       if (item) {
  //         // Check to make sure the user can afford the item here

  //         offer.addMyItem(item);
  //         offer.setMessage('Withdraw item from the website!');
  //         offer.send((err, status) => {
  //           callback(err, status === 'sent' || status === 'pending', offer.id);
  //         });
  //       } else {
  //         callback(new Error('Could not find item'), false);
  //       }
  //     }
  //   });
  // }
}

module.exports = SteamBot;