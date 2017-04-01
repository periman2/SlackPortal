
var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash        = require("connect-flash");

var cookieParser = require('cookie-parser');
app.use(cookieParser());

mongoose.Promise = global.Promise;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/plugins"));
app.use(methodOverride("_method"));
app.use(flash());

app.use(require("express-session")({
    secret: "eisai upervolika agrioteros malakas",
    resave: false,
    saveUninitialized: false
}));

var URL = process.env.DATABASEURL || "mongodb://localhost/slackportal"
mongoose.connect(URL);
var PORT = process.env.PORT || 3000;

// app.get("*", function(req, res){
//     res.sendStatus(204);
// });

app.listen(PORT, function() {
    console.log("The Slack Portal server has started");
});