var bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash        = require("connect-flash"),
    Portal = require("../models/portals"),
    Team = require("../models/teams"),
    request = require("request"),
    express     = require("express");

var router = express.Router();

var website = "https://slackteamportal.herokuapp.com/";

//=====================
//RESPONSE CONSTRUCTORS
//=====================

function makebody(title, titlelink, fallback, color, response_type){
    var milliseconds = (new Date()).getTime() / 1000;
    if(response_type !== "in_channel"){
        response_type = "ephemeral"
    }
    if(!color){
        color = "#aaa";
    }
    var body = {
        "attachments": [
            {
                "fallback": fallback,
                "color": color,
                "title": title,
                "title_link": titlelink,
                "footer": "Portal API",
                "ts": milliseconds
            }
        ],
        response_type: response_type
    }
    return body;
}

function makefield(body, title, value) {
    var fields = body.attachments[0].fields;
    if(!body.attachments[0].fields){
        body.attachments[0].fields = [];
    }
    if(value.constructor === Array){
        value = value.join();
    }
    var obj = {
        "title": title,
        "value": value,
        "short": false
    }
    body.attachments[0].fields.push(obj);
    return body;
}
//=========================
//RESPONSE CONSTRUCTORS END
//=========================

//===================
//SLASH COMMANDS START
//===================


router.post("/portalinfo", function(req, res){
    if(req.body.token !== process.env.PORTAL_VALIDATION_TOKEN){
        return res.send("You're not authorized to do that!");
    }
    Portal.find({teamid: req.body.team_id, channelid : req.body.channel_id}).exec()
    .then(function(foundportal){
        if(foundportal.length > 0){
            // console.log(foundportal + "this is the found portal");
            var users = foundportal[0].users;
            var url = foundportal[0].url;
            var state;
            if(users.length === 0){
                users = "This portal has no live users right now."
            }
            if(foundportal[0].muted){
                state = "Muted (To change state, use the /portalunmute command)";
            } else {
                state = "Live (To change state, use the /portalmute command)";
            }
            var title = "This is your portal's information"
            var titlelink = foundportal[0].url
            var fallback = "Your portal's information is: \n" + "URL: " + foundportal[0].url + "\nState: " + state + "\nUsers: " + users;
            var portalinfo = makebody(title, titlelink, fallback);
            portalinfo = makefield(portalinfo, "State", state);
            portalinfo = makefield(portalinfo, "Users", users);
            portalinfo = makefield(portalinfo, "URL", url);
            res.json(portalinfo);
        } else {
            res.json({text: "There is no open portal for this channel right now."});
        }
    });
});

//COMMAND FOR HELPING PEOPLE
router.post("/portalhelp", function(req, res){
    // console.log(req.body);
    var fallback = "*The available commands are:*\n*/portalopen* - Opens a portal. \n*/portalclose* - Closes a portal that you've already created. \n*/portalmute* - Stops messages from slack from reaching the portal. \n*/portalunmute* - Lets messages from slack go through the portal. (Works only if the portal was muted) \n*/portalhelp* - Shows this information message.n*/portalinfo* - Shows information about the live portal."
    var title = "Available commands: ";
    var portal = makebody(title, "", fallback,"#9a3d2e");
    portal = makefield(portal, "/portalopen", "Opens a portal.");
    portal = makefield(portal, "/portalclose", "Closes a portal that you've already created.");
    portal = makefield(portal, "/muteportal", "Stops messages in Slack from reaching the portal.");
    portal = makefield(portal, "/portalunmute", "Allows messages from Slack to reach the portal. (Works only if the portal was muted)");
    portal = makefield(portal, "/portalinfo", "Shows info on a portal, including its current state, users and URL.");
    portal = makefield(portal, "/portalhelp", "Shows all available commands.");
    res.json(portal);
});

