const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt=require('jsonwebtoken');
const fs = require('fs');
const cookieParser = require('cookie-parser');
require('dotenv').config()

var Logins;
var Tokens;
var badTokens;
const apiKey = '157bbf7d99msha338acfcddd592cp11a0e3jsn96ea4aa9738a';
const url = 'https://weatherapi-com.p.rapidapi.com/current.json?q=';
const hostName = 'weatherapi-com.p.rapidapi.com';
const timeLeft = 5;

mongoose.connect('mongodb://localhost/user_data')
.then(()=>{Logins = mongoose.connection.collection('logins');})
.then(()=>{
    Logins = mongoose.connection.collection('logins');
    console.log('Connected to logins collection');
})
.then(()=>{
    Tokens = mongoose.connection.collection('tokens');
    console.log('Connected to tokens collection');
})
.then(()=>{
    badTokens = mongoose.connection.collection('badTokens');
    console.log('Connected to badTokens collection');
})
.catch((error)=>{
    console.log(error);
})

const User = mongoose.model("User",{
    username:String,
    password:String
});

const app = express();
app.set('view engine','ejs');
app.set('views', path.join(__dirname, 'views'));
const port=5500;

app.use(applyHeaders);
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

app.post('/makeRequest',validateMe,async (req,res)=>{
    const city = req.body.city;
    const myURL = url+city;
    try{
        const resp = await fetch(myURL,{
            method:'GET',
            headers:{
                'X-RapidAPI-Key': apiKey,
	    	    'X-RapidAPI-Host': hostName
            }
        })
        const response = await resp.json();
        res.status(200).json({icon:response.current.condition.icon,text:response.current.condition.text});
    } catch(error){
        res.sendStatus(404);
    }
})

app.get('/homepage',validateMe,async (req,res)=>{
    console.log(';here ///////// '+req.position);
    let data={};
    if(req.position === 'clear' || req.position === 'clear-new'){
        data.in = 'none';
        data.out = 'inline';
    } else {
        data.in = 'inline';
        data.out = 'none';
    }

    fs.readFile('views/rev-manifest.json','utf8',(err,dat)=>{
        if(err){
            console.log(error.message);
        }
        else {
            const mapping = JSON.parse(dat);
            data.cssLoc = 'dist/css/'+mapping['/home/arya/Documents/weather_app/src/css/styles.css'];
            data.jsLoc = 'dist/js/'+mapping['/home/arya/Documents/weather_app/src/js/script.js'];
            res.render('index',{data});
        }
    });
});

app.get('/signinpage',(req,res)=>{
    const data = {};
    fs.readFile('views/rev-manifest.json','utf8',(err,dat)=>{
        if(err){
            console.log('Could not read json file for signin...'+err.message);
        } else {
            const mapping = JSON.parse(dat);
            data.header = 'Signin';
            data.cssPATH = 'dist/css/'+mapping['/home/arya/Documents/weather_app/src/css/signIn_styles.css'];
            data.jsPATH = 'dist/js/'+mapping['/home/arya/Documents/weather_app/src/js/signIn_script.js'];
            res.render('login',{data});
        }
    });
})

app.post('/signin',async (req,res)=>{
    const username = req.body.username;
    const password = req.body.password;
    try{
        const ans = await Logins.findOne({username:username});
        if(ans)
            throw new Error('Username exists!');
        try{
            await Logins.insertOne({username:username,password:password});
            const accessToken = genAccessToken(username);
            const refreshToken = genRefreshToken(username);
            await Tokens.insertOne({token:refreshToken,username:username});
            res.cookie('jwtToken',accessToken,{httpOnly:true,Secure:false,sameSite:'strict'});
            res.cookie('refToken',refreshToken,{httpOnly:true,Secure:false,sameSite:'strict'});
            res.json({status:true});
        } catch(error){
            throw new Error('Something went wrong! Try again...');
        }
    } catch(error){
        console.log(error.message);
        res.json({status:false,error:error.message});
    }
})

app.get('/login',(req,res)=>{
    const data = {};
    fs.readFile('views/rev-manifest.json','utf8',(err,dat)=>{
        if(err){
            console.log('Could not read json file for login...'+err.message);
        } else {
            const mapping = JSON.parse(dat);
            data.header = 'Login';
            data.cssPATH = 'dist/css/'+mapping['/home/arya/Documents/weather_app/src/css/signIn_styles.css'];
            data.jsPATH = 'dist/js/'+mapping['/home/arya/Documents/weather_app/src/js/logIn_script.js'];
            res.render('login',{data});
        }
    });
})

