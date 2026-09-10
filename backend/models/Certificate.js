import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Certificate = sequelize.define('Certificate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentId: { type: DataTypes.UUID, allowNull: false },
    internshipId: { type: DataTypes.UUID, allowNull: false },
    issueDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    certificateFile: { type: DataTypes.STRING, allowNull: false },
}, { timestamps: true });

Certificate.prototype.toJSON = function () {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
};

export default Certificate;
