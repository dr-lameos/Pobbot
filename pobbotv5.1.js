//File Dependencies
var authFile = './auth.json';
var channelFile = './channels.json';
var useChannel = require(channelFile);


// Package dependencies
const Discord = require('discord.js');
var logger = require('winston');
var auth = require(authFile);
var request = require('request');
var cheerio = require('cheerio');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
	colorize: true
});
logger.level = 'debug';

//These are all automatic
var allBase = [];
var ii = null;
var args = [];
var selectChannel = [];
var setC = null;
var alertlevels = ["attack", "low", "degrade", "all", "off"]
var newHealth = '';


// Initialize Discord Bot
const client = new Discord.Client();
client.login(auth.token);

// Bot login to Discord
client.on('ready', () => {
	logger.info('Connected as '+client.user.username);
});

//Wait while bot connects to Discord
setTimeout(botStartup, 1000);

function botStartup() {
	useChannel.forEach(function (element, i) {
		//Optional - Send message when Bot initialised
		/*

        client.channels.get(useChannel[chan].channel).send('Pobbot online');
		
	});
	*/

		//Wipe any stored health data since last startup
		useChannel[i].status = [];
		var data = JSON.stringify(useChannel);
		var fs = require("fs");
		var fileContent = data;
		setTimeout(wipeData, 1000);

		function wipeData() {
			fs.writeFileSync(channelFile, fileContent, (err) => {
				if (err) {
					console.error(err);
					return;
				};
				//    logger.info("File has been created");
			});
		}
	});
	//Do initial scan
	setTimeout(Baseload, 10000);
}

//Loads the POB status page
function Baseload() {
	request('https://discoverygc.com/forums/bases.php', function (err, resp, body) {
		if (err) {
			logger.warn(err);
		return;}
		var document = resp;

		//Bases area of page
		$ = cheerio.load(body);
		$('.base_row').each(function () {
			var baseName = $(this).find('td').eq(0).text();
			if (allBase.findIndex((item) => item.base === baseName) === -1) {
				allBase.push({
					"base": baseName,
					"health": undefined,
					"status": ""
				});
			}
			newHealth = parseFloat($(this).find('td').eq(2).text());
			ii = allBase.findIndex((item) => item.base === baseName);
			healthCompare();
			allBase[ii].health = newHealth;
		});
	});
	logger.info((new Date()).toUTCString());
	setTimeout(baseAlert, 5000);
}

//Does the health comparison
function healthCompare() {
	//Sends a message if health declines by more than 20000

	if ((allBase[ii].health - newHealth) > 0.005) {
		allBase[ii].status = 'Under Attack!';

	} else if (newHealth > allBase[ii].health) {
		allBase[ii].status = 'Repairing';

	} else if (newHealth < 10) {
		allBase[ii].status = 'Low Health';

	} else if (newHealth < allBase[ii].health) {
		allBase[ii].status = 'Degrading';

	} else if (newHealth == allBase[ii].health) {
		allBase[ii].status = 'Static';

	} else {
		// Error condition
		allBase[ii].status = 'No data';
	}
}

function baseAlert() {
	var alertMsg = '';
	useChannel.forEach(function (element, i) {
		setC = i;
		var sB = null;
		if (useChannel[i].base.length > 0) {
			useChannel[setC].base.forEach(function (element, i) {
				pobName = useChannel[setC].base[i];
				if (allBase.findIndex((item) => item.base === pobName) != -1) {
					sB = allBase.findIndex((item) => item.base === pobName);
				} else if (allBase.findIndex((item) => item.base.slice(0, -4) === pobName) != -1) {
					sB = allBase.findIndex((item) => item.base.slice(0, -4) === pobName);
				}
				if (sB != null) {
					if (useChannel[setC].level != 'off') {
						if (allBase[sB].status === 'Under Attack!' && useChannel[setC].status[i] != 'A') {
							alertMsg += '\n@everyone Emergency! ' + useChannel[setC].base[i] + ' is under attack! - ' + allBase[sB].health + '%';
							useChannel[setC].status[i] = 'A';
						}
					}
					if (useChannel[setC].level === 'all') {
						if (allBase[sB].status === 'Repairing' && useChannel[setC].status[i] != 'R') {
							alertMsg += '\nGood work pilots. ' + useChannel[setC].base[i] + ' is now repairing - ' + allBase[sB].health + '%';
							useChannel[setC].status[i] = 'R';
						}
					}
					if (useChannel[setC].level != 'off' && useChannel[setC].level != 'attack') {
						if (allBase[sB].status === 'Low Health' && useChannel[setC].status[i] != 'L') {
							alertMsg += '\n@everyone The health of ' + useChannel[setC].base[i] + ' is low - ' + allBase[sB].health + '%';
							useChannel[setC].status[i] = 'L';
						}
					}
					if (useChannel[setC].level === 'degrade' || useChannel[setC].level === 'all') {
						if (allBase[sB].status === 'Degrading' && useChannel[setC].status[i] != 'D') {
							alertMsg += '\nAttention pilots! The health of ' + useChannel[setC].base[i] + ' is degrading - ' + allBase[sB].health + '%';
							useChannel[setC].status[i] = 'D';
						}
					}
				}
				sB = null;
			});
		}

		//	setTimeout(sendAlert, 0);
		sendAlert();

		function sendAlert() {
			var chan = i;
			if (alertMsg.length > 0) {

				if (alertMsg.length >= 2000) {
					var alertMsg1 = alertMsg.substring(0, 2000);
					var alertMsg2 = alertMsg.substring(2000, 4000);
					client.channels.get(useChannel[chan].channel).send(alertMsg1);
					client.channels.get(useChannel[chan].channel).send(alertMsg2);
					if (alertMsg.length >= 4000) {
						var alertMsg3 = alertMsg.substring(4000, 6000);
						client.channels.get(useChannel[chan].channel).send(alertMsg3);
					}
				} else {
					client.channels.get(useChannel[chan].channel).send(alertMsg);
				}
				alertMsg = '';
			}
		}
	});
}


