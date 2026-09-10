import { Student, User, Internship, Application, Company } from '../models/associations.js';
import { createNotification } from '../utils/notificationHelper.js';

// @desc    Update student profile
// @route   PUT /api/students/profile
// @access  Private/Student
export const updateStudentProfile = async (req, res) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        if (req.body.university) student.university = req.body.university;
        if (req.body.program) student.program = req.body.program;
        if (req.body.enrollmentNumber) student.enrollmentNumber = req.body.enrollmentNumber;
        if (req.body.semester) student.semester = req.body.semester;
        if (req.body.skills) student.skills = req.body.skills;
        if (req.body.experience) student.experience = req.body.experience;
        if (req.body.education) student.education = req.body.education;
        if (req.body.resume) student.resume = req.body.resume;

        await student.save();

        const user = await User.findByPk(req.user.id);
        if (req.body.name) user.name = req.body.name;
        if (req.body.profilePic) user.profilePic = req.body.profilePic;
        await user.save();

        res.json({
            ...student.toJSON(),
            name: user.name,
            email: user.email,
            profilePic: user.profilePic,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Apply for an internship
// @route   POST /api/students/apply/:internshipId
// @access  Private/Student
export const applyForInternship = async (req, res) => {
    try {
        const internship = await Internship.findByPk(req.params.internshipId, {
            include: [{ model: Company }],
        });
        if (!internship) return res.status(404).json({ message: 'Internship not found' });

        if (internship.lastDateToApply && new Date() > new Date(internship.lastDateToApply)) {
            return res.status(400).json({ message: 'Application deadline has passed' });
        }

        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return res.status(404).json({ message: 'Student profile not found. Please complete your profile first.' });

        const alreadyApplied = await Application.findOne({
            where: { studentId: student.id, internshipId: internship.id },
        });

        if (alreadyApplied) {
            return res.status(400).json({ message: 'You have already applied for this internship' });
        }

        const { name, email, location, qualification, resume, coverLetter } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: 'Application validation failed: name and email are required.',
            });
        }

        const application = await Application.create({
            studentId: student.id,
            internshipId: internship.id,
            companyId: internship.Company.id,
            name: String(name).trim(),
            email: String(email).trim(),
            location: location ? String(location).trim() : '',
            qualification: qualification ? String(qualification).trim() : '',
            resume: resume || student.resume || '',
            coverLetter: coverLetter || '',
        });

        await createNotification(
            internship.Company.userId,
            'company',
            `New application received for "${internship.title}"`,
            'application'
        );

        await createNotification(
            req.user.id,
            'student',
            `Successfully applied for "${internship.title}"`,
            'application'
        );

        res.status(201).json(application);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get student applications
// @route   GET /api/students/applications
// @access  Private/Student
export const getMyApplications = async (req, res) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return res.json([]);

        const applications = await Application.findAll({
            where: { studentId: student.id },
            include: [{
                model: Internship,
                include: [{ model: Company, attributes: ['companyName', 'logo'] }],
            }],
            order: [['createdAt', 'DESC']],
        });
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
