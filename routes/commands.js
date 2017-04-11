var bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash        = require("connect-flash"),
    Portal = require("../models/portals"),
    Team = require("../models/teams"),
    request = require("request"),
    express     = require("express");

var router = express.Router();

var website = "https://a5342780.ngrok.io/";

//===================
//SLASH COMMANDS START
//===================

//COMMAND FOR HELPING PEOPLE
router.post("/portalhelp", function(req, res ){
    // console.log(req.body);
    res.json({
        "text": "*The available commands are:*\n*/openportal* - Opens a portal. \n*/closeportal* - Closes a portal that you've already created. \n*/muteportal* - Stops messages from slack from reaching the portal. \n*/unmuteportal* - Lets messages from slack go through the portal. (Works only if the portal was muted) \n*/portalhelp* - Shows this information message.",
    });
});

//SLASH COMMAND FOR OPENING A PORTAL
router.post("/openportal", function(req, res){
    // console.log(req.body);
    Portal.find({teamid: req.body.team_id, channelid : req.body.channel_id}).exec()
    .then(function(foundportal){
        if(foundportal.length > 0){
            // console.log(foundportal + "this is the found portal");
            res.json({text: "You've already created a portal using this channel. Your portal's url is: " + foundportal[0].url});
        } else {
            var newportal = {};
            newportal.teamid = req.body.team_id;
            newportal.teamname = req.body.team_domain;
            newportal.channelid = req.body.channel_id;
            newportal.muted = false;
            Portal.create(newportal, function(error, portal){
                // console.log("this is a new portal" + portal);
                var newurl = website + portal._id;
                Portal.findByIdAndUpdate(portal._id, {url: newurl}, {new: true}).exec()
                .then(function(newportal){
                    // console.log(newportal);
                    res.json({text: "The URL for your new portal is: " + newportal.url + "\nShare it with whoever you wish to invite to this channel.\nTo close the portal, use command */closeportal*.\nRemember that once a portal for this channel is closed, it cannot be reopened with this URL.\nThe portal will automatically close in 48 hours if it remains inactive."});
                });
            });
        }
    });
});

//SLASH COMMAND FOR CLOSING A PORTAL
router.post("/closeportal", function(req, res){
    console.log(req.body);
    Portal.find({teamid: req.body.team_id, channelid : req.body.channel_id}).exec()
    .then(function(foundportal){
        if(foundportal.length > 0){
            console.log(foundportal + "this is the found portal");
            Portal.remove({_id: foundportal[0]._id}).exec()
            .then(function(){
                // console.log(newportal);
                res.json({text: "The portal for this channel has closed."});
            });
        } else {
            res.json({text: "There isn't an open portal for this channel yet. To create one, try the */openportal* command."})
        }
    });
});

//COMMAND TO MUTE A PORTAL
router.post("/muteportal", function(req, res){
    // console.log(req.body);
    Portal.find({teamid: req.body.team_id, channelid: req.body.channel_id}).exec()
    .then(function(portal){
        if(portal.length > 0){
            if(portal[0].muted !== true){
                // console.log(portal);
                Portal.findByIdAndUpdate(portal[0]._id, {$set: {muted: true}}, {new: true}).exec()
                .then(function(updatedportal){
                    console.log(updatedportal.muted, updatedportal.history);
                    res.json({text: "The portal of this channel is now muted."});
                }).catch(function(err){
                    throw err;
                })
            } else {
                res.json({text:"The portal of this channel is already muted."});
            }
        } else {
            res.json({text:"This channel doesn't have an open portal yet. To create one use the */openportal* command"});
        }
        
    }).catch(function(err){
        throw err;
    })
});

//COMMAND TO UNMUTE A PORTAL
router.post("/unmuteportal", function(req, res){
    Portal.find({teamid: req.body.team_id, channelid: req.body.channel_id}).exec()
    .then(function(portal){
        if(portal.length > 0){
            if(portal[0].muted === true){
                // console.log(portal);
                Portal.findByIdAndUpdate(portal[0]._id, {$set: {muted: false}}, {new: true}).exec()
                .then(function(updatedportal){
                    console.log(updatedportal.muted, updatedportal.history);
                    res.json({text: "*The portal of this channel is now live.*"});
                }).catch(function(err){
                    throw err;
                })
            } else {
                res.json({text:"The portal of this channel is already live."});
            }
        } else {
            res.json({text:"This channel doesn't have an open portal yet. To create one use the */openportal* command"});
        }
    }).catch(function(err){
        throw err;
    })
});

module.exports = router;

//===================
//SLASH COMMANDS END
//===================
