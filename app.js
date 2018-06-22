const Discord = require(`discord.js`);
const yt = require('ytdl-core');
const botconfig = require(`./botconfig.json`);
const bot = new Discord.Client;
const fs = require(`fs`);
const superagent = require(`superagent`);
const roblox = require(`roblox-js`)

let queue = {};

const commands = {
	'play': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Add some songs to the queue first with ${botconfig.prefix}add`);
		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
		if (queue[msg.guild.id].playing) return msg.channel.sendMessage('Already Playing');
		let dispatcher;
		queue[msg.guild.id].playing = true;

		console.log(queue);
		(function play(song) {
			console.log(song);
			if (song === undefined) return msg.channel.sendMessage('Queue is empty').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.sendMessage(`Playing: **${song.title}** as requested by: **${song.requester}**`);
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : botconfig.passes });
			let collector = msg.channel.createCollector(m => m);
			collector.on('message', m => {
				if (m.content.startsWith(botconfig.prefix + 'pause')) {
					msg.channel.sendMessage('paused').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(botconfig.prefix + 'resume')){
					msg.channel.sendMessage('resumed').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(botconfig.prefix + 'skip')){
					msg.channel.sendMessage('skipped').then(() => {dispatcher.end();});
				} else if (m.content.startsWith('volume+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith('volume-')){
					if (Math.round(dispatcher.volume*50) <= 0) return msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.max((dispatcher.volume*50 - (2*(m.content.split('-').length-1)))/50,0));
					msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(botconfig.prefix + 'time')){
					msg.channel.sendMessage(`time: ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)}`);
				}
			});
			dispatcher.on('end', () => {
				collector.stop();
				play(queue[msg.guild.id].songs.shift());
			});
			dispatcher.on('error', (err) => {
				return msg.channel.sendMessage('error: ' + err).then(() => {
					collector.stop();
					play(queue[msg.guild.id].songs.shift());
				});
			});
		})(queue[msg.guild.id].songs.shift());
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t connect to your voice channel...');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'add': (msg) => {
		let url = msg.content.split(' ')[1];
		if (url == '' || url === undefined) return msg.channel.sendMessage(`You must add a YouTube video url, or id after ${botconfig.prefix}add`);
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.sendMessage('Invalid YouTube Link: ' + err);
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			msg.channel.sendMessage(`added **${info.title}** to the queue`);
		});
	},
	'queue': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Add some songs to the queue first with ${botconfig.prefix}add`);
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);});
		msg.channel.sendMessage(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'reboot': (msg) => {
		if (msg.author.id == botconfig.adminID) process.exit(); //Requires a node module like Forever to work.
	}
};

bot.on("ready", async () => {
    console.log(`KSBot premium 1 has started.`);
    bot.user.setActivity("KSBot | !help");
});

