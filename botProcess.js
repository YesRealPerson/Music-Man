// library setup

const youtubedl = require('youtube-dl-exec');

const { createReadStream } = require('node:fs');

const path = require('path');

const {
  Client,
  GatewayIntentBits,
  messageLink
} = require('discord.js');

const {
  getVoiceConnections,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  joinVoiceChannel,
  entersState,
  createAudioPlayer,
  NoSubscriberBehavior,
  createAudioResource,
  StreamType,
  getVoiceConnection,
} = require('@discordjs/voice');

require('dotenv').config()
const token = process.env.TOKEN;

//bot setup

const client = new Client(
  {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
  });

const queueName = [];

const queueVideo = [];

var currentAudio;

const options = {
  'format': 'bestaudio/best',
  'default-search': 'ytsearch',
  'no-playlist': true,
  'restrict-filenames': true,
  'no-check-certificates': true,
  'ignore-errors': false,
  'quiet': true,
  'no-warnings': true,
  'source-address': '0.0.0.0',
  'o': "temp/%(id)s.%(ext)s",
  'print': "after_move:%(id)s.%(title)s",
  'extract-audio': true,
};

//yt-dl setup

const downloadResource = (url) => {
  return new Promise((resolve, reject) => {
    try {
      youtubedl('ytsearch:' + url, options).then(output => {
        title = output.split(".");
        id = title[0];
        title = title.slice(1).join(".");
        queueName.push(title);
        const resource = createAudioResource(
          path.join(__dirname, 'temp/' + id + ".opus"),
          {
            inputType: StreamType.Opus
          }
        );
        queueVideo.push(resource);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

//player setup

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  }
});

const playNext = (interaction) => {
  const connection = getVoiceConnection(interaction.guildId);
  player.play(queueVideo[0]);
  connection.subscribe(player);
};

player.on(AudioPlayerStatus.Playing, () => {
  console.log('The audio player is playing!');
});

player.on(AudioPlayerStatus.Idle, () => {
  console.log('The audio player is idle!');
  queueName.shift();
  queueVideo.shift();
  var connections = getVoiceConnections();
  console.log(connections);
  playNext();
});

//bot process

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  console.log("recieved interaction");

  const join = async (interaction) => {
    let channelInfo = interaction.member.voice.channel
    const connection = joinVoiceChannel({
      channelId: channelInfo.id,
      guildId: channelInfo.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
      return connection;
    } catch (error) {
      connection.destroy();
      throw error;
    }
  };

  if (interaction.commandName === 'join' || interaction.commandName === 'j') {
    let channelInfo = interaction.member.voice.channel;
    if (channelInfo != undefined) {
      await interaction.reply(`Joining ${channelInfo.name}`);
      await join(interaction);
      await interaction.editReply(`Joined ${channelInfo.name}`);
    } else {
      await interaction.reply(`You need to be in a voice channel`);
    }

  }

  else if (interaction.commandName === 'disconnect' || interaction.commandName === 'd') {
    try {
      const connection = getVoiceConnection(interaction.guildId);
      await player.stop();
      await connection.destroy();
      await interaction.reply("Disconnecting from the channel");
    } catch (error) {
      console.log(error);
      await interaction.reply("Not in a channel");
    }

  }

  else if (interaction.commandName === 'pause' || interaction.commandName === 'pa') {
    if (!player.unpause()) {
      await player.pause();
      await interaction.reply("Paused audio playback");
    }
    else {
      await interaction.reply("Unpaused audio playback");
    }
  }

  else if (interaction.commandName === 'play' || interaction.commandName === 'p') {
    //push URL to queueURL element
    //push name to queueName element
    //use shift to remove after playing
    let channelInfo = interaction.member.voice.channel;
    if (channelInfo != undefined) {
      await interaction.reply(`Joining ${channelInfo.name}`);
      // const connection = await join(interaction);
      await join(interaction);
      await interaction.editReply(`Joined ${channelInfo.name}`);

      let toPlay = interaction.options.getString('url');

      await interaction.editReply("Processing request");

      await downloadResource(toPlay).then(async () => {
        await interaction.editReply("Added " + queueName[queueName.length - 1] + " to queue");
      });

      // player.play(resource);

      // connection.subscribe(player);

      playNext(interaction);
    } else {
      await interaction.reply(`You need to be in a voice channel`);
    }
  }

  else if (interaction.commandName === 'queue' || interaction.commandName === 'q') {
    let queueList = "Up next:";
    let i = 0;
    let none = true;
    queueName.forEach(n => {
      if (i != 0) {
        queueList += `\n${i}. ${n}`;
        none = false;
      }
      i++;
    });
    if (none) {
      queueList = "No songs in queue";
    }
    interaction.reply(queueList);
  }

  else if (interaction.commandName === 'test') {
    console.log("test");
    await interaction.reply('Test');
  }

});

client.login(token);