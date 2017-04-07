
var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash       = require("connect-flash"),
    Portal = require("./models/portals"),
    Team = require("./models/teams"),
    request = require("request");

var commandRoutes = require("./routes/commands");

var cookieParser = require('cookie-parser');
app.use(cookieParser());

mongoose.Promise = global.Promise;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));
app.use(flash());

var URL = process.env.DATABASEURL || "mongodb://localhost/slackportal2"
mongoose.connect(URL);
var PORT = process.env.PORT || 3000;

app.get('/favicon.ico', function(req, res) {
    res.sendStatus(204);
});

app.use(commandRoutes);

//TEAM AUTHENTICATION AND SAVING THE TEAM'S INFO IN THE DATABASE
app.get("/slack/botauth", function(req, res){
    var data = {form: {
        client_id: process.env.PORTAL_CLIENT_ID,
        client_secret: process.env.PORTAL_CLIENT_SECRET,
        code: req.query.code
    }};
    console.log(data);
    request.post('https://slack.com/api/oauth.access', data, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var token = JSON.parse(body).access_token;
            // console.log("that's the token   " + token);
            request.post('https://slack.com/api/team.info', {form: {token: token}}, function (error, response, body) {
                 console.log(JSON.parse(body));
                if (!error && response.statusCode == 200) {
                    var teamid = JSON.parse(body).team.id;
                    var teamname = JSON.parse(body).team.name;
                    Team.find({name: teamname, id: teamid}, function(err, foundteam){
                        if(foundteam.length > 0 && foundtam){
                            return send("Another person from the team already added the app.");
                        }
                        Team.create({name: teamname, id: teamid, token: token}, function(err, newteam){
                            console.log("this is a new team " + newteam);
                            res.redirect("/");
                        });
                    });
                } else {
                    return send("I have no idea what I'm doing.")
                }
            });
        }
    });
});

var website = "https://a3c39f4f.ngrok.io/";

//THIS IS GOING TO REDIRECT TO A SPLASH PAGE
app.get("/", function(req, res){
    res.render("splash");
});

//OUR APP'S SPLASH PAGE
app.get("/slackportal", function(req, res) {
    res.render("splash");
});

//THIS IS FOR WHEN A USER NAVIGATES TO THE URL OF A PORTAL
app.get("/:portalid", function(req, res){
    console.log(req.params.portalid);
    Portal.findById(req.params.portalid, function(error, portal){
        if(error){
            console.log(error);
            return res.send("That's not a valid portal address.");
        }
        if(portal !== undefined && portal !== null){
            res.render("home");
        } else {
            res.send("That's not a valid portal address.");
        }
    });
    
});

//THIS IS FIRED WHEN THE USER FIRST OPENS PORTAL
app.post("/getportal", function(req, res){
    Portal.findById(req.body.portalid, function(error, portal){
        Team.find({id: portal.teamid}).exec()
        .then(function(team){
            var data = {form: {
                token: team[0].token,
                channel: portal.channelid
            }};
            request.post("https://slack.com/api/channels.info", data, function(error, response, body){
                var info = JSON.parse(body);
                var channelname = info.channel.name;
                portal.channelname = channelname;
                res.send(portal);
            })
        });
    });

});

//THIS IS FIRED WHEN THE USER INPUTS A MESSAGE
app.post("/postinput", function(req, res){
    console.log(req.body);
    var newlog = {}
    newlog.message = req.body.message;
    newlog.sender = req.body.username;
    newlog.isfromslack = false;
    //Find the portal with the id of the url parameter. Locates a certain portal within the database and updates it to have that message in its history;
    Portal.findByIdAndUpdate(req.body.portalid, {$push: {history: newlog}}, {new: true}, function(error, portal){
        console.log((portal.teamid) + "this is the portal");
        
        Team.find({id: portal.teamid}).exec()
        .then(function(team){
            console.log(team, team[0].token);
            var data = {form: {
                token: team[0].token,
                channel: portal.channelid,
                text: req.body.message,
                username: req.body.username
            }};
            request.post("https://slack.com/api/chat.postMessage", data, function(error, response, body){
                console.log(body);
                res.send(portal);
            })
            
        });
    });
});

// EVENT API COMMAND THAT GETS EVERY MESSAGE TYPED IN ALL TEAMS
app.post("/incoming", function(req, res){
    
    // console.log("that's the body of the incoming " , req.body);
    //FIND THE PORTAL INSIDE THE DATABASE TAHT CORRESPONDS TO THAT EVENT'S CHANNEL AND TEAM IF IT EXISTS.
    Portal.find({channelid: req.body.event.channel, teamid: req.body.team_id}).exec()
    .then(function(portal){
        // console.log("the found portal" , portal);
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
                    if(info.user !== undefined){
                        var newlog = {};
                        newlog.message = req.body.event.text;
                        newlog.senderid = req.body.event.user;
                        newlog.sender = info.user.name;
                        newlog.senderavatar = info.user.profile.image_72;
                        newlog.isfromslack = true;
                        //FIND THE PORTAL AND PUSH IN ITS HISTORY THE NEW MESSAGE WITH ALL THE USER'S NEEDED INFO;
                        Portal.findByIdAndUpdate(portal[0]._id, {$push: {history: newlog}},{new: true}).exec()
                        .then(function(newportal){
                            console.log("updated portal: " + newportal);
                            io.emit('new message', newportal);
                            res.send("ok");
                        });
                    } else {
                        res.send("ok");
                    }
                });
            });            
        } else {
            res.send("ok");
        }
    });
});

var server = app.listen(PORT, function() {
    console.log("The Slack Portal server has started");
});

var io = require('socket.io')(server);

io.on('connection', function (socket) {
  console.log("connected");
});
