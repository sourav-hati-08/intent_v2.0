import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'company', 'student'), allowNull: false },
    message: { type: DataTypes.STRING, allowNull: false },
    type: {
        type: DataTypes.ENUM('registration', 'application', 'approval', 'verification'),
        allowNull: false,
    },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true });

Notification.prototype.toJSON = function () {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
};

export default Notification;
