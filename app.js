
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
//use cookie parser everywhere
app.use(require('cookie-parser')());

var URL = process.env.DATABASEURL || "mongodb://localhost/slackportal4";
mongoose.connect(URL);
var PORT = process.env.PORT || 3000;

app.get('/favicon.ico', function(req, res) {
    res.sendStatus(204);
});

app.use(commandRoutes);

app.post("/test", function(req, res){
    console.log(req.body);
    res.send("test is working");
})

//TEAM AUTHENTICATION AND SAVING THE TEAM'S INFO IN THE DATABASE
app.get("/slack/botauth", function(req, res){
    var data = {form: {
        client_id: process.env.PORTAL_CLIENT_ID,
        client_secret: process.env.PORTAL_CLIENT_SECRET,
        code: req.query.code
    }};
    // console.log(data);
    request.post('https://slack.com/api/oauth.access', data, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var token = JSON.parse(body).access_token;
            // console.log("that's the token   " + token);
            request.post('https://slack.com/api/team.info', {form: {token: token}}, function (error, response, body) {
                //  console.log(JSON.parse(body));
                if (!error && response.statusCode == 200) {
                    var teamid = JSON.parse(body).team.id;
                    var teamname = JSON.parse(body).team.name;
                    Team.find({name: teamname, id: teamid}, function(err, foundteam){
                        if(foundteam.length > 0 && foundteam){
                            return res.send("<h1>Another person from the team already added the app.</h1>");
                        }
                        Team.create({name: teamname, id: teamid, token: token}, function(err, newteam){
                            // console.log("this is a new team " + newteam);
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
    // console.log(req.params.portalid);
    Portal.findById(req.params.portalid, function(error, portal){
        if(error){
            console.log(error);
            return res.send("That's not a valid portal address.");
        }
        if(portal !== undefined && portal !== null){
            if(req.cookies.user !== undefined){
                return res.render("home", {user: user});
            }
            res.render("home", {user: false});
        } else {
            res.send("That's not a valid portal address.");
        }
    });
    
});

//THIS IS FIRED WHEN THE USER FIRST OPENS PORTAL
app.post("/getportal", function(req, res){
    Portal.findById(req.body.portalid, function(error, portal){
        if(error){
            console.log(error);
            return res.send("error happened");
        }
        res.send(portal);
    });
});

//THIS IS FIRED WHEN THE USER INPUTS A MESSAGE
app.post("/postinput", function(req, res){
    // console.log(req.body);
    var newlog = {}
    newlog.message = req.body.message;
    newlog.sender = req.body.username;
    newlog.isfromslack = false;
    //Find the portal with the id of the url parameter. Locates a certain portal within the database and updates it to have that message in its history;
    Portal.findByIdAndUpdate(req.body.portalid, {expire: new Date()}, {new: true}).exec()
    .then(function(portal){
        // console.log((portal.teamid) + "this is the portal");
        Team.find({id: portal.teamid}).exec()
        .then(function(team){
            // console.log(team, team[0].token);
            var data = {form: {
                token: team[0].token,
                channel: portal.channelid,
                text: req.body.message,
                username: req.body.username,
                unfurl_links: true,
                unfurl_media: true
            }};
            request.post("https://slack.com/api/chat.postMessage", data, function(error, response, body){
                // console.log(body);
                res.send("done");
            })
            
        });
    });
});

// EVENT API COMMAND THAT GETS EVERY MESSAGE TYPED IN ALL TEAMS
app.post("/incoming", function(req, res){
    console.log(req.body);
    if(req.body.token !== process.env.PORTAL_VALIDATION_TOKEN){
        return res.send("You're not authorized to do that!");
    }
    if(req.body.event.message){
        return res.send("ok");
    }
    if(req.body.event.subtype === "message_deleted")  {
        console.log("a message was just deleted");
        return res.send("ok");
    }

    //CHECKING IF THE MESSAGE IS A SLASH COMMAND SO IT WONT BE DISPLAYED IN THE PORTAL
    var split = req.body.event.text.split("/");
    if(split.length === 2 && split[0] === ""){
        console.log("that was a slash command");
        return res.send("ok");
    }

    //CHECKING IF THE MESSAGE IS A PORTAL RESPONSE FOR MUTING SO IT WON'T BE DISPLAYED IN THE PORTAL
    if(req.body.event.text === "*This channel's portal is now live.*" || req.body.event.text === "*This channel's portal is now muted.*"){
        return res.send("ok");
    }
    
    // FOR RESTARTING NGROK AND RECONFIGURING THE URL 
    // res.send(req.body.challenge);
    // FIND THE PORTAL INSIDE THE DATABASE TAHT CORRESPONDS TO THAT EVENT'S CHANNEL AND TEAM IF IT EXISTS.
    Portal.find({channelid: req.body.event.channel, teamid: req.body.team_id}).exec()
    .then(function(portal){
        // console.log("the found portal" , portal);
        //CHECK IF IT EXISTS
        if(portal.length > 0){
            //CHECK IF IS MUTED
            if(portal[0].muted !== true || req.body.event.username !== undefined) {
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
                        var newlog = {};
                        var message = req.body.event.text;
                        var regex = /U([A-Z0-9]){8}/g;
                        var matched = message.match(regex);
                        newlog.message = message;
                        var info = JSON.parse(body);
                        // console.log("this is the matched items: " + matched);
                        if(matched){
                            request.post("https://slack.com/api/users.list", {form: {token: teamstoken}}, function(error, response, body) {
                                if (!error && response.statusCode == 200) {
                                    var allusers = JSON.parse(body);
                                    // console.log("these should be all the users:" + allusers.members[0]);
                                    
                                    matched.forEach(function(userid){
                                        allusers.members.forEach(function(member){
                                            // console.log("this is the comparisson " + member.id + userid);
                                            //IF THE MEMBER ID OF THE TEAM IS FOUND WITHIN ALL THE USERS OF THE TEAM THEN IT WILL REPLACED WITH THE MEMBER'S NAME
                                            if(member.id === userid){
                                                newlog.message = newlog.message.replace(userid, member.name);
                                                console.log(newlog.message);
                                            }
                                        });
                                    })
                                    // newlog.message = message;
                                    share(req, res, info, newlog, portal);
                                } else {
                                    newlog.message = message;
                                    share(req, res, info, newlog, portal);
                                }
                            });
                        } else {
                            newlog.message = message;
                            share(req, res, info, newlog, portal);
                        }
                    });
                }).catch(function(err){
                    throw err;
                }); 
            } else {
                res.send("ok");
            }    
        } else {
            res.send("ok");
        }
    }).catch(function(err){
        throw err;
    })
});

function share(req, res, info, newlog, portal){
    
    newlog.senderid = req.body.event.user;
    
    // console.log("this is the user's info: " , info);
    if(info.user !== undefined){
        newlog.sender = info.user.name;
        newlog.senderavatar = info.user.profile.image_72;
        newlog.isfromslack = true;
    } else {
        if(req.body.event.username){
            newlog.sender = req.body.event.username;
        } else {
            newlog.sender = "Bot Message";
        }
        newlog.isfromslack = false;
    }
    //FIND THE PORTAL AND PUSH IN ITS HISTORY THE NEW MESSAGE WITH ALL THE USER'S NEEDED INFO;
    Portal.findByIdAndUpdate(portal[0]._id, {$push: {history: newlog}},{new: true}).exec()
    .then(function(newportal){
        // console.log("updated portal: " + newportal);

        io.emit('new message', {message: newlog, id: portal[0]._id});
        res.send("ok");
    }).catch(function(err){
        throw err;
    });   
}


var server = app.listen(PORT, function() {
    console.log("The Slack Portal server has started.");
});

var io = require('socket.io')(server);

io.on('connection', function (socket) {
    console.log("connected");
    socket.on('disconnect', function () {
        console.log('You were disconnected!');
    });
    socket.on('userdata', function(userinfo) {
        // console.log("this is the user info !!!!!!" + userinfo);
        io.emit("allusernames", userinfo);
    });
    //Updates db users - deletes or adds
    socket.on("allusersinfo", function(everyone){
        if(everyone.length > 0){
            var names = everyone.map(function(el){return el[0]});
            Portal.findByIdAndUpdate(everyone[0][1], {users: names}, {new: true}).exec()
            .then(function(portal){
                // console.log(portal.users);
            });
        }
    })
});


