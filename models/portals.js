var mongoose = require("mongoose");

var PortalSchema = new mongoose.Schema({
    url: String,
    teamid: String,
    teamname: String
})

module.exports = mongoose.model("Portal", PortalSchema);