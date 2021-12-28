import asyncio
import re
import discord
import praw
import youtube_dl
from discord.ext import commands

tokenFile = open("BOT TOKEN.txt", "r")

token = ""
id = ""
secret = ""
user = ""

lines = tokenFile.readlines()

token = token.join(lines[1:2])
id = id.join(lines[3:4])
secret = secret.join(lines[5:6])
user = user.join(lines[7:8])

re.sub(r'[^\w]', '', token)
re.sub(r'[^\w]', '', id)
re.sub(r'[^\w]', '', secret)
re.sub(r'[^\w]', '', user)

secret = secret.replace("\n", "")
id = id.replace("\n", "")
user = user.replace("\n", "")

print("Discord Bot Token: "+token+"\n Reddit Client ID: "+id+"\n Reddit Client Secret: "+secret+"\n Reddit Client Token"+user)

reddit = praw.Reddit(client_id=id, client_secret=secret,user_agent=user)

ytdl_format_options = {
    'format': 'bestaudio/best',
    'outtmpl': '%(extractor)s-%(id)s-%(title)s.%(ext)s',
    'restrictfilenames': True,
    'noplaylist': True,
    'nocheckcertificate': True,
    'ignoreerrors': False,
    'logtostderr': False,
    'quiet': True,
    'no_warnings': True,
    'default_search': 'auto',
    'source_address': '0.0.0.0'
}

ytdl = youtube_dl.YoutubeDL(ytdl_format_options)

ffmpeg_options = {
    'options': '-vn'
}

class YTDLSource(discord.PCMVolumeTransformer):
    def __init__(self, source, *, data, volume=0.5):
        super().__init__(source, volume)

        self.data = data

        self.title = data.get('title')
        self.url = data.get('url')

    @classmethod
    async def from_url(cls, url, *, loop=None, stream=False):
        loop = loop or asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: ytdl.extract_info(url, download=not stream))

        if 'entries' in data:
            # take first item from a playlist
            data = data['entries'][0]

        filename = data['url'] if stream else ytdl.prepare_filename(data)
        return cls(discord.FFmpegPCMAudio(filename, **ffmpeg_options), data=data)


songs = asyncio.Queue()
channels = asyncio.Queue()
next = asyncio.Event()
bot = commands.Bot(command_prefix="!")


@bot.event
async def on_ready():
    print('Logged in as {0} ({0.id})'.format(bot.user))
    print('------')


async def audio():
    while True:
        next.clear()
        song = await songs.get()
        channel = await channels.get()
        channel.play(song, after=toggle)
        await next.wait()


def toggle(self):
    bot.loop.call_soon_threadsafe(next.set)


class Commands(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def meme(self, ctx):
        link = "https://cdn.discordapp.com/attachments/923825647468568577/923829145505525801/unknown.png"
        for submission in reddit.subreddit("shitposting+dankmemes+memes").random_rising():
            link = submission.url_overridden_by_dest
            if "i.redd.it" in link:
                break
        await ctx.send(link)

    @commands.command()
    async def p(self, ctx, *, url):
        """Streams from a url (same as yt, but doesn't predownload)"""
        player = await YTDLSource.from_url(url, loop=self.bot.loop, stream=True)
        await songs.put(player)
        await channels.put(ctx.voice_client)
        await ctx.send("Added {}".format(player.title) + " to queue")

    @commands.command()
    async def fs(self, ctx):
        """Skips the song currently playing"""
        if ctx.author.voice:
            ctx.voice_client.stop()
            await ctx.send("skipped")
        else:
            await ctx.send("You need to be in a voice channel for this")

    @commands.command()
    async def j(self, ctx, *, channel: discord.VoiceChannel):
        """Joins a voice channel"""

        if ctx.voice_client is not None:
            return await ctx.voice_client.move_to(channel)

        await channel.connect()

    @commands.command()
    async def v(self, ctx, volume: int):
        """Changes the player's volume"""

        if ctx.voice_client is None:
            return await ctx.send("Not connected to a voice channel.")

        ctx.voice_client.source.volume = volume / 100
        await ctx.send("Changed volume to {}%".format(volume))

    @commands.command()
    async def d(self, ctx):
        """Stops and disconnects the bot from voice"""
        if ctx.author.voice:
            await ctx.voice_client.disconnect()
            await ctx.send("Disconnected")
        else:
            await ctx.send("You need to be in a voice channel for this")

    @commands.command()
    async def s(self, ctx):
        """Pauses playback"""
        if ctx.author.voice:
            ctx.voice_client.pause()
            await ctx.send("Paused")
        else:
            await ctx.send("You need to be in a voice channel for this")

    @commands.command()
    async def r(self, ctx):
        """Resumes playback"""
        if ctx.author.voice:
            ctx.voice_client.resume()
            await ctx.send("Resumed")
        else:
            await ctx.send("You need to be in a voice channel for this")

    @p.before_invoke
    async def ensure_voice(self, ctx):
        if ctx.voice_client is None:
            if ctx.author.voice:
                await ctx.author.voice.channel.connect()
            else:
                await ctx.send("You are not connected to a voice channel.")
                raise commands.CommandError("Author not connected to a voice channel.")


bot.add_cog(Commands(bot))
bot.loop.create_task(audio())
bot.run(token)
