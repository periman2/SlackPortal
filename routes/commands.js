var bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash        = require("connect-flash");
    Portal = require("./models/portals");
    Team = require("./models/teams");
    request = require("request");
    router = require("router");

var website = "https://a3c39f4f.ngrok.io/";

// EVENT API COMMAND THAT GETS EVERY MESSAGE TYPED IN A TEAM
router.post("/incoming", function(req, res){
    console.log("that's the body of the incoming " , req.body);
    //FIND THE PORTAL INSIDE THE DATABASE TAHT CORRESPONDS TO THAT EVENT'S CHANNEL AND TEAM IF IT EXISTS.
    Portal.find({channelid: req.body.event.channel, teamid: req.body.team_id}).exec()
    .then(function(portal){
        console.log("the found portal" , portal);
        //CHECK IF IT EXISTS
        if(portal.length > 0){
            //FIND THE TEAM WITH THE SAME TEAMID INSIDE THE DATABASE IN ORDER TO USE THE TEAMS OAUTH TOKEN
            Team.find({id: portal[0].teamid}).exec()
            .then(function(foundteam){
                var teamstoken = foundteam[0].token;
                // console.log(token);
                var data = {form: {
                    user: req.body.event.user,
                    token: teamstoken
                }};
                //USE THE TOKEN TO GET INFORMATION ABOUT THE USER SENDING THE MESSAGE
                request.post("https://slack.com/api/users.info", data, function(error, response, body) {
                    console.log(body);
                    var info = JSON.parse(body);
                    var newlog = {};
                    newlog.message = req.body.event.text;
                    newlog.senderid = req.body.event.user;
                    newlog.sender = info.user.name;
                    newlog.senderavatar = info.user.profile.image_72;
                    newlog.isfromslack = true;
                    //FIND THE PORTAL AND PUSH IN ITS HISTORY THE NEW MESSAGE WITH ALL THE USER'S NEEDED INFO;
                    Portal.findByIdAndUpdate(portal[0]._id, {$push: {history: newlog}},{new: true}).exec()
                    .then(function(newportal){
                        console.log("updated portaL: " + newportal);
                        res.send("ok");
                    });
                });
            })
            
        } else {
            res.send("ok");
        }
    });
});

//===================
//SLASH COMMANDS START
//===================


//SLASH COMMAND FOR OPENING A PORTAL
router.post("/openportal", function(req, res){
    // console.log(req.body);
    Portal.find({teamid: req.body.team_id, channelid : req.body.channel_id}).exec()
    .then(function(foundportal){
        if(foundportal.length > 0){
            // console.log(foundportal + "this is the found portal");
            res.json({text: "You've already created a portal using this channel. Your portal id is: " + foundportal[0].url});
        } else {
            var newportal = {};
            newportal.teamid = req.body.team_id;
            newportal.teamname = req.body.team_domain;
            newportal.channelid = req.body.channel_id;
            Portal.create(newportal, function(error, portal){
                // console.log("this is a new portal" + portal);
                var newurl = website + portal._id;
                Portal.findByIdAndUpdate(portal._id, {url: newurl}, {new: true}).exec()
                .then(function(newportal){
                    // console.log(newportal);
                    res.json({text: "The url for your new portal is: " + newportal.url});
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
            res.json({text: "You haven't opened a portal for this channel yet. To create one make the /openportal command."})
        }
    });
});

module.exports = router;

//===================
//SLASH COMMANDS END
//===================