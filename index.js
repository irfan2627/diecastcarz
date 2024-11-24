const mongoose = require("mongoose");
require('dotenv').config()
const express = require('express')
const session = require('express-session');
const nocache = require('nocache')
const userRoute = require('./routes/userRoute')
const adminRoute = require('./routes/adminRoute')
const app = express()

//load static file
const path = require('path')
app.use(nocache());
app.use('/public', express.static(path.join(__dirname, 'public')))


// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));


// MongoDB connection
// mongoose.connect("mongodb://127.0.0.1:27017/diecastcarz_users");

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/diecastcarz_users").then(() => {
  console.log("Connected to MongoDB");
})
.catch(error => {
  console.error("MongoDB connection error:", error);
  process.exit(1); // Exit the application if MongoDB connection fails
});


//session middleware 
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error caught by errorHandler:", err.message);
  res.status(500).render('./user/404', { message: "Internal Server Error. Sorry for the inconvenience." });
};


//for user routes
app.use('/', userRoute)

//for admin routes
app.use('/admin', adminRoute)
 

// Server listening
const port = 8000;
app.listen(port, () => {
  console.log(`Server is running at : http://127.0.0.1:${port}`);
});

