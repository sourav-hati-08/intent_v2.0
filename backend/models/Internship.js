import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Internship = sequelize.define('Internship', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    skills: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    duration: { type: DataTypes.STRING, allowNull: false },
    stipend: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: true },
    status: {
        type: DataTypes.ENUM('active', 'suspended', 'closed'),
        defaultValue: 'active',
    },
    lastDateToApply: { type: DataTypes.DATE, allowNull: true },
}, { timestamps: true });

Internship.prototype.toJSON = function () {
    const values = { ...this.get() };
    values._id = values.id;
    return values;
};

export default Internship;
