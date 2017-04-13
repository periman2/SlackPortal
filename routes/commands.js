var bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash        = require("connect-flash"),
    Portal = require("../models/portals"),
    Team = require("../models/teams"),
    request = require("request"),
    express     = require("express");

var router = express.Router();

var website = "https://708ac1a4.ngrok.io/";

//===================
//SLASH COMMANDS START
//===================

//COMMAND FOR HELPING PEOPLE
router.post("/portalhelp", function(req, res ){
    // console.log(req.body);
    res.json({
        "text": "*Available commands are:*\n*/portalopen* - Open a portal. \n*/portalclose* - Close the portal that you've opened within your channel. \n*/portalmute* - Block messages in Slack from reaching the portal. \n*/portalunmute* - Allow messages in Slack to resume going to the portal. (Works only if the portal was muted.) \n*/portalhelp* - Show this list again.",
    });
});

//SLASH COMMAND FOR OPENING A PORTAL
router.post("/portalopen", function(req, res){
    if(req.body.token !== process.env.PORTAL_VALIDATION_TOKEN){
        return res.send("You're not authorized to do that!");
    }
    // console.log(req.body);
    Portal.find({teamid: req.body.team_id, channelid : req.body.channel_id}).exec()
    .then(function(foundportal){
        if(foundportal.length > 0){
            // console.log(foundportal + "this is the found portal");
            res.json({text: "You've already created a portal from this channel. Your portal's URL is: " + foundportal[0].url});
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
                    res.json({text: "The URL for your new portal is: " + newportal.url + "\nShare it with whoever you wish to invite to this channel.\nTo close the portal, use command */portalclose*.\nRemember that once a portal for this channel is closed, it cannot be reopened with this URL.\nThe portal will automatically close in 48 hours if it remains inactive.\nFor a list of available commands, try */portalhelp*."});
                });
            });
        }
    });
});

//SLASH COMMAND FOR CLOSING A PORTAL
router.post("/portalclose", function(req, res){
    if(req.body.token !== process.env.PORTAL_VALIDATION_TOKEN){
        return res.send("You're not authorized to do that!");
    }
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
router.post("/portalmute", function(req, res){
    if(req.body.token !== process.env.PORTAL_VALIDATION_TOKEN){
        return res.send("You're not authorized to do that!");
    }
    // console.log(req.body);
    Portal.find({teamid: req.body.team_id, channelid: req.body.channel_id}).exec()
    .then(function(portal){
        if(portal.length > 0){
            if(portal[0].muted !== true){
                // console.log(portal);
                Portal.findByIdAndUpdate(portal[0]._id, {$set: {muted: true}}, {new: true}).exec()
                .then(function(updatedportal){
                    console.log(updatedportal.muted, updatedportal.history);
                    res.json({text: "This channel's portal is now muted."});
                }).catch(function(err){
                    throw err;
                })
            } else {
                res.json({text:"The portal of this channel is already muted."});
            }
        } else {
            res.json({text:"This channel doesn't have an open portal yet. To create one, use the */portalopen* command"});
        }
        
    }).catch(function(err){
        throw err;
    })
});

//COMMAND TO UNMUTE A PORTAL
router.post("/portalunmute", function(req, res){
    if(req.body.token !== process.env.PORTAL_VALIDATION_TOKEN){
        return res.send("You're not authorized to do that!");
    }
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
            res.json({text:"This channel doesn't have an open portal yet. To create one use the */portalopen* command"});
        }
    }).catch(function(err){
        throw err;
    })
});

module.exports = router;

//===================
//SLASH COMMANDS END
//===================
