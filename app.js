
var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash        = require("connect-flash");
    Portal = require("./models/portals");
    Team = require("./models/teams");

var cookieParser = require('cookie-parser');
app.use(cookieParser());

mongoose.Promise = global.Promise;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));
app.use(flash());

var URL = process.env.DATABASEURL || "mongodb://localhost/slackportal"
mongoose.connect(URL);
var PORT = process.env.PORT || 3000;

app.get('/favicon.ico', function(req, res) {
    res.sendResponseStatus(204);
});

app.post("/incoming", function(req, res){
    console.log(req.body);
    Portal.find({channelid: req.body.event.channel, teamid: req.body.team_id}).exec()
    .then(function(portal){
        console.log("the found portal" + portal);
        if(portal.length > 0){
            Portal.findByIdAndUpdate(portal[0]._id, {$push: {history: req.body.event.text}},{new: true}).exec()
            .then(function(newportal){
                console.log("updated porta: " + newportal);
                res.send("ok");
            })
        } else {
            res.send("ok");
        }
    });
})

app.get("/slack/botauth", function(req, res){
    var data = {form: {
        client_id: process.env.PORTAL_CLIENT_ID_OFBOT,
        client_secret: process.env.PORTAL_CLIENT_SECRET_OFBOT,
        code: req.query.code
    }};
    
    request.post('https://slack.com/api/oauth.access', data, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var token = JSON.parse(body).access_token;
            // console.log("success with that" + JSON.parse(body));
            request.post('https://slack.com/api/team.info', {form: {token: token}}, function (error, response, body) {
                // console.log("success with that too" + JSON.parse(body));
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
                    })
                } else {
                    return send("I have no idea what I'm")
                }
            });
        }
    });
});
var website = "https://a3c39f4f.ngrok.io/";


app.post("/openportal", function(req, res){
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
    })
});

app.get("/", function(req, res){
    res.render("home");
});

app.get("/:portalid", function(req, res){
    res.render("home");
});

app.listen(PORT, function() {
    console.log("The Slack Portal server has started");
});