import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Application = sequelize.define('Application', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentId: { type: DataTypes.UUID, allowNull: false },
    internshipId: { type: DataTypes.UUID, allowNull: false },
    companyId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: true },
    qualification: { type: DataTypes.STRING, allowNull: true },
    resume: { type: DataTypes.STRING, allowNull: true },
    coverLetter: { type: DataTypes.TEXT, allowNull: true },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
        defaultValue: 'pending',
    },
}, { timestamps: true });

Application.prototype.toJSON = function () {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
};

export default Application;