//How often to enable the monitoring - status page about every 15 minutes so 15 mins + 10 seconds here to capture) 
setInterval(function () {
	Baseload()
}, 10000 + 15 * 60 * 1000);

function addChannel() {
	useChannel.push({
		"channel": selectChannel,
		"level": "all",
		"base": [],
		"status": []
	});
	var data = JSON.stringify(useChannel);
	var fs = require("fs");
	var fileContent = data;

	fs.writeFileSync(channelFile, fileContent, (err) => {
		if (err) {
			console.error(err);
			return;
		};
		//    logger.info("File has been created");
	});
}

function remChannel() {
	for (var i = 0; i < useChannel.length; i++) {
		if (useChannel[i].channel === selectChannel) {
			useChannel.splice(i, 1);
		}
	}
	var data = JSON.stringify(useChannel);
	var fs = require("fs");
	var fileContent = data;

	fs.writeFileSync(channelFile, fileContent, (err) => {
		if (err) {
			console.error(err);
			return;
		};
		//    logger.info("File has been created");
	});
}

function addBase() {
	var oldBase = useChannel[setC].base;
	useChannel[setC].base = oldBase.concat(args);
	var data = JSON.stringify(useChannel);
	var fs = require("fs");
	var fileContent = data;

	fs.writeFileSync(channelFile, fileContent, (err) => {
		if (err) {
			console.error(err);
			return;
		};
	});
}

function remBase() {
	for (var i = 0; i < useChannel[setC].base.length; i++) {
		if (useChannel[setC].base[i] === args.join()) {
			useChannel[setC].base.splice(i, 1);
		}
	}
	useChannel[setC].status = [];
	var data = JSON.stringify(useChannel);
	var fs = require("fs");
	var fileContent = data;

	fs.writeFileSync(channelFile, fileContent, (err) => {
		if (err) {
			console.error(err);
			return;
		};
	});
}

