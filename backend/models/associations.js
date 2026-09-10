import User from './User.js';
import Student from './Student.js';
import Company from './Company.js';
import Internship from './Internship.js';
import Application from './Application.js';
import Certificate from './Certificate.js';
import Notification from './Notification.js';
import RefreshToken from './RefreshToken.js';

// User <-> Student (1:1)
User.hasOne(Student, { foreignKey: 'userId', onDelete: 'CASCADE' });
Student.belongsTo(User, { foreignKey: 'userId' });

// User <-> Company (1:1)
User.hasOne(Company, { foreignKey: 'userId', onDelete: 'CASCADE' });
Company.belongsTo(User, { foreignKey: 'userId' });

// User <-> RefreshToken (1:N)
User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

// User <-> Notification (1:N)
User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// Company <-> Internship (1:N)
Company.hasMany(Internship, { foreignKey: 'companyId', onDelete: 'CASCADE' });
Internship.belongsTo(Company, { foreignKey: 'companyId' });

// Student/Internship/Company <-> Application
Student.hasMany(Application, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Application.belongsTo(Student, { foreignKey: 'studentId' });

Internship.hasMany(Application, { foreignKey: 'internshipId', onDelete: 'CASCADE' });
Application.belongsTo(Internship, { foreignKey: 'internshipId' });

Company.hasMany(Application, { foreignKey: 'companyId', onDelete: 'CASCADE' });
Application.belongsTo(Company, { foreignKey: 'companyId' });

// Student/Internship <-> Certificate
Student.hasMany(Certificate, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Certificate.belongsTo(Student, { foreignKey: 'studentId' });

Internship.hasMany(Certificate, { foreignKey: 'internshipId', onDelete: 'CASCADE' });
Certificate.belongsTo(Internship, { foreignKey: 'internshipId' });

export {
    User,
    Student,
    Company,
    Internship,
    Application,
    Certificate,
    Notification,
    RefreshToken,
};
