var mongoose = require("mongoose");

var PortalSchema = new mongoose.Schema({
    url: String,
    teamid: String,
    teamname: String,
    channelid: String,
    channelname: String,
    creator: {name: String, id: String},
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
    muted: Boolean,
    expire: { type: Date, expire: 172800, default: new Date() }
});

module.exports = mongoose.model("Portal", PortalSchema);