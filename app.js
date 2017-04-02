
var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash        = require("connect-flash");
    Protal = require("./models/portals");
    Team = require("./models/teams");

var cookieParser = require('cookie-parser');
app.use(cookieParser());

mongoose.Promise = global.Promise;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));
app.use(flash());

var URL = process.env.DATABASEURL || "mongodb://localhost/slackportal"
mongoose.connect(URL);
var PORT = process.env.PORT || 3000;

router.get('/favicon.ico', function(req, res) {
    res.sendStatus(204);
});

app.get("/slack/botauth", function(req, res){
    var data = {form: {
        client_id: process.env.PORTAL_CLIENT_ID_OFBOT,
        client_secret: process.env.PORTAL_CLIENT_SECRET_OFBOT,
        code: req.query.code
    }};
    
    request.post('https://slack.com/api/oauth.access', data, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var token = JSON.parse(body).access_token;
            console.log("success with that" + JSON.parse(body));
            request.post('https://slack.com/api/team.info', {form: {token: token}}, function (error, response, body) {
                console.log("success with that too" + JSON.parse(body));
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

app.post("/openportal", function(req, res){
    // res.json({text: "okay found ya"});
    
});

app.get("/", function(req, res){
    res.render("home");
})

app.get("/:portalid", function(req, res){
    res.render("home");
})

app.listen(PORT, function() {
    console.log("The Slack Portal server has started");
});