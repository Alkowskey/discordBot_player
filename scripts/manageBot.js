const YTDL = require("ytdl-core");
const fs = require('fs');
const bcrypt = require('bcrypt');
const https = require('https');
const discord = require('discord.js');

var currMusic;

module.exports = {
    /**
     * @param {string} link The URL
     * @param {string} channelName Name of channel that BOT will join
     * @param {discord.Client} client Client (BOT)
     * @param {Array} queue Array of links to songs
     */
    startSong: function (link, channelName, client, queue){
        let vc = client.channels.find(channel=>channel.name === channelName);
        if(!queue[0]){
            vc.join().then((connection)=>{
                module.exports.play(connection, queue);
            });
        }
        if(!link.match(/list/))queue.push(link);
        else module.exports.playlist(link, queue);
    },

    /**
     * @param {string} link The URL
     * @param {Array} queue Array of links to songs
     */
    playlist: function (link, queue){
        queue.push(link.match(/[^&]*/)[0]);
        let playlistId = link.match(/list=\s*([^\n\r]*)/)[0];
        playlistId = playlistId.replace('list=', '');

        https.get('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId='+playlistId+'&key=AIzaSyABdRF_1voC3V7hnXNE6RVlZK6i10tDUQM',
        (resp)=>{
            let data = '';

            resp.on('data', (chunk) => {
              data += chunk;
            });
          
            resp.on('end', () => {
                let JSONresp = JSON.parse(data);
                var items = JSONresp.items;
                items.shift();
                items.forEach(element => {
                    let musicLink = 'https://www.youtube.com/watch?v='+element.snippet.resourceId.videoId;
                    queue.push(musicLink);
                });

              
            });
          
          }).on("error", (err) => {
            console.log("Error: " + err.message);
          });

        console.log(playlistId);
    },
    /**
     * @param {discord.Message} msg Message that came from discord (not a string)
     * @param {string} link The URL
     * @param {Array} queue Array of links to songs
     */
    playCommand: function (msg, link, queue){
        const voiceChannel = msg.member.voiceChannel;
        if (!voiceChannel) return msg.channel.send('You have to be on voice channel to start music');
        if(!queue[0]){
            voiceChannel.join().then((connection)=>{
                module.exports.play(connection, queue);
            });
        }
        if(!link.match(/list/))queue.push(link);
        else module.exports.playlist(link, queue);
        msg.author.send("Playing...");
    },

    /**
     * @param {Connection} connection Connection to the voiceChannel
     * @param {Array} queue Array of links to songs
     */
    play: function(connection, queue){
        console.log(queue);
        currMusic = connection.playStream(YTDL(queue[0], {filter: 'audioonly', quality: 'highestaudio'}));
        currMusic.on("end", ()=>{
            queue.shift();
            if(queue[0])module.exports.play(connection, queue)
            else connection.disconnect();
        })
        console.log('Playing... '+queue[0]);
    },
    /**
     * @param {Object} isLogged Passed object with bool (is) inside
     * @param {discord.Client} client Client (BOT)
     * @param {string} token Token to discord 
    */
    start: function(isLogged, client, token){
        return new Promise(
            function (resolve, reject) {
                if(isLogged.is) reject('Bot already exists');
                client.login(token)
                .then(()=>{
                    resolve(client);
                    isLogged.is = true;
                }).catch(()=>{
                    isLogged.is=false;
                    reject('Error: Błąd połączenia');
                });
        });
    },
    
    /**
     * @param {Object} isLogged Passed object with bool (is) inside
     * @param {discord.Client} client Client (BOT)
    */
    stop: function(isLogged, client){
        if(!isLogged.is) return console.log('Bot doesn\'t exists yet');
        client.destroy();
        isLogged.is = false;
        console.log('stop');
    },

    /**
     * @param {discord.Client} client Client (BOT)
    */
    getChannelNames: function (client){
        return client.channels;
    },
    /**
     * @param {string} id Channel ID that bot has to join
     * @param {discord.Client} client Client (BOT)
    */
    joinChannelById:function (id, client){
        let vc = client.channels.find(channel=>channel.id === id);
        vc.join()
        .then(connection => console.log('Joined to channel!'))
        .catch(console.error);
    },
    
    //End song function with no params
    endSong: function(){
        currMusic.end();
    },

    /**
     * @param {JSON} cfg JSON config
     * @param {https.request} req req that came from frontend
    */
    save: function(cfg, req){
        cfg.name = req.query.name;
        cfg.token = req.query.token;
        cfg.channId = req.query.channId;
        cfg.prefix = req.query.prefix;
        cfg.secret = req.query.secret;
        fs.writeFile('./config.json', JSON.stringify(cfg), (err)=>{
            if(err)return console.log(err);
            console.log('Saving JSON to file');
        });
    },

    /**
     * @param {JSON} usr JSON user file
     * @param {https.request} req req that came from frontend
     * @param {session} ssn Session
    */
    check: function(usr, req, ssn){
        if(usr.hasOwnProperty(req.query.login)){
            if(bcrypt.compareSync(req.query.password, usr[req.query.login])) {
                ssn.nick = req.query.login;
            }
        }
    },
    /**
     * @param {JSON} usr JSON user file
    */
    getUsersFromJSON: (usr) => Object.keys(usr),

    /**
     * @param {JSON} usr JSON user file
    */
    queueCommand: function(sender, queue){
        if(queue[0]){
            queue.forEach(song => {
                sender.send(song);
            });
        }
        else sender.send("There are no songs in queue");
    }
};