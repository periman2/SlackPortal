var mongoose = require("mongoose");

var PortalShema = new mongoose.Schema({
    url: String,
    teamid: String,
    teamname: String
})

module.exports = mongoose.model("Portal", PortalSchema);