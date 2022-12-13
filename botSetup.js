const {REST, Routes} = require('discord.js');
const commands = [
    {
        name: 'test',
        description: 'test command',
    },
    {
        name: 'play',
        description: 'plays audio',
        options:[ {
            name: 'url',
            type: 3,
            description: 'the url or name of the video/song you want to play',
            required: true,
        }],
    },
    // {
    //     name: 'p',
    //     description: 'alternate for /play',
    //     options:[ {
    //         name: 'url',
    //         type: 3,
    //         description: 'the url or name of the video/song you want to play',
    //         required: true,
    //     }],
    // },
    {
        name: 'disconnect',
        description: 'leaves the audio channel',
    },
    // {
    //     name: 'd',
    //     description: 'alternate for /disconnect',
    // },
    {
        name: 'pause',
        description: 'pauses audio playback',
    },
    // {
    //     name: 'pa',
    //     description: 'alternate for /pause',
    // },
    {
        name: 'join',
        description: 'joins the voice channel of the author',
    },
    // {
    //     name: 'j',
    //     description: 'alternate for /join',
    // },
    {
        name: 'queue',
        description: 'sends the current queue',
    },
    // {
    //     name: 'q',
    //     description: 'alternate for /queue',
    // },
    {
        name: 'skip',
        description: 'skips the current song',
    },
    // {
    //     name: 'fs',
    //     description: 'alternate for /skip',
    // },
    {
        name: 'repeat',
        description: 'repeats the current queue',
    },
    // {
    //     name: 'r',
    //     description: 'alternate for /repeat',
    // },
];

require('dotenv').config()
const token = process.env.TOKEN;
const id = process.env.ID;

const rest = new REST({ version: '10'}).setToken(token);

(async () => {
    try{
        console.log("Refreshing slash commands");

        await rest.put(Routes.applicationCommands(id), { body: commands });

        console.log('success');
    }catch (error){
        console.log(error);
    }
})();