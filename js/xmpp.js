var Arthur = {
    connection: null,

    handle_message: function (message) {
        //if ($(message).attr('from').match(/^update@identi.ca/)) {
            var body = $(message).find('html > body');
            if (body.length === 0) {
                body = $(message).find('body');
                if (body.length > 0) {
                    body = body.text();
                } else {
                    body = null;
                }
            }      
            
            if (body) {
                console.log("Message received! :", body);
                var div = $("<div>");
                div.append(body)
                div.append($("</div>"));
                div.prependTo('#stream');
                var jsons = body.split(/(?={)/);
                jsons.forEach(function(object) {
                    try {
                        var parsed = JSON.parse(object);
                        console.log("Decoded JSON object:", parsed);
                        var d = new Date(); // for now
                        /* /TDS/xCU_HP/ch_temperature */
                        if (parsed.id == "/TDS/xCU_HP/ch_temperature")
                        {
                            console.log('Updating CH temperature to ', parsed.value);
                            $('#roomTemperature').html("".concat(parsed.value, '&deg;C'));
                            $('#roomTemperatureUpdateTime').text(d.getHours() + ":" + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
                        }
                        else if (parsed.id == "/TDS/xCU_HP/actual_power")
                        {
                            console.log('Updating actual power to ', parsed.value);
                            $('#actualPower').html("".concat(parsed.value, ' Watt'));
                            $('#actualPowerUpdateTime').text(d.getHours() + ":" + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
                        }
                        else if (parsed.id == "/UPDATE/available")
                        {
                            console.log("Updating update availability to ", parsed.value);
                            if (parsed.value == true)
                            {
                                console.log("Making update button visible");
                                $('#updateButton').show();
                            }
                        }
                        else if (parsed.id == "/UPDATE/status")
                        {
                           console.log("Updating update status to ", parsed.value);
                           $('#updateStatus').text(parsed.value);
                        }
                        else if (parsed.id == "/TDS/SAF/version")
                        {
                            console.log("Updating application version to V", parsed.value);
                            $('#currentApplicationVersion').text('Current application version: V'+parsed.value);
                            $('#currentApplicationVersionUpdateTime').text(d.getHours() + ":" + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
                        }
                    } catch(error) {
                        console.log("Error while parsing message: ", object);
                    }
                    
                });
            }
        return true;
    }
};

$(function () {
    $('#input').keyup(function () {
        var left = 140 - $(this).val().length;
        $('#counter .count').text('' + left);
    });

    $('#input').keypress(function (ev) {
        if (ev.which === 13) {
            ev.preventDefault();
            
            var text = $(this).val();
            $(this).val('');

            var msg = $msg({to: 'hit4@whiskey.ticx.boschtt.net', type: 'chat'})
                .c('body').t(text);
            Arthur.connection.send(msg);
        }
    });
});

$(document).bind('connect', function (ev, data) {
    var conn = new Strophe.Connection(
        "https://conversejs.org/http-bind/");

    conn.connect(data.jid, data.password, function (status) {
        if (status === Strophe.Status.CONNECTED) {
            $(document).trigger('connected');
        } else if (status === Strophe.Status.DISCONNECTED) {
            $(document).trigger('disconnected');
        }
    });

    Arthur.connection = conn;
});

function onTimer()
{
    console.log("2sec timer is called, we can start sending updated values");
}

$(document).bind('connected', function () {
    console.log('Connected to HIT platform');
    Arthur.connection.addHandler(Arthur.handle_message,
                                 null, "message", "chat");
    Arthur.connection.send($pres());
    //var msg = $msg({to: 'hit1@whiskey.ticx.boschtt.net', type: 'chat'})
    //            .c('body').t("TDS GET *.*");
    //Arthur.connection.send(msg);
    setInterval(onTimer, 2000);
});



$(document).bind('onTimer', function() {
    console.log("5sec timer is called");
});

$(document).bind('disconnected', function () {
    console.log("Received disconnected event");
});

$(document).ready(function() {
  $('#updateButton').hide();
  $('#hitUser').val('hit3@whiskey.ticx.boschtt.net');
  
  $('#modalLoginForm').modal('show');
  $('#hitPassword').focus();
  
});

$('#loginButton').on('click',
function(evt)
{
    console.log('Triggered login with username:', $('#hitUser').val());
    $(document).trigger('connect', {
                    jid: $('#hitUser').val(),
                    password: $('#hitPassword').val()
                });
                
                $('#hitPassword').val('');
                $('#modalLoginForm').modal('hide');
});


$('#updateButton').on('click',
function(evt)
{
    console.log("Update button was clicked. Sending magic update message...");
    var msg = $msg({to: 'hit1@whiskey.ticx.boschtt.net', type: 'chat'})
                .c('body').t('{"id":"/UPDATE/update","value":2222,"type":"integerValue","writable":true}');
    Arthur.connection.send(msg);
    $('#updateButton').hide();

});

$(window).on('unload', 
function() {
  if (Arthur.connection != null)
  {
    console.log("Disconnecting on unload...");
    Arthur.connection.disconnect();
    console.log("Disconnected");
  }
});

$(document).on('click', '.number-spinner button', function () {    
	var btn = $(this),
		oldValue = btn.closest('.number-spinner').find('input').val().trim(),
		newVal = 0;
	
	if (btn.attr('data-dir') == 'up') {
		newVal = parseInt(oldValue) + 1;
	} else {
		if (oldValue > 1) {
			newVal = parseInt(oldValue) - 1;
		} else {
			newVal = 1;
		}
	}
	btn.closest('.number-spinner').find('input').val(newVal);
});
