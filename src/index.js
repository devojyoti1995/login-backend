const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");

const session_secret = "devojyoti";

const app = express();
app.use(express.json()); // added body key to req
app.use(
  cors({
    credentials: true,
    origin: "https://devojyoti-login-frontend.herokuapp.com/", //"https://devojyoti-login-frontend.herokuapp.com/"
  })
);
app.use(
  session({
    secret: session_secret,
    cookie: { maxAge: 1 * 60 * 60 * 1000 },
  })
); // adds a property called session to req

// connect

const mongourl =
  "mongodb+srv://Devojyoti:Devo@1995@cluster0.whpdu.mongodb.net/UserInfo?retryWrites=true&w=majority";
mongoose
  .connect(mongourl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("DB connected successfully");
  })
  .catch(() => {
    console.log("Error in DB connection");
  });

// const db = mongoose.createConnection(mongourl, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
// schemas
const userSchema = new mongoose.Schema({
  userName: String,
  password: String,
});

// models
const userModel = mongoose.model("user", userSchema);

// backend apis
const isNullOrUndefined = (val) => val === null || val === undefined;
const SALT = 5;

app.post("/signup", async (req, res) => {
  const { userName, password } = req.body;
  const existingUser = await userModel.findOne({ userName });
  if (isNullOrUndefined(existingUser)) {
    // we should allow signup
    const hashedPwd = bcrypt.hashSync(password, SALT);
    const newUser = new userModel({ userName, password: hashedPwd });

    await newUser.save();
    req.session.userId = newUser._id;
    res.status(201).send({ success: "Signed up" });
  } else {
    res.status(400).send({
      err: `UserName ${userName} already exists. Please choose another.`,
    });
  }
});

app.post("/login", async (req, res) => {
  const { userName, password } = req.body;
  const existingUser = await userModel.findOne({
    userName,
  });

  if (isNullOrUndefined(existingUser)) {
    res.status(401).send({ err: "UserName does not exist." });
  } else {
    const hashedPwd = existingUser.password;
    if (bcrypt.compareSync(password, hashedPwd)) {
      req.session.userId = existingUser._id;
      console.log("Session saved with", req.session);
      res.status(200).send({ success: "Logged in" });
    } else {
      res.status(401).send({ err: "Password is incorrect." });
    }
  }
});

const AuthMiddleware = async (req, res, next) => {
  console.log("Session", req.session);
  // added user key to req
  if (isNullOrUndefined(req.session) || isNullOrUndefined(req.session.userId)) {
    res.status(401).send({ err: "Not logged in" });
  } else {
    next();
  }
};

app.get("/logout", (req, res) => {
  if (!isNullOrUndefined(req.session)) {
    // destroy the session
    req.session.destroy(() => {
      res.sendStatus(200);
    });
  } else {
    res.sendStatus(200);
  }
});

app.get("/userinfo", AuthMiddleware, async (req, res) => {
  const user = await userModel.findById(req.session.userId);
  res.send({ userName: user.userName });
});

app.listen(process.env.PORT);
