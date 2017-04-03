var mongoose = require("mongoose");

var PortalSchema = new mongoose.Schema({
    url: String,
    teamid: String,
    teamname: String,
    channelid: String,
    history: [{type: String}]
})

module.exports = mongoose.model("Portal", PortalSchema);