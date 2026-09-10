import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// Refresh tokens are stored hashed (never in plaintext) so a DB leak alone
// cannot be used to impersonate users. Supports rotation + revocation.
const RefreshToken = sequelize.define('RefreshToken', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING, allowNull: false, unique: true },
    userAgent: { type: DataTypes.STRING, allowNull: true },
    ip: { type: DataTypes.STRING, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    replacedByTokenHash: { type: DataTypes.STRING, allowNull: true },
}, {
    timestamps: true,
});

RefreshToken.prototype.isActive = function () {
    return !this.revokedAt && this.expiresAt > new Date();
};

export default RefreshToken;
