$(document).ready(function(){

    var username = "portaluser";

    $(".userinput").submit(function(){
        username = $("#username").val();
        $("#username").val("");
        return false;
    });

    $(".inputform").submit(function(){
        var message = $("#message").val();
        var portalid = window.location.pathname.split("/")[1];
        console.log(portalid, username);
        $("input").val("");
        $.ajax({
            type: "POST",
            url: "/postinput",
            data: {message: message, username: username, portalid: portalid},
            success: function(portal) {
                console.log(portal);
            }
        });
        return false;
    });



});