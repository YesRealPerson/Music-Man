// TODO
// ADD COMMENTS TO CODE 
// MAKE INSTANCED VARIABLES AND PLAYERS PER GUILD

// library setup

const youtubedl = require('youtube-dl-exec');

const fs = require('fs');

const path = require('path');

const {
  Client,
  GatewayIntentBits,
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

// bot setup

const client = new Client(
  {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
  });

// variable setup

// queues
let queue = [];

// currently playing info
let currentSong = "none";

let currentID = "none";

// repeat mode
let repeat = false;

// yt-dl setup

const downloadResource = (url) => {
  // get current millis since 1970
  let currentTime = new Date().getTime();

  // setup options for download
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
    'o': "temp/%(id)s." + currentTime + "." + "%(ext)s",
    'print': "after_move:%(id)s." + currentTime + ".%(title)s",
    'extract-audio': true,
  };
  /*
  Writes file to {youtube id},{current time since 1970}.opus
  Outputs {youtube id},{current time since 1970}.{name of video}

  Example
  File: "O7LhwU-jfNA.1671040415099.opus"
  Output: "O7LhwU-jfNA.1671040415099.GO ANTI GO"
  */

  return new Promise((resolve, reject) => {
    try {
      // download using options and given url
      youtubedl('ytsearch:' + url, options).then(output => {
        /*split output into ID section and title section
        [0] YouTube ID
        [1] Timestamp
        [2] Title
        */
        output = output.split(".");
        let id = output[0];
        let time = output[1];
        let title = output[2];

        // create resource object
        const resource = createAudioResource(
          path.join(__dirname, 'temp/' + id + "." + time + ".opus"),
          {
            inputType: StreamType.Opus
          }
        );

        // create song object
        const song = {
          'title': title,
          'id': id,
          'path': path.join(__dirname, 'temp/' + id + "." + time + ".opus"),
          'resource': resource,
        };
        // push song of video to queue
        queue.push(song);
      }).then(() => {
        // send success
        resolve();
      });
    } catch (error) {
      // error send unsuccessful
      reject(error);
    }
  });
}

// player setup

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  }
});

// play the next song
const playNext = async (connection) => {
  try {
    // set current song and id to first song in queue
    currentSong = queue[0].title;
    currentID = queue[0].id;
    // set activity to Playing {name of video}
    client.user.setActivity(currentSong, { type: ActivityType.Playing });
    // send resource from first song in queue to player
    await player.play(queue[0].resource);
    // send player to current connection
    await connection.subscribe(player);
  } catch (err) {
    // generally the error occurs when there is no song object in the array
    // therefore we can assume there are no songs left in queue

    // set current song and id to none
    currentSong = "none";
    currentID = "none"
    // set activity to default
    client.user.setActivity('/help for commands!', { type: ActivityType.Playing });
  }
};

// empties the queue (very self-explanatory)
const clearQueue = () => {
  currentID = "";
  currentSong = "";
  queue = [];
}

// collects garbage
// this function is usually called when original garbage collection fails, tries an additional 5 times until erroring out
const garbageCollector = async (path, attempts) => {
  if (attempts < 5) {
    await new Promise(r => setTimeout(r, 2500));
    try {
      // deletes file at path
      fs.unlink(path, (err => {
        if (err) {
          // if unsuccessful retry
          garbageCollector(path, attempts + 1);
        } else {
          // if successful don't need to do anything
          // console.log(path+" deleted sucessfully");
        }
      }));
    } catch (err) {
      // if major error log it
      console.log(err);
    }
  }
  else {
    // if major error log it
    // most likely in this case the file was successfully cleared by another garbage collector
    console.log(path + " failed to delete");
  }
}

// when player goes idle (no sound playing) run this
player.on(AudioPlayerStatus.Idle, async () => {
  console.log("idle");
  // delete old audio file
  fs.unlink(queue[0].path, err => {
    if (err) {
      // if failed to delete
      // let garbage collector try again
      garbageCollector(queue[0].path, 0);
    } else {
      // success
      // console.log(queue[0].path+" deleted sucessfully");
    }
  });

  // if repeat mode is on send current song back to the end of the queue
  if (repeat) {
    await downloadResource(currentID);
  }

  // set current song and id, and activity to default
  currentSong = "none";
  currentID = "none";
  client.user.setActivity('/help for commands!', { type: ActivityType.Playing });

  // remove first element from array
  queue.shift();

  // get connections and play next song for each one
  var connections = getVoiceConnections();
  connections.forEach(connection => {
    console.log(connection.joinConfig.guildId);
    playNext(connection);
  });
});

// bot process

