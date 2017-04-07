$(document).ready(function(){

    var socket = io.connect();

    var globalportal = {};

    socket.on("new message", function(portal){
        var portalid = window.location.pathname.split("/")[1];
        console.log(portal);
        if(portalid === portal._id){
            globalportal = portal;
            // this is now the portal
            showchatroom(portal);
        }
    });

    var username = "portaluser";

    function getportal(){
        //this variable is the id of the portal in the database.
        var portalid = window.location.pathname.split("/")[1];
        $.ajax({
            type: "POST",
            url: "/getportal",
            data: {portalid: portalid},
            success: function(portal){
                globalportal = portal;
                showchatroom(portal);
            }
        });
    }

    $(".userinput").submit(function(){
        username = $("#username").val();
        $("#username").val("");
        return false;
    });

    $(".inputform").submit(function(){
        var message = $("#message").val();
        var portalid = window.location.pathname.split("/")[1];
        // console.log(portalid, username);
        $("input").val("");
        $.ajax({
            type: "POST",
            url: "/postinput",
            data: {message: message, username: username, portalid: portalid},
            success: function(portal) {
                // console.log(portal);
                globalportal = portal;
                showchatroom(portal);
            }
        });
        return false;
    });

    //It shows the chatroom.
    function showchatroom(portal){
        console.log(portal.history);
        var history = portal.history;
        $(".chatbody").html("");
        $(".chatbody").append("<div class='title'></div><div class='text'></div>");
        $(".text").css({
            "overflow-y": "auto",
            "height" : "80%",
            "position" : "relative"
        });
        $(".title").append("This is a portal made by the team: " + portal.teamname)
        history.forEach(function(message){
            var sender = message.sender;
            var message = message.message;
            $(".text").append("<h3>" + sender + "</h3><p>" + message + "</p>");
            $(".text").scrollTop($(".text").get(0).scrollHeight);
        });
    }

    getportal();

});