//TODO
//MAKE ALL MESSAGES INTO EMBEDS

// library setup

const youtubedl = require('youtube-dl-exec');

const fs = require('fs');

const path = require('path');

const {
  Client,
  GatewayIntentBits,
  messageLink,
  ActivityType,
  EmbedBuilder
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

let queueName = [];

let queueVideo = [];

let queuePath = [];

let queueId = [];

let currentSong = "none";

let currentID = "none";

let repeat = false;

//yt-dl setup

const downloadResource = (url) => {
  let currentTime = new Date().getTime();

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
    'o': "temp/%(id)s," + currentTime + "." + "%(ext)s",
    'print': "after_move:%(id)s," + currentTime + ".%(title)s",
    'extract-audio': true,
  };

  return new Promise((resolve, reject) => {
    try {
      youtubedl('ytsearch:' + url, options).then(output => {
        title = output.split(".");
        id = title[0];
        title = title.slice(1).join(".");
        queueName.push(title);
        queuePath.push(path.join(__dirname, 'temp/' + id + ".opus"));
        queueId.push(id.split(',')[0]);
        const resource = createAudioResource(
          path.join(__dirname, 'temp/' + id + ".opus"),
          {
            inputType: StreamType.Opus
          }
        );
        queueVideo.push(resource);
      }).then(() => {
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

const playNext = async (connection) => {
  try {
    console.log(queueId);
    currentSong = queueName[0];
    client.user.setActivity(queueName[0], { type: ActivityType.Playing });
    currentID = queueId[0];
    await player.play(queueVideo[0]);
    await connection.subscribe(player);
  } catch (err) {
    currentSong = "none";
    client.user.setActivity('/help for commands!', { type: ActivityType.Playing });
    currentID = "none"
    // console.log(err);
    // console.log("reached end of queue");
  }
};

const clearQueue = () => {
  queueName = [];
  queueVideo = [];
}

const garbageCollector = async (path, attempts) => {
  if (attempts < 5) {
    console.log(path);
    await new Promise(r => setTimeout(r, 2500));
    try {
      fs.unlink(path, err => {
        if (err) {
          garbageCollector(path, attempts + 1);
        }
      });
    } catch (err) {
      console.log(err);
    }
  }


}

player.on(AudioPlayerStatus.Idle, async () => {
  // console.log('The audio player is idle!');
  fs.unlink(queuePath[0], err => {
    if (err) {
      garbageCollector(queuePath[0], 0);
    }
  });
  if (repeat) {
    // console.log("readding song");
    await downloadResource(currentID);
  }
  currentSong = "none";
  client.user.setActivity('/help for commands!', { type: ActivityType.Playing });
  currentID = "none";
  queueName.shift();
  queueVideo.shift();
  queuePath.shift();
  queueId.shift();
  // console.log(queueName);
  // console.log(queueVideo);
  var connections = getVoiceConnections();
  connections.forEach(connection => {
    playNext(connection);
  });
});

//bot process

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('/help for commands!', { type: ActivityType.Playing });
});

client.on('interactionCreate', async interaction => {
  // console.log("recieved interaction");

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
      let joinEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Joining ${channelInfo.name}`);
      await interaction.reply({ embeds: [joinEmbed] });
      await join(interaction);
      joinEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Joined ${channelInfo.name}`);
      await interaction.editReply({ embeds: [joinEmbed] });
    } else {
      let joinEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`You need to be in a voice channel`);
      await interaction.reply({ embeds: [joinEmbed] });
    }

  }

  else if (interaction.commandName === 'disconnect' || interaction.commandName === 'd') {
    try {
      const connection = getVoiceConnection(interaction.guildId);
      await player.stop();
      await connection.destroy();
      let disconnectEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Disconnected");
      await interaction.reply({ embeds: [disconnectEmbed] });
      clearQueue();
    } catch (error) {
      let disconnectEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Not currently connected to any channel");
      await interaction.reply({ embeds: [disconnectEmbed] });
    }

  }

  else if (interaction.commandName === 'pause' || interaction.commandName === 'pa') {
    if (!player.unpause()) {
      let pauseEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Paused audio playback");
      await player.pause();
      await interaction.reply({ embeds: [pauseEmbed] });
    }
    else {
      let pauseEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Unpaused audio playback");
      await interaction.reply({ embeds: [pauseEmbed] });
    }
  }

  else if (interaction.commandName === 'play' || interaction.commandName === 'p') {
    let channelInfo = interaction.member.voice.channel;
    if (channelInfo != undefined) {
      let playEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Joining ${channelInfo.name}`);
      await interaction.reply({ embeds: [playEmbed] });
      await join(interaction);
      playEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Joined ${channelInfo.name}`);
      await interaction.editReply({ embeds: [playEmbed] });

      let toPlay = interaction.options.getString('url');

      playEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Processing request")
        .setDescription("Please wait...");
      await interaction.editReply({ embeds: [playEmbed] });

      await downloadResource(toPlay).then(async () => {
        playEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle("Added " + queueName[queueName.length - 1] + " to queue")
          .setURL("https://www.youtube.com/watch?v=" + queueId[queueName.length - 1]);
        await interaction.editReply({ embeds: [playEmbed] });
      });

      playNext(getVoiceConnection(interaction.guildId));
    } else {
      let playEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`You need to be in a voice channel`);
      await interaction.reply({ embeds: [playEmbed] });
    }
  }

  else if (interaction.commandName === 'queue' || interaction.commandName === 'q') {
    let queueList = "\n**Currently playing:**  " + currentSong + "\n\nUp next:";
    let i = 0;
    let none = true;
    queueName.forEach(n => {
      if (i != 0) {
        queueList += `**\n${i}.** ${n}`;
        none = false;
      }
      i++;
    });
    if (none) {
      queueList = "\n**Currently playing:**  " + currentSong + "\n\nNo songs in queue";
    }
    let queueEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle("Queue")
      .setDescription(queueList);
    interaction.reply({embeds: [queueEmbed]});
  }

  else if (interaction.commandName === 'skip' || interaction.commandName === 'fs') {
    garbageCollector(queuePath[0], 0);
    const connection = getVoiceConnection(interaction.guildId);
    player.stop();
    playNext(connection);
    const skipEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Skipped current song');
    await interaction.reply({ embeds: [skipEmbed] });
  }

  else if (interaction.commandName === 'repeat' || interaction.commandName === 'r') {
    repeat = !repeat;
    if (repeat) {
      const repeatEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Now repeating the current song list');
      await interaction.reply({ embeds: [repeatEmbed] });
    } else {
      const repeatEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('No longer repeating the current song list');
      await interaction.reply({ embeds: [repeatEmbed] });
    }
  }

  else if (interaction.commandName === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Help')
      .addFields(
        { name: '/play', value: 'Plays the audio from a YouTube video\n usage: /play {YouTube URL or Search Query}' },
        { name: '/pause', value: 'Pauses the current song' },
        { name: '/queue', value: 'Sends the currently playing song and the songs in the queue' },
        { name: '/repeat', value: 'Repeats the current song list (it is still possible to add songs to the queue)' },
        { name: '/skip', value: 'Skips the currently playing song' },
        { name: '/join', value: 'Joins the voice channel of whoever sent the command' },
        { name: '/disconnect', value: 'Disconnects the bot from the currently connected voice channel' },
      );
    await interaction.reply({ embeds: [helpEmbed] });
  }

  else if (interaction.commandName === 'test') {
    console.log("test");
    const testEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Testing')
      .setDescription('I hate coding');
    await interaction.reply({ embeds: [testEmbed] });
  }

});

client.login(token);