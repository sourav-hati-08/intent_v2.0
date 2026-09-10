import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Student = sequelize.define('Student', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    university: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    program: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    enrollmentNumber: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    semester: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    skills: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    resume: { type: DataTypes.STRING, allowNull: true },
    experience: { type: DataTypes.JSON, allowNull: true },
    education: { type: DataTypes.JSON, allowNull: true },
}, { timestamps: true });

Student.prototype.toJSON = function () {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
};

export default Student;