bot.on("message", async message => {
    if(message.author.bot) return;
    if(message.channel.type === "dm") return;




let prefix = botconfig.prefix;
let messageArray = message.content.split(" ");
let cmd = messageArray[0];
let args = messageArray.slice(1);

if(cmd === `${prefix}setStatus`){
if(message.author.id != "357622773121548288") return message.channel.send("Sorry you don't have permission to use that command.")
bot.user.setActivity(args.join(' '))

}

if(cmd ===`${prefix}clear`){
    if(!message.member.hasPermission("MANAGE_MESSAGES")) return message.reply("Sorry, you don't have permission to use that commands.");
    if(!args[0]) return message.channel.send("Usage: ?clear <ammount>");
    message.channel.bulkDelete(args[0]).then(() => {
        message.channel.send(`Cleared ${args[0]} messages.`).then(msg => msg.delete(5000));

    });
}
if(cmd ===`${prefix}say`){
    if(!message.member.hasPermission("MENTION_EVERYONE")) return message.reply("Sorry, you don't have permission to use that command.");
    let botmessage = args.join(" ");
    message.delete();
    message.channel.send(botmessage);
}

if(cmd ===`${prefix}8ball`){
    if(!args[1]) return message.reply("Please ask a question.");
    let replies = ["My calculations show that it is impossible", "My calculations show that it is unlikely", "My calculations show it is likely", "My calculations show it is certain"];
    let result = Math.floor((Math.random() * replies.length));
    let question = args.slice(0).join(" ");
    let ballembed = new Discord.RichEmbed()
    .setAuthor(message.author.tag)
    .setColor("#bcc64f")
    .addField("Question", question)
    .addField("Answer", replies[result])
    .setFooter("KSBot | Made by #JustOnlyFerb")
    message.channel.send(ballembed)
    return;
}
if(cmd === `${prefix}kick`){
    let kUser = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0]));
    if(!kUser) return message.channel.send("Couldn't find user.")
    let kReason = args.join(" ").slice(22);
    if(!message.member.hasPermission("KICK_MEMBERS")) return message.channel.send("Sorry, you don't have permission to use that command.")
    if(kUser.hasPermission("KICK_MEMBERS")) return message.channel.send("You can't kick that person.")
    let kickEmbed = new Discord.RichEmbed()
    .setDescription("Kick")
    .setColor("#ff9000")
    .addField("Kicked User", `${kUser}`)
    .addField("Kicked by", `<@${message.author.id}>`)
    .addField("Kicked In", message.channel)
    .addField("Time", message.createdAt)
    .addField("Reason", kReason)
    .setFooter("KSBot | Made by #JustOnlyFerb")
    let kickChannel = message.guild.channels.find(`name`, "logs");
    if(!kickChannel) return message.channel.send("Couldn't find the logs channel.")
    message.delete();
    message.guild.member(kUser).kick(kReason);
    kickChannel.send(kickEmbed)
    return;
}

    if(cmd === `${prefix}ban`){
        let bUser = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0]));
        if(!bUser) return message.channel.send("Couldn't find user.")
        let bReason = args.join(" ").slice(22);
        if(!message.member.hasPermission("BAN_MEMBERS")) return message.channel.send("Sorry, you don't have permission to use that command.")
        if(bUser.hasPermission("BAN_MEMBERS")) return message.channel.send("You can't ban that person.")
        let banEmbed = new Discord.RichEmbed()
        .setDescription("Ban")
        .setColor("#fff200")
        .addField("Banned User", `${bUser}`)
        .addField("Banned by", `<@${message.author.id}>`)
        .addField("Banned In", message.channel)
        .addField("Time", message.createdAt)
        .addField("Reason", bReason)
        .setFooter("KSBot | Made by #JustOnlyFerb")
        let banChannel = message.guild.channels.find(`name`, "logs");
        if(!banChannel) return message.channel.send("Couldn't find the logs channel.")
        message.delete();
        message.guild.member(bUser).ban(bReason);
        banChannel.send(banEmbed)
        return;
}

if(cmd === `${prefix}serverinfo`){

    let sicon = message.guild.iconURL;
    let serverembed = new Discord.RichEmbed()
    .setDescription("**Server Infomation**")
    .setColor("#6eff00")
    .setThumbnail(sicon)
    .addField("Server Names", message.guild.name)
    .addField("Created on", message.guild.createdAt)
    .addField("You Joined", message.member.joinedAt)
    .addField("Total Members", message.guild.memberCount)
    .setFooter("KSBot | Made by #JustOnlyFerb");
    message.channel.send(serverembed);
    return;
}

if(cmd === `${prefix}warn`){
    let wUser = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0]));
    if(!wUser) return message.channel.send("Couldn't find user.")
    let wreason = args.join(" ").slice(22);
    if(!message.member.hasPermission("MANAGE_MESSAGES")) return message.channel.send("Sorry, you don't have permission to use that command.")
    let warnEmbed = new Discord.RichEmbed()
    .setDescription("**Warning**")
    .setColor("#ff00b6")
    .addField("Warned User", `${wUser}`)
    .addField("Warned by", `${message.author}`)
    .addField("Channel", message.channel)
    .addField("Time", message.createdAt)
    .addField("Reason", wreason)
    .setFooter("KSBot | Made by #JustOnlyFerb");
    let warnchannel = message.guild.channels.find(`name`, "logs")
    if(!warnchannel) return message.channel.send("Couldn't find logs channel.")
    message.delete();
    warnchannel.send(warnEmbed)
    return;
}

if(cmd === `${prefix}stats`){
  let statsembed = new Discord.RichEmbed()
  .setTitle("**Stats**")
  .setColor("#42f4eb")
  .addField("**Servers currently using KSBot**", `${bot.guilds.size}`)
  .addField("**Users currently using KSBot**", `${bot.users.size}`)
  .setFooter("KSBot | Made by #JustOnlyFerb")
  message.channel.send(statsembed)
  return;
  }