//SLASH COMMAND FOR OPENING A PORTAL
router.post("/portalopen", function(req, res){
    if(req.body.token !== process.env.PORTAL_VALIDATION_TOKEN){
        return res.send("You're not authorized to do that!");
    }
    // console.log(req.body);
    Portal.find({teamid: req.body.team_id, channelid : req.body.channel_id}).exec()
    .then(function(foundportal){
        Team.find({id: req.body.team_id}).exec()
        .then(function(team){
            // console.log("this is the team" + team);
            var channel = req.body.channel_id[0];
            var data = {form: {
                token: team[0].token,
                channel: req.body.channel_id
            }};
            if(channel === "C"){ 
                channel = "channels.info";
            } else if(channel === "G") {
                channel = "groups.info";
            } else if(channel === "D"){
                channel = "team.info";
                data = {form: {token: team[0].token}};
            } else {
                return res.send("Something went wrong!")
            }
            // console.log("this is the channel and token: " + channel + team[0].token);
            var url = "https://slack.com/api/" + channel;
            
            request.post(url, data, function(error, response, body){
                var info = JSON.parse(body);
                // console.log(info);
                if (info.channel){
                    info = info.channel.name;
                } else if(info.group){
                    info = info.group.name;
                } else if(info.team){
                    info = "Direct Message channel";
                } else {
                    return res.send("Something went wrong please try again. If it still doesn't work try opening a portal from a different channel.");
                }
                if(foundportal.length > 0){
                    // console.log(foundportal + "this is the found portal");
                    res.json({text: "There already is an open portal on this channel.\nThe portal's URL is: " + foundportal[0].url});

                } else {
                    var newportal = {};
                    newportal.creator = {name: req.body.user_name, id: req.body.user_id};
                    newportal.teamid = req.body.team_id;
                    newportal.teamname = team[0].name;
                    newportal.channelid = req.body.channel_id;
                    newportal.channelname = info;
                    newportal.muted = false;
                    Portal.create(newportal, function(error, portal){
                        // console.log("this is a new portal" + portal);
                        var newurl = website + portal._id;
                        Portal.findByIdAndUpdate(portal._id, {url: newurl}, {new: true}).exec()
                        .then(function(newportal){
                            // console.log("this is the new portal"  + newportal);
                            var fallback = "The URL for your new portal is: " + newportal.url + "\nShare it with whoever you wish to invite to this channel.\nTo close the portal, use command */portalclose*.\nRemember that once a portal for this channel is closed, it cannot be reopened with this URL.\nThe portal will automatically close in 48 hours if it remains inactive.\nFor a list of available commands, try */portalhelp*."
                            var title = "This is your new portal: "
                            var portal = makebody(title, newportal.url, fallback,"#9a3d2e", "in_channel");
                            portal = makefield(portal, "URL", newportal.url);
                            portal = makefield(portal, "State", "Live (To change state, use the /portalmute command)");
                            portal = makefield(portal, "Open", "To close the portal, use the /portalclose command.\n");
                            portal = makefield(portal, "Reminder", "Once a portal for this channel is closed, it cannot be reopened with this URL.\nThe portal will automatically close in 48 hours if it remains inactive.\nFor a list of available commands, try /portalhelp");
                            res.json(portal);
                        });
                    });
                }
            });
        });
    });
});


//SLASH COMMAND FOR CLOSING A PORTAL
router.post("/portalclose", function(req, res){
    if(req.body.token !== process.env.PORTAL_VALIDATION_TOKEN){
        return res.send("You're not authorized to do that!");
    }
    // console.log(req.body);
    Portal.find({teamid: req.body.team_id, channelid : req.body.channel_id}).exec()
    .then(function(foundportal){
        if(foundportal.length > 0){
            // console.log(foundportal + "this is the found portal");
            Portal.remove({_id: foundportal[0]._id}).exec()
            .then(function(){
                // console.log(newportal);
                res.json({text: "The portal for this channel has closed.", response_type: "in_channel"});
            });
        } else {
            res.json({text: "There isn't an open portal for this channel yet. To create one, try the */portalopen* command."})
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
                    // console.log(updatedportal.muted, updatedportal.history);
                    res.json({text: "*This channel's portal is now muted.*", response_type: "in_channel"});
                }).catch(function(err){
                    throw err;
                })
            } else {
                res.json({text:"This channel's portal is already muted."});
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
                    // console.log(updatedportal.muted, updatedportal.history);
                    res.json({text: "*This channel's portal is now live.*", response_type: "in_channel"});
                }).catch(function(err){
                    throw err;
                })
            } else {
                res.json({text:"This channel's portal is already live."});
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
