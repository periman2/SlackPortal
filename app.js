
var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash        = require("connect-flash");
    Portal = require("./models/portals");
    Team = require("./models/teams");
    request = require("request");
;
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



//TEAM AUTHENTICATION AND SAVEING THE TEAM'S INFO IN THE DDATABASE
app.get("/slack/botauth", function(req, res){
    var data = {form: {
        client_id: process.env.PORTAL_CLIENT_ID,
        client_secret: process.env.PORTAL_CLIENT_SECRET,
        code: req.query.code
    }};
    request.post('https://slack.com/api/oauth.access', data, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var token = JSON.parse(body).access_token;
            // console.log("that's the token   " + token);
            request.post('https://slack.com/api/team.info', {form: {token: token}}, function (error, response, body) {
                // console.log(JSON.parse(body));
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


//THIS IS GOING TO REDIRECT TO A HOME PAGE
app.get("/", function(req, res){
    res.render("home");
});

//THIS IS FOR WHEN A USER NAVIGATES TO THE URL OF A PORTAL
app.get("/:portalid", function(req, res){
    res.render("home");
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
        console.log(portal);
        res.send(portal);
    });
});

var server = app.listen(PORT, function() {
    console.log("The Slack Portal server has started");
});

var io = require('socket.io')(server);

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log("helloooo");
  });
});