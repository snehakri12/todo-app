const mongoose = require('mongoose');

const taskSchema = mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    completed: {
        type: Boolean,
        default: false
    },

    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium"
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }

}, { timestamps: true });

module.exports = mongoose.model("task", taskSchema);