if(cmd === `${prefix}botinfo`){

    let botcon = bot.user.displayAvatarURL;
    let botembed = new Discord.RichEmbed()
    .setDescription("**Bot Infomation**")
    .setColor("#05fc68")
    .setThumbnail(botcon)
    .addField("Bot Name", bot.user.username)
    .addField("Created on", bot.user.createdAt)
    .setFooter("KSBot | Made by #JustOnlyFerb");


    message.channel.send(botembed);
    return;
}

if(cmd === `${prefix}avatar`){

    let USERcon = message.author.avatarURL;
    let botembed = new Discord.RichEmbed()
    .setTitle("**Here is your avatar picture**")
    .setColor("#c413ac")
    .setThumbnail(USERcon)
    .setFooter("KSBot | Made by #JustOnlyFerb")


    message.channel.send(botembed);
    return;
}

if(cmd === `${prefix}help`){


    let helpembed = new Discord.RichEmbed()
    .setTitle("**Help**")
    .setColor("#05fc68")
    .setDescription("Here is a list of commands")
    .addField("**!say**", "!say is a command that you can use to make announcements with")//like this
    .addField("**!serverinfo**", "!serverinfo gives you a bit of infomation about the server")
    .addField("**!botinfo**", "!botinfo gives you information about the bot")
    .addField("**!kick**", "!kick is used to kick a user who isn't following the rules")
    .addField("**!ban**", "!ban is used to ban a user who isn't following the rules")
    .addField("**!8ball**", "!8ball is a command that will the probability of a question")
    .addField("**!play**", "!play will play any song that is in the queue")
    .addField("**!add**", "!add is a command that will add your choice of song to the cue. To add a song, do !add <youtube link>")
    .addField("**!pause**", "!pause is a command that pause the song that is in the queue")
    .addField("**!resume**", "!resume is a command that resumes the song that has been paused")
    .addField("**!join**", "!join makes the bot join the voice channel you are in")
    .addField("**!queue**", "!queue shows what songs are in the current queue")
    .addField("**!skip**", "!skip skipes the current song playing")
    .addField("**!avatar**", "!avatar shows your avatar image")
    .addField("**!links**", "!links give you a useful set of links")
    .addField("**!ping**", "!ping shows how much png you have")
    .addField("**!stats**", "!stats shows you how many servers and users are using KSBot.")
    .setFooter("KSBot | Made by #JustOnlyFerb")
    message.channel.send(helpembed);
    return;
}

if(cmd === `${prefix}links`){
  let linkembed = new Discord.RichEmbed()
  .setTitle("**Links**")
  .setColor("#1491cc")
  .setDescription("Here are some useful links")
  .addField("**Discord link**", "https://discord.gg/QbndjSh")
  .addField("**KSBot invite**", "https://discordapp.com/api/oauth2/authorize?client_id=449314677323857922&permissions=0&scope=bot")
  .addField("**Roblox group**", "https://www.roblox.com/My/Groups.aspx?gid=4187853")
  .addField("**Email**", "**Support@KSBot.info**")
  .setFooter("KSBot | Made by #JustOnlyFerb")
  message.channel.send(linkembed)
  return;

}
if(cmd === `${prefix}report`){
    let rUser = message.guild.member(message.mentions.users.first() || message.guild.members.get(args[0]));
    if(!rUser) return message.channel.send("Couldn't find user.")
    let reason = args.join(" ").slice(22);
    let reportEmbed = new Discord.RichEmbed()
    .setDescription("**Report**")
    .setColor("#00ffe1")
    .addField("Reported User", `${rUser}`)
    .addField("Reported by", `${message.author}`)
    .addField("Channel", message.channel)
    .addField("Time", message.createdAt)
    .addField("Reason", reason);
    let reportschannel = message.guild.channels.find(`name`, "reports")
    if(!reportschannel) return message.channel.send("Couldn't find reports channel.")
    .setFooter("KSBot | Made by #JustOnlyFerb")
    message.delete();
    reportschannel.send(reportEmbed)
    return;
}
if(cmd === `${prefix}ping`) {
    const m = await message.channel.send("Pong");
    m.edit(`Pong! ${m.createdTimestamp - message.createdTimestamp}ms.`);
  }









});




bot.login(botconfig.token);
