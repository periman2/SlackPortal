var mongoose = require("mongoose");

var PortalSchema = new mongoose.Schema({
    url: String,
    teamid: String,
    teamname: String,
    channelid: String,
    history: [
        {
            message: String,
            sender: String,
            senderid: String,
            senderavatar: String,
            isfromslack: Boolean
        }
    ],
    users: [],
    expireAfterSeconds: Number
});

module.exports = mongoose.model("Portal", PortalSchema);