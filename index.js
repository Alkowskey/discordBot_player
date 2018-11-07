const discord = require('discord.js');
const express = require('express');
const manageBot = require('./scripts/manageBot');
const session = require('express-session');
const app = express();


let config = require('./config.json');
let users = require('./users/user.json');
let client = new discord.Client();
let isLogged = {is: false};
let isAuth = {is: false};
let queue = [];
let channelsNames = ['Start bot to get channels'];
let ssn;

app.use(session({secret:config.secret, resave: false, saveUninitialized: false})); //change it to config
app.set("view enginge","pug");
app.use(express.static(__dirname + '/public'));

const server = app.listen(process.env.PORT || 8080, () => {
    console.log(`Express running → PORT ${server.address().port}`);
    var args = process.argv.slice(2);
    if(args.includes('--start')||args.includes('-s')){
        manageBot.start(isLogged, client, config.token);
    }
});

app.get('/', (req, res) => {
    ssn = req.session;
    if(!ssn.nick)res.redirect('/login');
    else{
        res.render('index.pug', {
            name: "MusicBot",
            isLogged: isLogged.is,
            channels: channelsNames,
            isAuth: isAuth.is
        });
    }
});
app.get('/start', (req, res) => {
    ssn = req.session;
    if(!ssn.nick)res.redirect('/login');
    else{
        manageBot.start(isLogged, client, config.token).then(()=>{
            res.redirect('/');
        }).catch((rej)=>{
            res.redirect('/');
            console.log(rej);
        });
    }
});
app.get('/stop', (req, res) => {
    ssn = req.session;
    if(!ssn.nick)res.redirect('/login');
    else{
        manageBot.stop(isLogged, client);
        res.redirect('/');
    }
});
app.get('/play', (req, res) => {
    ssn = req.session;
    if(!ssn.nick)res.redirect('/login');
    else{
        console.log(req.query.link);
        manageBot.startSong(req.query.link, req.query.channel, client, queue);
        manageBot.save
        res.redirect('/');
    }
});
app.get('/skip', (req, res) => {
    ssn = req.session;
    if(!ssn.nick)res.redirect('/login');
    else{
        console.log('skip');
        manageBot.endSong();
        res.redirect('/');
    }
});
app.get('/queue', (req, res) => {
    ssn = req.session;
    if(!ssn.nick)res.redirect('/login');
    else{
        _queue = [];
        queue.forEach((link)=>{
            _queue.push(link.replace('watch?v=', 'embed/'));
        });
        res.render('queue.pug', {
            name: "Queue",
            queue: _queue,
            isLogged: isLogged.is
        });
    }
});

app.get('/config', (req, res) => {
    ssn = req.session;
    if(!ssn.nick)res.redirect('/login');
    else{
        res.render('config.pug', {
            name: "Config",
            isLogged: isLogged.is,
            Token: config.token,
            Name: config.name,
            channId: config.channId,
            prefix: config.prefix,
            secret: config.secret
        });
    }
});

app.get('/save', (req, res) => {
    ssn = req.session;
    if(!ssn.nick)res.redirect('/login');
    else{
        res.redirect('/');
        manageBot.save(config, req);
    }
});

app.get('/login', (req, res) => {
    res.render('login.pug',{
        name: "Login",
        
    });
});

app.get('/auth', (req, res) => {
    ssn = req.session;
    manageBot.check(users, req, ssn);
    res.redirect('/');
});
app.get('/auth', (req, res) => {
    ssn = req.session;
    manageBot.check(users, req, ssn);
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy((err)=>{
        if(err)console.log(err);
        else res.redirect('/');
    })
});

app.get('/users', (req, res) => {
    ssn = req.session;
    if(!ssn.nick)res.redirect('/login');
    else{
        console.log(manageBot.getUsersFromJSON(users));
        res.render('users.pug', {
            name: 'Users Control Panel',
            users: manageBot.getUsersFromJSON(users)
        });
    }
});

//https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG&key=AIzaSyABdRF_1voC3V7hnXNE6RVlZK6i10tDUQM

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    client.user.setUsername(config.name);
    
    manageBot.joinChannelById(config.channId, client);

    manageBot.getChannelNames(client).forEach(channel=>{
        if(channel instanceof discord.VoiceChannel)channelsNames.push(channel.name);
    });
    if(channelsNames.length>1)channelsNames.shift();
  });

client.on('message', (msg)=>{
    if(msg.client.bot)return;
    if(msg.content[0]=="!"){
        let sender = msg.author;
        let args = msg.content.substring(config.prefix.length).split(" ");
        switch(args[0]){
            case "p" || "play":
                manageBot.playCommand(msg, args[1], queue);
                break;
            case "s" || "skip":
                manageBot.endSong();
                break;

            case "q" || "queue":
                manageBot.queueCommand(sender, queue);
                break;
        }
    }
});