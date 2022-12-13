// library setup

const { 
    Client, 
    GatewayIntentBits, 
    messageLink
} = require('discord.js');

const { 
    VoiceConnectionStatus, 
    AudioPlayerStatus, 
    joinVoiceChannel, 
    entersState,
    createAudioPlayer,
    NoSubscriberBehavior,
} = require('@discordjs/voice');

const adapters = new Map

const { join } = require('path');

require('dotenv').config()
const token = process.env.TOKEN;

//bot setup

const client = new Client(
    { 
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] 
    });

const player = createAudioPlayer({
    behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
    }
});

var queueName = [];
var queueURL = [];

var connection;

//bot process

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  else if (interaction.commandName === 'join' || interaction.commandName === 'j') {
    try{
        let channelInfo = interaction.member.voice.channel
        connection = joinVoiceChannel({
            channelId: channelInfo.id,
            guildId: channelInfo.guildId,
        });
        await interaction.reply(`Joining ${channelInfo.name}!`);
    }catch(error){
        console.log(error);
        await interaction.reply("You need to be in a voice channel!");
    }
  }

  else if (interaction.commandName === 'leave' || interaction.commandName === 'l') {
    console.log("stop audio");
    await player.stop();
    await interaction.reply("Stopped audio playback!");
  }

  else if (interaction.commandName === 'pause' || interaction.commandName === 'pa') {
    console.log("pause audio");
    if(AudioPlayerStatus.Playing) {
        await player.pause();
        await interaction.reply("Paused audio playback!");
    }
    else {
        await player.unpause();
        await interaction.reply("Unpaused audio playback!");
    }
  }

  else if (interaction.commandName === 'play' || interaction.commandName === 'p') {
    //push URL to queueURL element
    //push name to queueName element
    //add " " (a space) before all name elements
    //use shift to remove after playing
    console.log("play audio");
    let source = "ERROR";
    interaction.reply(`Added ${source} to queue!`);
  }

  else if (interaction.commandName === 'queue' || interaction.commandName === 'q') {
    let queueList = "";
    queueList += "1. " + queueName[0];
    let i = 0;
    queueName.forEach(n => {
        if(i != 0){
            queueList += `\n${i+1}. `+n;
        }
        i++;
    });
    interaction.reply("Up next: \n"+queueList);
  }

  else if (interaction.commandName === 'test') {
    console.log("test");
    await interaction.reply('Test');
  }

});

client.login(token);