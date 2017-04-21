$(document).ready(function(){

    var socket = io.connect();
    
    var stableusername;

    socket.on("disconnect", function(){
        socket.emit("deluser", {users: username});
    });
    
    socket.on("new message", function(portal){
        var portalid = window.location.pathname.split("/")[1];
        // console.log(portal);
        if(portalid === portal._id){
            showchatroom(portal);
        }
    });

    var allusers = [];
    var thisuser = false;
    var portalid = window.location.pathname.split("/")[1];

    setInterval(function(){
        socket.emit("userdata", [thisuser, portalid]);
    }, 2000);

    // user openin portal > user emiting false username > back end catching that > back end giving back all usernames

    socket.on("allusernames", function(username){
        if(allusers.length === 0 && username[0] !== false){
            allusers.push(username);
        } else if (username[0] !== false && portalid === username[1]) {
            checkArrs(allusers, username);
        }
        console.log("this is the all users array : ", allusers);
        isuser = false;
        if(allusers.length > 0){
            isuser = checkIfItsThere(allusers, [username, portalid]);
        } else {
            isuser = false;
        }
        
        if(isuser === false){
            thisuser = stableusername;
            socket.emit("userdata", [thisuser, portalid]);
            $('.userinput').hide();
            $(".chatbody").show();
            $(".inputform").show();
            // getportal();
            $("#username").val("");
        } else {
            alert("This username is already take for this session. Please choose another one.");
        }
    });

    function checkArrs(array, element) {
        var isitinthere = false;
        for (var i = 0; i < array.length; i++) {
            if (array[i][0] === element[0]) {
                isitinthere = true;
            }
        }
        if(isitinthere === false){
            array.push(element);
        }
        return array;
    }

    function checkIfItsThere(array, element) {
        var isitinthere = false;
        for (var i = 0; i < array.length; i++) {
            if (array[i][0] === element[0]) {
                isitinthere = true;
            }
        }

        return isitinthere;
    }


    function getportal(){
        //this variable is the id of the portal in the database.
        var portalid = window.location.pathname.split("/")[1];
        $.ajax({
            type: "POST",
            url: "/getportal",
            data: {portalid: portalid},
            success: function(portal){
                showchatroom(portal);
            }
        });
    }

    $(".userinput").submit(function(){
        stableusername = $("#username").val();
        var portalid = window.location.pathname.split("/")[1];
        console.log(stableusername, isuser);
        //Comair that username with all the others.
        isuser = false;
        if(allusers.length > 0){
            isuser = checkIfItsThere(allusers, [username, portalid]);
        } else {
            isuser = false;
        }
        
        if(isuser === false){
            thisuser = stableusername;
            socket.emit("userdata", [thisuser, portalid]);
            $('.userinput').hide();
            $(".chatbody").show();
            $(".inputform").show();
            getportal();
            $("#username").val("");
        } else {
            alert("This username is already take for this session. Please choose another one.");
        }
        return false;
    });

    // window.onbeforeunload = function() {
    //     var portalid = window.location.pathname.split("/")[1];
    //     $.ajax({
    //         type: "POST",
    //         url: "/deleteusers",
    //         asynch: false,
    //         data: {username: username, portalid: portalid},
    //         success: function() {
    //         },
    //         error: function(err){
    //             console.log(err);
    //         }
    //     });
    // };
    

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
            }
        });
        return false;
    });

    //It shows the chatroom.
    function showchatroom(portal){
        // console.log(portal.history);
        var history = portal.history;
        $(".chatbody").html("");
        $(".portaltitle").html("");
        $(".portaltitle").append("<div class='title'></div>");
        $('.chatbody').append("<div class='text'></div>");
        $(".title").append("<h2 class='titleline1'>This is a portal made by the team: <span class='colortitle'> " + portal.teamname  + "</span></h2><h3 class='titleline2'>within the channel: <span class='colortitle'> " + portal.channelname + "</span></h3><h3 class='titleline3'>Its creator: <span class='colortitle'> " + portal.creator.name  + "</span></h3>")
        $(".text").css({
            "overflow-y": "scroll",
            "height" : "100%",
            "position" : "relative"
        });
        history.forEach(function(message){
            // console.log(message);
            var sender = message.sender;
            // console.log(message.message, "this is the message");
            var text = message.message.replace(/(<|>)/ig,"");
            // var avatar = message.senderavatar;
            // console.log("this is the messge" , message);
            if (message.isfromslack) {
                var avatar = message.senderavatar;
            } else {
                var avatar = "./portaluser.png";
            }
            text = emojione.shortnameToImage(text);
            $(".text").append(
                "<div class='avattext'><img src=" + avatar + " alt='avatar' class='avatar'>" + "<div class='flexnone'><h3>" + sender + "</h3><p>" + text + "</p></div></div>");
        });
        $(".text").scrollTop($(".text").get(0).scrollHeight);
    }
    
    

});
