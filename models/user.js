const mongoose=require('mongoose');

const userSchema = mongoose.Schema({

    username: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    age: Number,

    profilepic: {
        type: String,
        default: "default.png"
    },

    streak: {
    type: Number,
    default: 0
},

lastCompletedDate: {
    type: Date,
    default: null
},

lastResetDate: {
    type: Date,
    default: null
},

    tasks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "task"
        }
    ]

}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);