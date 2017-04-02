var mongoose = require("mongoose");

var TeamSchema = new mongoose.Schema({
    name: String,
    id: String,
    token: String
});

module.exports = mongoose.model("Team", TeamSchema);