const {REST, Routes} = require('discord.js');
const commands = [
    {
        name: 'test',
        description: 'test command',
    },
    {
        name: 'play',
        description: 'plays audio \n /play {youtube url}'
    },
    {
        name: 'p',
        description: 'alternate for /play',
    },
    {
        name: 'leave',
        description: 'leaves the audio channel',
    },
    {
        name: 'l',
        description: 'alternate for /leave',
    },
    {
        name: 'pause',
        description: 'pauses audio playback',
    },
    {
        name: 'pa',
        description: 'alternate for /pause',
    },
    {
        name: 'join',
        description: 'joins the voice channel of the author',
    },
    {
        name: 'j',
        description: 'alternate for /join',
    },
    {
        name: 'queue',
        description: 'sends the current queue',
    },
    {
        name: 'q',
        description: 'alternate for /queue',
    },
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