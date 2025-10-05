import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        steps: {
            type: Number,
            default: 0,
        },
        distance: {
            type: Number,
            default: 0,
        },
        territories: {
            type: Number,
            default: 0,
        }, badges: {
            type: [String],
            default: []
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number],
                default: [0, 0],
            },
        },

        oauthProvider: { type: String },
        oauthId: { type: String, index: true },
        displayName: { type: String },
        avatar: { type: String },
    },
    { timestamps: true }
);
userSchema.index({ location: "2dsphere" });

userSchema.methods.updateSteps = function (newSteps) {
    this.steps += newSteps;
    return this.save();
};

userSchema.methods.updateDistance = function (newDistance) {
    this.distance += newDistance;
    return this.save();
};

userSchema.methods.addTerritory = function () {
    this.territories += 1;
    return this.save();
};

userSchema.methods.removeTerritory = function () {
    if (this.territories > 0) this.territories -= 1;
    return this.save();
};

userSchema.methods.updateLocation = function (lng, lat) {
    this.location = { type: "Point", coordinates: [lng, lat] };
    return this.save();
};

export default mongoose.model("User", userSchema);
