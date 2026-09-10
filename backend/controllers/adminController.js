import { Op, fn, col, literal } from 'sequelize';
import { User, Company, Student, Internship, Application } from '../models/associations.js';
import { createNotification } from '../utils/notificationHelper.js';

// @desc    Get dashboard overview stats
// @route   GET /api/admin/overview
// @access  Private/Admin
export const getOverviewStats = async (req, res) => {
    try {
        const totalStudents = await Student.count();
        const totalCompanies = await Company.count();
        const totalInternships = await Internship.count();
        const pendingCompanies = await Company.count({ where: { verificationStatus: 'pending' } });
        const pendingStudents = await User.count({ where: { role: 'student', isVerified: false } });

        const recentStudents = await User.findAll({
            where: { role: 'student' },
            order: [['createdAt', 'DESC']],
            limit: 5,
        });
        const recentCompanies = await Company.findAll({
            order: [['createdAt', 'DESC']],
            limit: 5,
        });

        res.json({
            totalStudents,
            totalCompanies,
            totalInternships,
            pendingCompanies,
            pendingStudents,
            recentStudents,
            recentCompanies,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get companies for verification
// @route   GET /api/admin/companies/verify
// @access  Private/Admin
export const getCompaniesForVerification = async (req, res) => {
    try {
        const companies = await Company.findAll({
            include: [{ model: User, attributes: ['name', 'email'] }],
            order: [['createdAt', 'DESC']],
        });
        res.json(companies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify/Approve company
// @route   PUT /api/admin/companies/verify/:id
// @access  Private/Admin
export const verifyCompany = async (req, res) => {
    try {
        const company = await Company.findByPk(req.params.id);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        const { verificationStatus } = req.body;
        company.verificationStatus = verificationStatus;

        if (verificationStatus === 'approved') {
            company.isApproved = true;
            company.verified = true;
            await User.update({ isVerified: true }, { where: { id: company.userId } });
        } else {
            company.isApproved = false;
            company.verified = false;
        }

        await company.save();

        await createNotification(
            company.userId,
            'company',
            `Your company verification status has been updated to: ${verificationStatus}`,
            'verification'
        );

        res.json(company);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({ order: [['createdAt', 'DESC']] });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user status (block/verify)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
export const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, isVerified } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (isActive !== undefined) user.isActive = isActive;
        if (isVerified !== undefined) user.isVerified = isVerified;
        await user.save();

        res.json(user);
    } catch (error) {
        console.error('Update User Status Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all internships
// @route   GET /api/admin/internships
// @access  Private/Admin
export const getAllInternships = async (req, res) => {
    try {
        const internships = await Internship.findAll({
            include: [{ model: Company, attributes: ['companyName'] }],
            order: [['createdAt', 'DESC']],
        });
        res.json(internships);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update internship status
// @route   PUT /api/admin/internships/:id/status
// @access  Private/Admin
export const updateInternshipStatus = async (req, res) => {
    try {
        const internship = await Internship.findByPk(req.params.id);
        if (!internship) return res.status(404).json({ message: 'Internship not found' });

        internship.status = req.body.status;
        await internship.save();
        res.json(internship);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete internship
// @route   DELETE /api/admin/internships/:id
// @access  Private/Admin
export const deleteInternship = async (req, res) => {
    try {
        await Internship.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Internship deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Private/Admin
export const getAnalytics = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalStudents = await Student.count();
        const totalCompanies = await Company.count();
        const totalInternships = await Internship.count();
        const totalApplications = await Application.count();

        const appStatsRaw = await Application.findAll({
            attributes: ['status', [fn('COUNT', col('status')), 'value']],
            group: ['status'],
            raw: true,
        });
        const appStats = appStatsRaw.map((r) => ({ name: r.status, value: Number(r.value) }));

        const internStatsRaw = await Internship.findAll({
            attributes: ['status', [fn('COUNT', col('status')), 'value']],
            group: ['status'],
            raw: true,
        });
        const internStats = internStatsRaw.map((r) => ({ name: r.status, value: Number(r.value) }));

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyRaw = await User.findAll({
            attributes: [
                [fn('YEAR', col('createdAt')), 'year'],
                [fn('MONTH', col('createdAt')), 'month'],
                [fn('COUNT', col('id')), 'users'],
            ],
            where: { createdAt: { [Op.gte]: sixMonthsAgo } },
            group: [literal('year'), literal('month')],
            order: [[literal('year'), 'ASC'], [literal('month'), 'ASC']],
            raw: true,
        });

        const monthlyRegistrations = monthlyRaw.map((d) => ({
            name: new Date(d.year, d.month - 1).toLocaleString('default', { month: 'short' }),
            users: Number(d.users),
        }));

        res.json({
            totalUsers,
            totalStudents,
            totalCompanies,
            totalInternships,
            totalApplications,
            appStats,
            internStats,
            monthlyRegistrations,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
