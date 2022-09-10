require('dotenv').config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const morgan = require("morgan");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({extended:true}));
app.use(express.static("public"));

app.use(session({
    secret: "this is our first project",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/mediumDB",{useNewUrlParser: true});

const userSchema =new mongoose.Schema({
    email:String,
    password:String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User =mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/main",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
//END POINTS
app.get("/", (req,res)=>{
    res.send("You are on the home page");
});

app.get("/auth/google",
  passport.authenticate("google"  , { scope: ["profile"] }), (req,res)=>{
      res.send("done");
  }
);

app.get("/auth/google/main",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to main page.
    res.send("User has been successfully login");
    res.redirect("/main");
  });

  app.get("/login", function(req, res){
    res.send("render login page for the user");
  });
  
app.get("/logout", (req, res)=>{
    req.logout();
    res.send("User has been successfully logout")
});

app.post("/register", (req,res)=>{
    User.register({username: req.body.username}, req.body.password, (err,user)=>{
        if(err){
            res.send(err.message);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.send("User is registered succrssfully");
            });
        }
    })
});

app.get("/main", (req,res)=>{
    if(req.isAuthenticated()){
        res.send("User is permitted");
    }else{
        res.send("User is not permitted. Redirect user to login");
    }
});

app.post("/login", (req,res)=>{

    const user  = new User({
        username : req.body.username,
        password : req.body.password
    });

    req.login(user, (err)=>{
        if(err){
            res.send(err.message);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.send("User has been successfully login"); 
            });
        }
    });
});



app.listen(3000, ()=>{
    console.log("Server is runnig on PORT 3000");
});