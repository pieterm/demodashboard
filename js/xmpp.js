var Settings = {
    transmittedSetpoint : -1,
    toUser : 'hit1@whiskey.ticx.boschtt.net'
};
var downgrade_requested = false;

const getMethods = (obj) => {
  let properties = new Set()
  let currentObj = obj
  do {
    Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
  } while ((currentObj = Object.getPrototypeOf(currentObj)))
  return [...properties.keys()] //.filter(item => typeof obj[item] === 'function')
}


var Arthur = {
    connection: null,

    handle_message: function (message) {
        //if ($(message).attr('from').match(/^update@identi.ca/)) {
            var body = $(message).find('html > body');
            if (body.length === 0) {
                var recfrom = message.outerHTML;
                
                body = $(message).find('body');
                if (body.length > 0) {
                    body = body.text();
                } else {
                    body = null;
                }
            }   
            
            recfrom = recfrom.substr(recfrom.indexOf('from="')+6);
            recfrom = recfrom.substr(0, recfrom.indexOf('boschtt.net')+11);
            
            if (recfrom == Settings.toUser) {
                if (body) {
                    console.log("Message received from ", recfrom, " :", body);
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
                            if (parsed.id == "/TDS/TEST/room_temperature")
                            {
                                console.log('Updating CH temperature to ', parsed.value);
                                $('#roomTemperature').html("".concat(parsed.value, '&deg;C'));
                                $('#roomTemperatureUpdateTime').text(d.getHours() + ":" + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
                            }
                            else if (parsed.id == "/TDS/TEST/actual_power_BM")
                            {
                                console.log('Updating actual power to ', parsed.value);
                                $('#actualPowerBM').html("".concat(parsed.value, ' %'));
                                $('#actualPowerBMUpdateTime').text(d.getHours() + ":" + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
                            }
                            else if (parsed.id == "/TDS/TEST/actual_power_HP")
                            {
                                console.log('Updating actual power to ', parsed.value);
                                $('#actualPowerHP').html("".concat(parsed.value, ' %'));
                                $('#actualPowerHPUpdateTime').text(d.getHours() + ":" + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
                            }
                            else if (parsed.id == "/TDS/CLOUD/temperature_setpoint")
                            {
                                console.log('Updating cloud temperature setpoint to ', parsed.value);
                                $('#setpointValue').val("".concat(parsed.value));
                            }
                            else if (parsed.id == "/UPDATE/available")
                            {
                                console.log("Updating update availability to ", parsed.value);
                                if (parsed.value == true)
                                {
                                    console.log("Making update button visible");
                                    $('#updateButton').show();
                                    $('#downgradeButton').hide();
                                }
                                else
                                {
                                    console.log("Making update button not visible");
                                    $('#updateButton').hide();
                                    if (!downgrade_requested) {
                                        $('#downgradeButton').show();
                                    }
                                }
                            }
                            else if (parsed.id == "/UPDATE/status")
                            {
                                console.log("Updating update status to ", parsed.value);
                                $('#updateStatus').text(parsed.value);
                                
                                if (downgrade_requested) {
                                    if (parsed.value.startsWith('Update image succes.')) {
                                        downgrade_requested = false;
                                        // remove the HP value
                                        var msg = $msg({to: Settings.toUser, type: 'chat'}).c('body').t('TDS SET TEST.actual_power_HP=NaN');
                                        Arthur.connection.send(msg);
                                        
                                        setTimeout(function(){ 
                                            $('#actualPowerHP').html('--');
                                            $('#actualPowerHPUpdateTime').text(d.getHours() + ":" + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
                                        }, 3000);
                                        
                                    }
                                }
                            }
                            else if (parsed.id == "/TDS/SAF/version")
                            {
                                console.log("Updating application version to V", parsed.value);
                                $('#currentApplicationVersion').text('Current application version: V'+parsed.value);
                                $('#currentApplicationVersionUpdateTime').text(d.getHours() + ":" + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
                            }
                            else if (parsed.id == "/TDS/test/throughput_test0")
                            {
                                $('#test-message0').text('test0: ' + parsed.value);
                            }
                            else if (parsed.id == "/TDS/test/throughput_test1")
                            {
                                $('#test-message1').text('test1: ' + parsed.value);
                            }
                            else if (parsed.id == "/TDS/test/throughput_test2")
                            {
                                $('#test-message2').text('test2: ' + parsed.value);
                            }
                            else if (parsed.id == "/TDS/test/throughput_test3")
                            {
                                $('#test-message3').text('test3: ' + parsed.value);
                            }
                        } catch(error) {
                            if (downgrade_requested) {
                                if (object.startsWith('Choose firmware')) {
                                    console.log("Downgrade message received");
                                    var saf = '';
                                    if (Settings.toUser == 'hit1@whiskey.ticx.boschtt.net') {
                                        // iMX8
                                        saf = 'saf_imx8_v1';
                                    } else {
                                        // iMX6
                                        saf = 'saf_v1';
                                    }
                                    var lines = object.split('\n');
                                    for(i in lines){
                                        if (lines[i].includes(saf)) {
                                            var index = lines[i].split(')');
                                            index = index[0].trim();
                                            console.log("index = ", index);
                                            var msg = $msg({to: Settings.toUser, type: 'chat'}).c('body').t('UPDATE ' + index);
                                            console.log("message = ", msg);
                                            Arthur.connection.send(msg);
                                            break;
                                        }
                                    }
                                }
                            } else {
                                console.log("Error while parsing message: ", object);
                            }
                        }
                        
                    });
                }
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
    
    $('#logout-users').text("Current user: " + data.jid.substr(0, data.jid.indexOf("@")) +
        ", connected to user: " + data.toUser.substr(0, data.jid.indexOf("@")));
    Settings.toUser = data.toUser;
});

function onTimer()
{
    console.log("2sec timer is called, we can start sending updated values");
    console.log("current (local) setpoint: " + $('#setpointValue').val());
    console.log("current (local) gas price: " + $('#gasCostValue').val());
    console.log("current (local) electricity price: " + $('#electricityCostValue').val());
    console.log("previously transmitted setpoint: "+Settings.transmittedSetpoint);
    var desiredSetpoint = $('#setpointValue').val();
    if (desiredSetpoint != Settings.transmittedSetpoint)
    {
        console.log("Transmitting setpoint update");
        if (Arthur.connection != null)
        {
           
           var msg = $msg({to: Settings.toUser, type: 'chat'})
                   .c('body').t("TDS SET CLOUD.temperature_setpoint="+desiredSetpoint);
           console.log("Sending message "+msg);
           Arthur.connection.send(msg);
           Settings.transmittedSetpoint = desiredSetpoint;
        }
    }
    else
    {
        console.log("Setpoint has not been changed");
    }
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

$(document).bind('disconnected', function () {
    console.log("Received disconnected event");
});

$(document).ready(function() {
  $('#updateButton').hide();
  $('#downgradeButton').hide();
  $('#hitUser').val('hit3@whiskey.ticx.boschtt.net');
  $('#CBxUser').val(Settings.toUser);
  
  $('#modalLoginForm').modal('show');
  $('#hitPassword').focus();
  
  //For testing (without connection):
  //setInterval(onTimer, 2000);
});

$('#loginButton').on('click',
function(evt)
{
    console.log('Triggered login with username:', $('#hitUser').val());
    $(document).trigger('connect', {
                    jid: $('#hitUser').val(),
                    password: $('#hitPassword').val(),
                    toUser: $('#CBxUser').val()
                });
                
    $('#hitPassword').val('');
    $('#modalLoginForm').modal('hide');
    
    // clean up some values
});


$('#updateButton').on('click',
function(evt)
{
    console.log("Update button was clicked. Sending magic update message...");
    var msg = $msg({to: Settings.toUser, type: 'chat'})
                .c('body').t('{"id":"/UPDATE/update","value":2222,"type":"integerValue","writable":true}');
    Arthur.connection.send(msg);
    $('#updateButton').hide();
});


$('#downgradeButton').on('click',
function(evt)
{
    console.log("Downgrade button was clicked, sending request.");
    var msg = $msg({to: Settings.toUser, type: 'chat'})
                .c('body').t('UPDATE');
    Arthur.connection.send(msg);
    downgrade_requested = true;
    $('#updateStatus').text('Sending downgrade message...');
    $('#downgradeButton').hide();
});


$('#unsubscribeTestButton').on('click',
function(evt)
{
    console.log("Unsubscribe button was clicked.");
    var msg = $msg({to: Settings.toUser, type: 'chat'})
                .c('body').t('TDS UNSUBSCRIBE test.throughput_test*');
    Arthur.connection.send(msg);
});


$('#subscribeTestButton').on('click',
function(evt)
{
    console.log("Subscribe button was clicked.");
    var msg = $msg({to: Settings.toUser, type: 'chat'})
                .c('body').t('TDS SUBSCRIBE test.throughput_test*');
    Arthur.connection.send(msg);
});


$('#logoutButton').on('click',
function(evt)
{
    console.log("Logout button was clicked.");
    Arthur.connection.disconnect();
    console.log("Disconnected");
});

$(window).on('unload', 
function() {
  if (Arthur.connection != null)
  {
    console.log("Disconnecting on unload...");
    clearInterval(onTimer);
    Arthur.connection.disconnect();
    Arthur.connection = null;
    console.log("Disconnected");
    
    $('#updateButton').hide();
    $('#downgradeButton').hide();
    $('#hitUser').val('hit3@whiskey.ticx.boschtt.net');
    $('#CBxUser').val(Settings.toUser);
  
    $('#modalLoginForm').modal('show');
    $('#hitPassword').focus();
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
