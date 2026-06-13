
const express = require('express');
const app = express();

require("dotenv").config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const userModel = require('./models/user');
const taskModel = require('./models/task');
const upload = require('./config/multerconfig');

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.log(err));

app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.get("/login", (req, res) => {
    res.render("login");
});
app.post("/register", async (req, res) => {
    try {
        let { name, username, email, password, age } = req.body;

        let user = await userModel.findOne({ email });

        if (user) {
            return res.send("User already exists");
        }

        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                return res.send("Error generating salt");
            }

            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) {
                    return res.send("Error hashing password");
                }

                let createdUser = await userModel.create({
                    name,
                    username,
                    email,
                    password: hash,
                    age
                });

                let token = jwt.sign(
                    {
                        email: createdUser.email,
                        userid: createdUser._id
                    },
                    process.env.JWT_SECRET
                );

                res.cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict"
                });

                res.redirect("/profile");
            });
        });

    } catch (err) {
        console.log(err);
        res.send("Something went wrong");
    }
});

app.post("/login", async (req, res) => {
    try {
        let { email, password } = req.body;

        let user = await userModel.findOne({ email });

        if (!user) {
            return res.redirect("/login");
        }

        bcrypt.compare(password, user.password, (err, result) => {

            if (err) {
                return res.send("Error comparing passwords");
            }

            if (result) {

                let token = jwt.sign(
                    {
                        email: user.email,
                        userid: user._id
                    },
                    process.env.JWT_SECRET
                );

                res.cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict"
                });

                res.redirect("/profile");

            } else {
                res.redirect("/login");
            }
        });

    } catch (err) {
        console.log(err);
        res.send("Something went wrong");
    }
});

function isLoggedIn(req, res, next) {

    if (!req.cookies.token) {
        return res.redirect("/login");
    }

    try {
        let data = jwt.verify(
            req.cookies.token,
            process.env.JWT_SECRET
        );

        req.user = data;
        next();

    } catch (err) {
        return res.redirect("/login");
    }
}

app.get("/profile", isLoggedIn, async (req, res) => {
    try {
        let user = await userModel
            .findOne({ email: req.user.email })
            .populate("tasks");

        let totalTasks = user.tasks.length;

        let completedTasks = user.tasks.filter(
            task => task.completed
        ).length;

        let productivity =
            totalTasks === 0
                ? 0
                : Math.round(
                    (completedTasks / totalTasks) * 100
                );

        res.render("profile", {
            user,
            productivity
        });

    } catch (err) {
        console.log(err);
        res.send("Error loading profile");
    }
});

app.get("/profile/upload", isLoggedIn, (req, res) => {
    res.render("profilepic");
});

app.post(
    "/upload",
    isLoggedIn,
    upload.single("image"),
    async (req, res) => {
        try {
            let user = await userModel.findOne({
                email: req.user.email
            });

            if (req.file) {
                user.profilepic = req.file.filename;
                await user.save();
            }

            res.redirect("/profile");

        } catch (err) {
            console.log(err);
            res.send("Upload failed");
        }
    }
);

app.post("/task/create", isLoggedIn, async (req, res) => {
    try {
        if (!req.body.title || req.body.title.trim() === "") {
            return res.redirect("/profile");
        }

        let user = await userModel.findOne({
            email: req.user.email
        });

        let task = await taskModel.create({
            title: req.body.title.trim(),
            user: user._id
        });

        user.tasks.push(task._id);

        await user.save();

        res.redirect("/profile");

    } catch (err) {
        console.log(err);
        res.send("Task creation failed");
    }
});

app.get("/task/complete/:id", isLoggedIn, async (req, res) => {
    try {
        let task = await taskModel.findById(req.params.id);

        task.completed = !task.completed;
        await task.save();

        let user = await userModel.findById(req.user.userid);

        let today = new Date();
        today.setHours(0, 0, 0, 0);

        if (task.completed) {

            if (!user.lastCompletedDate) {
                user.streak = 1;
            } else {
                let lastDate = new Date(user.lastCompletedDate);
                lastDate.setHours(0, 0, 0, 0);

                let diff =
                    (today - lastDate) /
                    (1000 * 60 * 60 * 24);

                if (diff === 1) {
                    user.streak += 1;
                } else if (diff > 1) {
                    user.streak = 1;
                }
            }

            user.lastCompletedDate = today;
            await user.save();
        }

        res.redirect("/profile");

    } catch (err) {
        console.log(err);
        res.send("Task update failed");
    }
});

app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server Running");
});

