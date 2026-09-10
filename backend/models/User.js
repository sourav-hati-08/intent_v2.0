import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/db.js';

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
        set(value) {
            this.setDataValue('email', value ? String(value).toLowerCase().trim() : value);
        },
    },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
        type: DataTypes.ENUM('student', 'company', 'admin'),
        allowNull: false,
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    profilePic: { type: DataTypes.STRING, allowNull: true },

    // --- Powerful auth fields ---
    emailVerificationTokenHash: { type: DataTypes.STRING, allowNull: true },
    emailVerificationExpires: { type: DataTypes.DATE, allowNull: true },

    passwordResetTokenHash: { type: DataTypes.STRING, allowNull: true },
    passwordResetExpires: { type: DataTypes.DATE, allowNull: true },

    failedLoginAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    lockUntil: { type: DataTypes.DATE, allowNull: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    passwordChangedAt: { type: DataTypes.DATE, allowNull: true },
}, {
    timestamps: true,
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(12);
                user.password = await bcrypt.hash(user.password, salt);
                user.passwordChangedAt = new Date();
            }
        },
    },
    defaultScope: {
        attributes: { exclude: ['password', 'emailVerificationTokenHash', 'passwordResetTokenHash'] },
    },
    scopes: {
        withSecrets: {},
    },
});

User.prototype.matchPassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

User.prototype.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Keep frontend compatible with previous Mongo `_id` field.
User.prototype.toJSON = function () {
    const values = { ...this.get() };
    values._id = values.id;
    delete values.password;
    delete values.emailVerificationTokenHash;
    delete values.passwordResetTokenHash;
    return values;
};

export default User;