app.post('/loginTerminal',async (req,res)=>{
    const username = req.body.username;
    const password = req.body.password;

    try{
            let ans = await Logins.findOne({username:username});
            if(ans === null)
                throw new Error('Username does not exist!');

            ans = await Logins.findOne({username:username,password:password});
            if(ans === null)
                throw new Error('Wrong password!')

            if(Object.keys(ans).length > 0){
                const accessToken = genAccessToken(username);
                const refreshToken = genRefreshToken(username);
                await Tokens.insertOne({token:refreshToken,username:username});
                res.cookie('jwtToken',accessToken,{httpOnly:true,Secure:false,sameSite:'strict'});
                res.cookie('refToken',refreshToken,{httpOnly:true,Secure:false,sameSite:'strict'});
                res.json({status:true});
            } else{
                throw new Error('Something went wrong! Try again...');
            }
        
    } catch(error){
        console.log(error.message);
        res.json({status:false,error:error.message});
    }
})

function validateMe(req,res,next){
    const accessToken = req.cookies.jwtToken;
    if(accessToken === null){
        req.position = 'no-jwt';
        return next();
    }
    jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET,async (err,user)=>{
        if(err){
            req.position = 'bad-jwt';
            const refreshToken = req.cookies.refToken;
            jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET,async (err,user)=>{
                if(err){
                    req.position = 'bad-ref';
                    return next();
                }
                else{
                    const ans = await Tokens.findOne({token:refreshToken});
                    if(ans === null){
                        req.position = 'bad-ref';
                        return next();
                    }
                    else{
                        const newToken = genAccessToken(user.username);
                        req.position = 'clear-new';
                        res.cookie('jwtToken',newToken,{httpOnly:true,Secure:false,sameSite:'strict'});
                        next();
                    }
                }
            })
        }
        else{
            const ans = await badTokens.findOne({token:accessToken});
            if(ans !== null){
                req.position = 'ill-jwt';
                return next();
            }
            else{
                req.position = 'clear';
                return next();
            }
        }
    });
}

async function renewToken(refreshToken){
    jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET,(err,user)=>{
        if(err)
            return -1;
        else{
            const ans = Tokens.findOne({token:refreshToken});
            if(ans !== null)
                return -1;
            const newToken = genAccessToken(user.username);
            return newToken;
        }
    })
}

app.delete('/logout',async (req,res)=>{
    const token = req.cookies.refToken;
    const stat = await Tokens.deleteOne({token:token});

    const acc = req.cookies.jwtToken;
    const exp = JSON.parse(atob(acc.split('.')[1])).exp;
    await badTokens.insertOne({expirationTime:exp,token:acc});

    return res.sendStatus(200);
})

async function getListOfFiles(){
    let fileNames = await new Promise((resolve,reject)=>{
        fs.readFile('views/rev-manifest.json','utf8',(err,data)=>{
            if(err)
                reject(err);
            else
                resolve(data);
        })
    });
    fileNames = await JSON.parse(fileNames);
    const listOfFiles = Object.values(fileNames);
    return listOfFiles;
}

async function applyHeaders(req,res,next){
    if(req.url.endsWith('.css') || req.url.endsWith('.js')){
        const listOfFiles = await getListOfFiles();
        let found = false;
        console.log('Etag sent is '+req.headers['if-none-match']);
        if(req.headers['if-none-match'] !== undefined){
            for(const ele of listOfFiles){
                if(ele === req.headers['if-none-match']){
                    found = true;
                    break;
                }
            }
        }
        res.setHeader('cache-control','no-cache, max-age=20');
        if(found === true){
            console.log('sent status 304');
            res.status(304);
            res.end();
        } else {
            res.setHeader('ETag',req.url.split('/').at(-1));
            console.log('sent file');
            res.sendFile(__dirname+req.url);
        }
    } else{
        res.setHeader('cache-control','no-store');
        next();
    }
}

setInterval(async ()=>{
    const time = Date.now();
    badTokens.deleteMany({expirationTime:{$gte:time}});
},60000)

function genAccessToken(username){
    return jwt.sign({username:username},process.env.ACCESS_TOKEN_SECRET,{expiresIn:'15m'});
}

function genRefreshToken(username){
    return jwt.sign({username:username},process.env.REFRESH_TOKEN_SECRET,{expiresIn:'7d'});
}

app.listen(port,()=>{
    console.log('Listening to port number '+port);
})