// when bot is ready
client.on('ready', () => {
  // log that the bot is ready
  console.log(`Logged in as ${client.user.tag}`);
  // set default bot activity
  client.user.setActivity('/help for commands!', { type: ActivityType.Playing });
});

// when someone interacts with the bot
client.on('interactionCreate', async interaction => {
  // join function
  const join = async (channelInfo) => {
    // create new connection info 
    const connection = joinVoiceChannel({
      channelId: channelInfo.id,
      guildId: channelInfo.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });
    try {
      // try to use connection information to connect bot to VC
      await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
      return connection;
    } catch (error) {
      // connection unsuccessful, delete connection and log an error
      connection.destroy();
      console.log("Could not join channel!")
      console.log(error);
    }
  };

  // Join command
  if (interaction.commandName === 'join' || interaction.commandName === 'j') {
    // get channel ID
    let channelInfo = interaction.member.voice.channel;
    // if user's VC exists
    if (channelInfo != undefined) {
      // create joining message
      let joinEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Joining ${channelInfo.name}`);
      // send joining message
      await interaction.reply({ embeds: [joinEmbed] });
      // call join function
      await join(channelInfo);
      // update joining message to joined
      joinEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Joined ${channelInfo.name}`);
      // send joined message
      await interaction.editReply({ embeds: [joinEmbed] });
    } else {
      // User's VC does not exist
      // create message
      let joinEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`You need to be in a voice channel`);
      // send message
      await interaction.reply({ embeds: [joinEmbed] });
    }

  }

  // disconnect command
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

  // pause command
  else if (interaction.commandName === 'pause' || interaction.commandName === 'pa') {
    //unpauses player and returns if successful
    if (!player.unpause()) {
      //unsuccessful so pause playback
      await player.pause();
      //set user activity
      client.user.setActivity('PLAYBACK PAUSED', { type: ActivityType.Playing });
      //create pause message
      let pauseEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Paused audio playback");
      //send pause message
      await interaction.reply({ embeds: [pauseEmbed] });
    }
    else {
      //successful create and send pause message

      //set user activity
      client.user.setActivity(currentSong, { type: ActivityType.Playing });

      let pauseEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("Unpaused audio playback");
      await interaction.reply({ embeds: [pauseEmbed] });
    }
  }

  // play command
  else if (interaction.commandName === 'play' || interaction.commandName === 'p') {
    let channelInfo = interaction.member.voice.channel;
    if (channelInfo != undefined) {
      let playEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Joining ${channelInfo.name}`);
      await interaction.reply({ embeds: [playEmbed] });
      await join(channelInfo);
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
          .setTitle("Added " + queue[queue.length - 1].title + " to queue")
          .setURL("https://www.youtube.com/watch?v=" + queue[queue.length - 1].id);
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

  //queue command
  else if (interaction.commandName === 'queue' || interaction.commandName === 'q') {
    let queueList = "\n**Currently playing:**  " + currentSong + "\n\nUp next:";
    let i = 0;
    let none = true;
    queue.forEach(n => {
      n = n.title;
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
    interaction.reply({ embeds: [queueEmbed] });
  }

  // skip command
  else if (interaction.commandName === 'skip' || interaction.commandName === 'fs') {
    // get voice connection of whoever sent the message
    const connection = getVoiceConnection(interaction.guildId);
    // stop audio play
    player.stop();
    // // call garbage collection
    // garbageCollector(queue[0].path, 0);
    // // play next song
    // playNext(connection);
    // create skip message
    const skipEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Skipped current song');
    // send skip message
    await interaction.reply({ embeds: [skipEmbed] });
  }

  // repeat command
  else if (interaction.commandName === 'repeat' || interaction.commandName === 'r') {
    // flip repeat boolean
    repeat = !repeat;

    // if repeat is now on
    if (repeat) {
      // generate repeat message
      const repeatEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Now repeating the current song list');
      // send repeat message
      await interaction.reply({ embeds: [repeatEmbed] });
    } else {
      // generate repeat message
      const repeatEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('No longer repeating the current song list');
      // send repeate message
      await interaction.reply({ embeds: [repeatEmbed] });
    }
  }

  // help command
  else if (interaction.commandName === 'help') {
    // generate help message
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
    // send help message
    await interaction.reply({ embeds: [helpEmbed] });
  }

  // test command 
  // else if (interaction.commandName === 'test') {
  //   const testEmbed = new EmbedBuilder()
  //     .setColor(0x0099FF)
  //     .setTitle('Testing')
  //     .setDescription('I hate coding');
  //   await interaction.reply({ embeds: [testEmbed] });
  // }

});

client.login(token);