client.on('message', message => {
	//   It will listen for messages that will start with `!`
	var channelID=message.channel.id
	if (message.content.substring(0, 1) == '!') {
		args = message.content.substring(1).split(' ');
		var cmd = args[0];
		args = args.splice(1);
		arg = args.join(' '); // = "Base 1,Base2, Base3"
		args = arg.substring().split(","); // = ["Base 1","Base2"," Base3"]

		switch (cmd) {
			//Start alerting/scanning on this channel
			case 'addpobbot':
				for (var i = 0; i < useChannel.length; i++) {
					if (useChannel != '' && useChannel[i].channel.indexOf(channelID) != -1) {
						var existsChannel = 'True';
						break;
					}
				}
				if (existsChannel === 'True') {
					message.channel.send("I'm already using this channel");

				} else {
					selectChannel = message.channel.id;
					addChannel();
					message.channel.send("I'm going to use this channel for messages");
				}
				break;
				//Stop alerting/scanning on this channel	
			case 'rempobbot':
				selectChannel = message.channel.id;
				remChannel();
				message.channel.send("I'll stop using this channel for messages");
				break;
				// Set alert level
			case 'level':
				for (var i = 0; i < useChannel.length; i++) {
					if (useChannel != '' && useChannel[i].channel.indexOf(channelID) != -1) {
						var existsChannel = 'True';
						break;
					}
				}
				if (existsChannel === 'True') {
					if (alertlevels.indexOf(arg) != -1) {
						useChannel[i].level = arg
						message.channel.send("I've set the alerts level to " + arg);
						var data = JSON.stringify(useChannel);
						var fs = require("fs");
						var fileContent = data;

						fs.writeFileSync(channelFile, fileContent, (err) => {
							if (err) {
								console.error(err);
								return;
							};
						});
					} else {
						message.channel.send("Please use a valid alerts level: attack low degrade repair off");
					}
				} else {
					message.channel.send("To use this channel for pobbot, say !addpobbot");
				}
				break;
			// use !base to get a report
			case 'base':
				for (var i = 0; i < useChannel.length; i++) {
					if (useChannel != '' && useChannel[i].channel.indexOf(channelID) != -1) {
						var existsChannel = 'True';
						setC = i;
						break;
					}
				}
				if (existsChannel === 'True') {
					if (useChannel[setC].base.length > 0) {
						baseReport();

						function baseReport() {
							var reportMsg = 'Hi ' + message.author + ". Here's how the bases are doing:";
							useChannel[setC].base.forEach(function (element, i) {
								pobName = useChannel[setC].base[i];
								var sB = null;
								if (allBase.findIndex((item) => item.base === pobName) != -1) {
									sB = allBase.findIndex((item) => item.base === pobName);
								} else if (allBase.findIndex((item) => item.base.slice(0, -4) === pobName) != -1) {
									sB = allBase.findIndex((item) => item.base.slice(0, -4) === pobName);
								}

								if (sB != null) {
									reportMsg += '\n' + useChannel[setC].base[i] + ' ' + allBase[sB].health + '% ' + allBase[sB].status
								} else {
									reportMsg += '\n' + useChannel[setC].base[i] + " Base doesn't exist"
								}
							});
							setTimeout(sendReport, 1000);

							function sendReport() {
								if (reportMsg.length >= 2000) {
									var longMsg1 = reportMsg.substring(0, 2000);
									var longMsg2 = reportMsg.substring(2000, 4000);
									var longMsg3 = reportMsg.substring(4000, 6000);
									setTimeout(longReport, 1000);

									function longReport() {
										message.channel.send(longMsg1);
										setTimeout(longReport2, 500);

										function longReport2() {
											message.channel.send(longMsg2);
										}
										if (reportMsg.length >= 4000) {
											setTimeout(longReport3, 1000);

											function longReport3() {
												message.channel.send(longMsg3);
											}
										}
									}
								} else {
									message.channel.send(reportMsg);
								}
							}
						}
					} else {
						message.channel.send("You haven't added any bases - use !addbase <name>");
					}

				} else {
					message.channel.send("To use this channel for pobbot, say !addpobbot")
				}
				break;
				//Add bases to monitoring
			case 'addbase':
				for (var i = 0; i < useChannel.length; i++) {
					if (useChannel != '' && useChannel[i].channel.indexOf(channelID) != -1) {
						var existsChannel = 'True';
						setC = i;
						break;
					}
				}
				if (existsChannel === 'True' && args == 0) {
					message.channel.send("You need to name a base");
				} else if (existsChannel === 'True') {
					message.channel.send("I've added " + args + ' to my monitors');
					addBase();
				} else {
					message.channel.send("To use this channel for pobbot, say !addpobbot");
				}
				break;
				// Remove bases from monitoring & reset statistics
			case 'rembase':
				for (var i = 0; i < useChannel.length; i++) {
					if (useChannel != '' && useChannel[i].channel.indexOf(channelID) != -1) {
						var existsChannel = 'True';
						setC = i;
						break;
					}
				}
				if (existsChannel === 'True') {
					message.channel.send("I've removed " + args + ' from my monitors.');
					remBase();

				} else {
					message.channel.send("To use this channel for pobbot, say !addpobbot");
				}
				break;
				//Get help text
			case 'help':
				message.channel.send("pobbot monitors your base health and will send alerts on status changes\nIt currently supports the following commands:\n!addpobbot - *Deploy pobbot on this channel*\n!rempobbot - *Remove pobbot from this channel*\n!addbase - *Start monitoring a base*\n!rembase - *Stop monitoring a base*\n!base - *A report of the current base status*\n!level - *Set your level of alerting*\n!help - *What you're currently looking at*");
				break;
		}
		switch (true){
			case /hello|Guten/.test(message):
				message.channel.send('Greetings ' + message.author);
				break;
			case /who|name/.test(message):
				message.channel.send('I am Pobbot Cubpizza');
				break;
		}
	}
});